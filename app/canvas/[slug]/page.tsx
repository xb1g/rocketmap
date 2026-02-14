import { redirect } from 'next/navigation';
import { Query } from 'node-appwrite';
import { getSessionUser } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from '@/lib/appwrite';
import type { BlockData, BlockType, BlockContent, CanvasData, AIAnalysis } from '@/lib/types/canvas';
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

  // Build initial blocks with defaults for missing ones
  const blockMap = new Map(blockDocs.map((d) => [d.blockType as string, d]));
  const initialBlocks: BlockData[] = BLOCK_DEFINITIONS.map((def) => {
    const doc = blockMap.get(def.type);
    return {
      blockType: def.type as BlockType,
      content: parseContentJson(doc?.contentJson as string | undefined),
      state: 'calm' as const,
      aiAnalysis: parseAiAnalysis(doc?.aiAnalysisJson as string | undefined),
      confidenceScore: (doc?.confidenceScore as number) ?? 0,
      riskScore: (doc?.riskScore as number) ?? 0,
    };
  });

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
    <CanvasClient
      canvasId={canvas.$id}
      initialCanvasData={canvasData}
      initialBlocks={initialBlocks}
    />
  );
}
