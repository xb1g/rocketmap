import { redirect } from 'next/navigation';
import { Query } from 'node-appwrite';
import { getSessionUser } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
  SEGMENTS_COLLECTION_ID,
  BLOCK_SEGMENTS_COLLECTION_ID,
  CARDS_COLLECTION_ID,
} from '@/lib/appwrite';
import type { BlockData, BlockType, BlockContent, CanvasData, AIAnalysis, MarketResearchData, Segment, Card } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import { CanvasClient } from './CanvasClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function parseContentJson(raw: string | undefined): BlockContent {
  if (!raw) return { bmc: '', lean: '' };
  try {
    const parsed = JSON.parse(raw);
    return {
      bmc: parsed.bmc ?? '',
      lean: parsed.lean ?? '',
    };
  } catch {
    return { bmc: raw, lean: '' };
  }
}

function parseAiAnalysis(raw: string | undefined): AIAnalysis | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      draft: parsed.draft ?? '',
      assumptions: parsed.assumptions ?? [],
      risks: parsed.risks ?? [],
      questions: parsed.questions ?? [],
      generatedAt: parsed.generatedAt ?? '',
    };
  } catch {
    return null;
  }
}

function parseDeepDiveJson(raw: string | undefined): MarketResearchData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MarketResearchData;
  } catch {
    return null;
  }
}

export default async function CanvasPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  // Fetch canvas by slug
  let canvas;
  try {
    const result = await serverDatabases.listDocuments(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      [Query.equal('slug', slug), Query.equal('ownerId', user.$id)],
    );
    if (result.documents.length === 0) {
      redirect('/dashboard');
    }
    canvas = result.documents[0];
  } catch {
    redirect('/dashboard');
  }

  // Fetch blocks using the canvas integer id
  const canvasIntId = canvas.id as number;
  let blockDocs: Record<string, unknown>[] = [];
  try {
    const result = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [Query.equal('canvasId', canvasIntId), Query.limit(25)],
    );
    blockDocs = result.documents as unknown as Record<string, unknown>[];
  } catch {
    // blocks collection may not have data yet
  }

  // Fetch segments, block_segment links, and cards
  let segmentDocs: Record<string, unknown>[] = [];
  let linkDocs: Record<string, unknown>[] = [];
  let cardDocs: Record<string, unknown>[] = [];
  try {
    const [segResult, linkResult, cardResult] = await Promise.all([
      serverDatabases.listDocuments(
        DATABASE_ID,
        SEGMENTS_COLLECTION_ID,
        [Query.equal('canvasId', canvasIntId), Query.orderDesc('priorityScore'), Query.limit(100)],
      ),
      serverDatabases.listDocuments(
        DATABASE_ID,
        BLOCK_SEGMENTS_COLLECTION_ID,
        [Query.limit(500)],
      ),
      serverDatabases.listDocuments(
        DATABASE_ID,
        CARDS_COLLECTION_ID,
        [Query.equal('canvasId', canvasIntId), Query.orderAsc('order'), Query.limit(500)],
      ),
    ]);
    segmentDocs = segResult.documents as unknown as Record<string, unknown>[];
    linkDocs = linkResult.documents as unknown as Record<string, unknown>[];
    cardDocs = cardResult.documents as unknown as Record<string, unknown>[];
  } catch {
    // collections may not exist yet
  }

  // Build segment map by integer id
  const segmentMap = new Map<number, Segment>();
  for (const doc of segmentDocs) {
    const seg: Segment = {
      $id: doc.$id as string,
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
    };
    segmentMap.set(seg.id, seg);
  }

  // Build block-to-segments mapping (blockIntId -> segmentIntId[])
  const blockSegmentLinks = new Map<number, number[]>();
  for (const link of linkDocs) {
    const blockId = link.blockId as number;
    const segmentId = link.segmentId as number;
    if (!blockSegmentLinks.has(blockId)) {
      blockSegmentLinks.set(blockId, []);
    }
    blockSegmentLinks.get(blockId)!.push(segmentId);
  }

  // Build blockId -> cards mapping
  const blockCardsMap = new Map<number, Card[]>();
  for (const doc of cardDocs) {
    const card: Card = {
      $id: doc.$id as string,
      id: doc.id as string,
      blockId: doc.blockId as number,
      canvasId: doc.canvasId as number,
      name: doc.name as string,
      description: (doc.description as string) ?? '',
      order: (doc.order as number) ?? 0,
      createdAt: (doc.createdAt as string) ?? '',
    };
    const existing = blockCardsMap.get(card.blockId) ?? [];
    existing.push(card);
    blockCardsMap.set(card.blockId, existing);
  }

  // Build blocks grouped by blockType (supporting multiple blocks per type)
  const blocksByType = new Map<BlockType, BlockData[]>();

  for (const doc of blockDocs) {
    const blockIntId = doc.id as number;
    const blockType = doc.blockType as BlockType;
    const linkedSegmentIds = blockSegmentLinks.get(blockIntId) ?? [];
    const linkedSegments = linkedSegmentIds
      .map((sid) => segmentMap.get(sid))
      .filter((s): s is Segment => !!s);

    const cards = blockCardsMap.get(blockIntId) ?? [];

    const blockData: BlockData = {
      $id: doc.$id as string,
      id: blockIntId,
      blockType,
      content: parseContentJson(doc?.contentJson as string | undefined),
      state: 'calm' as const,
      aiAnalysis: parseAiAnalysis(doc?.aiAnalysisJson as string | undefined),
      confidenceScore: (doc?.confidenceScore as number) ?? 0,
      riskScore: (doc?.riskScore as number) ?? 0,
      deepDiveData: parseDeepDiveJson(doc?.deepDiveJson as string | undefined),
      linkedSegments,
      cards,
    };

    if (!blocksByType.has(blockType)) {
      blocksByType.set(blockType, []);
    }
    blocksByType.get(blockType)!.push(blockData);
  }

  // Create legacy format (single block per type) for backward compatibility
  const initialBlocks: BlockData[] = BLOCK_DEFINITIONS.map((def) => {
    const blocks = blocksByType.get(def.type);
    // Use first block if exists, otherwise create empty placeholder
    if (blocks && blocks.length > 0) {
      return blocks[0];
    }
    return {
      blockType: def.type as BlockType,
      content: { bmc: '', lean: '' },
      state: 'calm' as const,
      aiAnalysis: null,
      confidenceScore: 0,
      riskScore: 0,
      deepDiveData: null,
      linkedSegments: [],
      cards: [],
    };
  });

  const initialSegments = Array.from(segmentMap.values());

  const canvasData: CanvasData = {
    $id: canvas.$id,
    id: canvas.id as number,
    title: canvas.title as string,
    slug: canvas.slug as string,
    description: (canvas.description as string) ?? '',
    isPublic: (canvas.isPublic as boolean) ?? false,
    ownerId: canvas.ownerId as string,
  };

  return (
    <div className="canvas-page-bg text-lg">
      <CanvasClient
        canvasId={canvas.$id}
        initialCanvasData={canvasData}
        initialBlocks={initialBlocks}
        initialSegments={initialSegments}
        initialBlocksByType={blocksByType}
      />
    </div>
  );
}
