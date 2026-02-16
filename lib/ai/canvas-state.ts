import { Query } from 'node-appwrite';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
  SEGMENTS_TABLE_ID,
} from '@/lib/appwrite';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import type { BlockData, BlockType, BlockContent, MarketResearchData, Segment, CanvasData } from '@/lib/types/canvas';
import { getUserIdFromCanvas } from '@/lib/utils';

function parseContentJson(raw: string | undefined): BlockContent {
  if (!raw) return { bmc: '', lean: '', items: [] };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      const atomicText = typeof record.text === 'string' ? record.text : '';
      const bmc = typeof record.bmc === 'string' ? record.bmc : '';
      const lean = typeof record.lean === 'string' ? record.lean : '';
      const items = Array.isArray(record.items) ? record.items as BlockContent['items'] : [];
      return {
        bmc: bmc || atomicText,
        lean: lean || atomicText,
        items,
      };
    }
    return { bmc: '', lean: '', items: [] };
  } catch {
    return { bmc: raw, lean: '', items: [] };
  }
}

export async function getCanvasBlocks(canvasId: string, userId: string): Promise<BlockData[]> {
  // Fetch canvas for ownership check
  // Note: "users" relationship is auto-loaded (can't be in Query.select)
  const canvas = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    rowId: canvasId,
    queries: [Query.select(['$id'])],
  }) as unknown as CanvasData;

  if (getUserIdFromCanvas(canvas) !== userId) {
    throw new Error('Forbidden');
  }

  // Index required: blocks collection — composite [canvas] key index
  // Index required: segments collection — composite [canvas] key index
  // Note: "segments" relationship is auto-loaded (can't be in Query.select)
  const [result, segResult] = await Promise.all([
    serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.select(['$id', 'blockType', 'contentJson', 'confidenceScore', 'riskScore', 'deepDiveJson']),
        Query.limit(25),
      ],
    }),
    serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: SEGMENTS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.select(['$id', 'name', 'description', 'earlyAdopterFlag', 'priorityScore', 'demographics', 'psychographics', 'behavioral', 'geographic', 'estimatedSize']),
        Query.limit(100),
      ],
    }).catch(() => ({ rows: [] })),
  ]);

  // Build segment map
  const segmentMap = new Map<string, Segment>();
  for (const doc of segResult.rows) {
    segmentMap.set(doc.$id, {
      $id: doc.$id,
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

  const blockMap = new Map(
    result.rows.map((d) => [d.blockType as string, d]),
  );

  return BLOCK_DEFINITIONS.map((def) => {
    const doc = blockMap.get(def.type);
    let deepDiveData: MarketResearchData | null = null;
    if (doc?.deepDiveJson) {
      try {
        deepDiveData = JSON.parse(doc.deepDiveJson as string) as MarketResearchData;
      } catch { /* ignore parse errors */ }
    }

    // Get linked segments from the block's segments relationship
    const linkedSegments: Segment[] = [];
    if (doc?.segments && Array.isArray(doc.segments)) {
      for (const seg of doc.segments) {
        const segId = typeof seg === 'string' ? seg : seg.$id;
        const segment = segmentMap.get(segId);
        if (segment) {
          linkedSegments.push(segment);
        }
      }
    }

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
