import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  CARDS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

/** GET /api/canvas/[canvasId]/cards — list all cards for a canvas */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;

    // Verify canvas ownership
    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );
    if (canvas.ownerId !== user.$id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canvasIntId = canvas.id as number;
    const result = await serverDatabases.listDocuments(
      DATABASE_ID,
      CARDS_COLLECTION_ID,
      [
        Query.equal('canvasId', canvasIntId),
        Query.orderAsc('blockId'),
        Query.orderAsc('order'),
        Query.limit(500),
      ],
    );

    return NextResponse.json({ cards: result.documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    console.error('List cards error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
