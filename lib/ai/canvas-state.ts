import { Query } from 'node-appwrite';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from '@/lib/appwrite';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import type { BlockData, BlockType, BlockContent, MarketResearchData } from '@/lib/types/canvas';

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
  const result = await serverDatabases.listDocuments(
    DATABASE_ID,
    BLOCKS_COLLECTION_ID,
    [Query.equal('canvasId', canvasIntId), Query.limit(25)],
  );

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

    return {
      blockType: def.type as BlockType,
      content: parseContentJson(doc?.contentJson as string | undefined),
      state: 'calm' as const,
      aiAnalysis: null,
      confidenceScore: (doc?.confidenceScore as number) ?? 0,
      riskScore: (doc?.riskScore as number) ?? 0,
      deepDiveData,
    };
  });
}
