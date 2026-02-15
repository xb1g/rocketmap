import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
  BLOCK_SEGMENTS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; blockType: string }>;
}

async function verifyCanvasAndGetBlockId(
  canvasId: string,
  blockType: string,
  userId: string,
) {
  const canvas = await serverDatabases.getDocument(
    DATABASE_ID,
    CANVASES_COLLECTION_ID,
    canvasId,
  );
  if (canvas.ownerId !== userId) {
    throw new Error('Forbidden');
  }

  const canvasIntId = canvas.id as number;
  const blockResult = await serverDatabases.listDocuments(
    DATABASE_ID,
    BLOCKS_COLLECTION_ID,
    [
      Query.equal('canvasId', canvasIntId),
      Query.equal('blockType', blockType),
      Query.limit(1),
    ],
  );

  if (blockResult.documents.length === 0) {
    throw new Error('Block not found');
  }

  return blockResult.documents[0].id as number;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;
    const blockId = await verifyCanvasAndGetBlockId(canvasId, blockType, user.$id);
    const body = await request.json();
    const { segmentId } = body;

    if (!segmentId || typeof segmentId !== 'number') {
      return NextResponse.json({ error: 'segmentId (number) is required' }, { status: 400 });
    }

    // Idempotent: check if link already exists
    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      [
        Query.equal('blockId', blockId),
        Query.equal('segmentId', segmentId),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      return NextResponse.json({ link: existing.documents[0] });
    }

    const doc = await serverDatabases.createDocument(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      ID.unique(),
      { id: Math.floor(Math.random() * 2_000_000_000), blockId, segmentId },
    );

    return NextResponse.json({ link: doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Block not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Link segment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;
    const blockId = await verifyCanvasAndGetBlockId(canvasId, blockType, user.$id);
    const { searchParams } = new URL(request.url);
    const segmentId = parseInt(searchParams.get('segmentId') ?? '', 10);

    if (!segmentId) {
      return NextResponse.json({ error: 'segmentId query param required' }, { status: 400 });
    }

    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      [
        Query.equal('blockId', blockId),
        Query.equal('segmentId', segmentId),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      await serverDatabases.deleteDocument(
        DATABASE_ID,
        BLOCK_SEGMENTS_COLLECTION_ID,
        existing.documents[0].$id,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Block not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Unlink segment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
