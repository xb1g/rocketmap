import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
  CARDS_COLLECTION_ID,
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

  return { blockId: blockResult.documents[0].id as number, canvasIntId };
}

/** POST /api/canvas/[canvasId]/blocks/[blockType]/cards — create a card */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;
    const { blockId, canvasIntId } = await verifyCanvasAndGetBlockId(canvasId, blockType, user.$id);
    const body = await request.json();
    const { name, description = '', order } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name (string) is required' }, { status: 400 });
    }

    // If no order provided, put it at the end
    let cardOrder = order;
    if (typeof cardOrder !== 'number') {
      const existing = await serverDatabases.listDocuments(
        DATABASE_ID,
        CARDS_COLLECTION_ID,
        [
          Query.equal('blockId', blockId),
          Query.orderDesc('order'),
          Query.limit(1),
        ],
      );
      cardOrder = existing.documents.length > 0
        ? (existing.documents[0].order as number) + 1
        : 0;
    }

    const cardId = `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const doc = await serverDatabases.createDocument(
      DATABASE_ID,
      CARDS_COLLECTION_ID,
      ID.unique(),
      {
        id: cardId,
        blockId,
        canvasId: canvasIntId,
        name: name.trim(),
        description: description.trim(),
        order: cardOrder,
        createdAt: new Date().toISOString(),
      },
    );

    return NextResponse.json({ card: doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Block not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Create card error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
