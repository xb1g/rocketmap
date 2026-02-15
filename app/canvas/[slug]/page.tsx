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
} from '@/lib/appwrite';
import type { BlockData, BlockType, BlockContent, CanvasData, AIAnalysis, MarketResearchData, Segment } from '@/lib/types/canvas';
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

  // Fetch segments and block_segment links
  let segmentDocs: Record<string, unknown>[] = [];
  let linkDocs: Record<string, unknown>[] = [];
  try {
    const [segResult, linkResult] = await Promise.all([
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
    ]);
    segmentDocs = segResult.documents as unknown as Record<string, unknown>[];
    linkDocs = linkResult.documents as unknown as Record<string, unknown>[];
  } catch {
    // segments collections may not exist yet
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

  // Build initial blocks with defaults for missing ones
  const blockMap = new Map(blockDocs.map((d) => [d.blockType as string, d]));
  const initialBlocks: BlockData[] = BLOCK_DEFINITIONS.map((def) => {
    const doc = blockMap.get(def.type);
    const blockIntId = doc?.id as number | undefined;
    const linkedSegmentIds = blockIntId ? (blockSegmentLinks.get(blockIntId) ?? []) : [];
    const linkedSegments = linkedSegmentIds
      .map((sid) => segmentMap.get(sid))
      .filter((s): s is Segment => !!s);

    return {
      blockType: def.type as BlockType,
      content: parseContentJson(doc?.contentJson as string | undefined),
      state: 'calm' as const,
      aiAnalysis: parseAiAnalysis(doc?.aiAnalysisJson as string | undefined),
      confidenceScore: (doc?.confidenceScore as number) ?? 0,
      riskScore: (doc?.riskScore as number) ?? 0,
      deepDiveData: parseDeepDiveJson(doc?.deepDiveJson as string | undefined),
      linkedSegments,
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
      />
    </div>
  );
}
