import { Query } from 'node-appwrite';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
  SEGMENTS_COLLECTION_ID,
  BLOCK_SEGMENTS_COLLECTION_ID,
} from '@/lib/appwrite';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import type { BlockData, BlockType, BlockContent, MarketResearchData, Segment } from '@/lib/types/canvas';

function parseContentJson(raw: string | undefined): BlockContent {
  if (!raw) return { bmc: '', lean: '' };
  try {
    const parsed = JSON.parse(raw);
    return { bmc: parsed.bmc ?? '', lean: parsed.lean ?? '' };
  } catch {
    return { bmc: raw, lean: '' };
  }
}

export async function getCanvasBlocks(canvasId: string, userId: string): Promise<BlockData[]> {
  const canvas = await serverDatabases.getDocument(
    DATABASE_ID,
    CANVASES_COLLECTION_ID,
    canvasId,
  );

  if (canvas.ownerId !== userId) {
    throw new Error('Forbidden');
  }

  const canvasIntId = canvas.id as number;
  const [result, segResult, linkResult] = await Promise.all([
    serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [Query.equal('canvasId', canvasIntId), Query.limit(25)],
    ),
    serverDatabases.listDocuments(
      DATABASE_ID,
      SEGMENTS_COLLECTION_ID,
      [Query.equal('canvasId', canvasIntId), Query.limit(100)],
    ).catch(() => ({ documents: [] })),
    serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      [Query.limit(500)],
    ).catch(() => ({ documents: [] })),
  ]);

  // Build segment map
  const segmentMap = new Map<number, Segment>();
  for (const doc of segResult.documents) {
    segmentMap.set(doc.id as number, {
      $id: doc.$id,
      id: doc.id as number,
      canvasId: doc.canvasId as number,
      name: doc.name as string,
      description: (doc.description as string) ?? '',
      earlyAdopterFlag: (doc.earlyAdopterFlag as boolean) ?? false,
      priorityScore: (doc.priorityScore as number) ?? 50,
      demographics: (doc.demographics as string) ?? '',
      psychographics: (doc.psychographics as string) ?? '',
      behavioral: (doc.behavioral as string) ?? '',
      geographic: (doc.geographic as string) ?? '',
      estimatedSize: (doc.estimatedSize as string) ?? '',
    });
  }

  // Build block-to-segments mapping
  const blockSegmentLinks = new Map<number, number[]>();
  for (const link of linkResult.documents) {
    const blockId = link.blockId as number;
    const segmentId = link.segmentId as number;
    if (!blockSegmentLinks.has(blockId)) {
      blockSegmentLinks.set(blockId, []);
    }
    blockSegmentLinks.get(blockId)!.push(segmentId);
  }

  const blockMap = new Map(
    result.documents.map((d) => [d.blockType as string, d]),
  );

  return BLOCK_DEFINITIONS.map((def) => {
    const doc = blockMap.get(def.type);
    let deepDiveData: MarketResearchData | null = null;
    if (doc?.deepDiveJson) {
      try {
        deepDiveData = JSON.parse(doc.deepDiveJson as string) as MarketResearchData;
      } catch { /* ignore parse errors */ }
    }

    const blockIntId = doc?.id as number | undefined;
    const linkedSegmentIds = blockIntId ? (blockSegmentLinks.get(blockIntId) ?? []) : [];
    const linkedSegments = linkedSegmentIds
      .map((sid) => segmentMap.get(sid))
      .filter((s): s is Segment => !!s);

    return {
      blockType: def.type as BlockType,
      content: parseContentJson(doc?.contentJson as string | undefined),
      state: 'calm' as const,
      aiAnalysis: null,
      confidenceScore: (doc?.confidenceScore as number) ?? 0,
      riskScore: (doc?.riskScore as number) ?? 0,
      deepDiveData,
      linkedSegments,
    };
  });
}
