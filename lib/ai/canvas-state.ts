import { Query } from 'node-appwrite';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
  SEGMENTS_TABLE_ID,
} from '@/lib/appwrite';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import type { BlockData, BlockType, BlockContent, BlockItem, MarketResearchData, Segment } from '@/lib/types/canvas';

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
  // Verify canvas exists and belongs to this user
  // Use listRows with both filters — avoids unreliable relationship auto-loading
  const canvasCheck = await serverTablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    queries: [
      Query.equal('$id', canvasId),
      Query.select(['$id']),
      Query.limit(1),
    ],
  });
  if (canvasCheck.rows.length === 0) {
    throw new Error('Canvas not found');
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
        Query.limit(100),
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

  // Group blocks by blockType (multiple rows per type in atomic schema)
  const blocksByType = new Map<string, Array<Record<string, unknown>>>();
  for (const doc of result.rows) {
    const type = doc.blockType as string;
    if (!blocksByType.has(type)) blocksByType.set(type, []);
    blocksByType.get(type)!.push(doc);
  }

  function resolveSegmentIds(doc: Record<string, unknown>): string[] {
    if (!doc.segments || !Array.isArray(doc.segments)) return [];
    return (doc.segments as Array<string | { $id: string }>)
      .map((s) => typeof s === 'string' ? s : s.$id)
      .filter((id): id is string => Boolean(id) && segmentMap.has(id));
  }

  function resolveLinkedSegments(doc: Record<string, unknown>): Segment[] {
    return resolveSegmentIds(doc)
      .map((id) => segmentMap.get(id))
      .filter((s): s is Segment => s !== undefined);
  }

  return BLOCK_DEFINITIONS.map((def) => {
    const docsForType = blocksByType.get(def.type) || [];

    if (docsForType.length === 0) {
      return {
        blockType: def.type as BlockType,
        content: { bmc: '', lean: '', items: [] },
        state: 'calm' as const,
        aiAnalysis: null,
        confidenceScore: 0,
        riskScore: 0,
        deepDiveData: null,
        linkedSegments: [],
      };
    }

    // Use first block as main content
    const mainDoc = docsForType[0];
    const content = parseContentJson(mainDoc?.contentJson as string | undefined);

    // Convert remaining blocks to items (matches page.tsx pattern)
    if (docsForType.length > 1) {
      const extraItems: BlockItem[] = docsForType.slice(1).map((doc, idx) => {
        const extraContent = parseContentJson(doc.contentJson as string | undefined);
        const name = extraContent.bmc || extraContent.lean || `Item ${idx + 1}`;
        return {
          id: doc.$id as string,
          name,
          linkedSegmentIds: resolveSegmentIds(doc),
          tags: [],
          linkedItemIds: [],
          createdAt: (doc.$createdAt as string) || new Date().toISOString(),
        };
      });
      content.items = [...(content.items || []), ...extraItems];
    }

    let deepDiveData: MarketResearchData | null = null;
    if (mainDoc?.deepDiveJson) {
      try {
        deepDiveData = JSON.parse(mainDoc.deepDiveJson as string) as MarketResearchData;
      } catch { /* ignore parse errors */ }
    }

    return {
      blockType: def.type as BlockType,
      content,
      state: 'calm' as const,
      aiAnalysis: null,
      confidenceScore: (mainDoc?.confidenceScore as number) ?? 0,
      riskScore: (mainDoc?.riskScore as number) ?? 0,
      deepDiveData,
      linkedSegments: resolveLinkedSegments(mainDoc),
    };
  });
}
