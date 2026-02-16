import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  BLOCKS_COLLECTION_ID,
  CANVASES_COLLECTION_ID,
  BLOCK_SEGMENTS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ blockId: string }>;
}

/**
 * POST /api/blocks/[blockId]/segments
 * Toggle segment relationship for a block
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { blockId } = await context.params;
    const body = await request.json();
    const { segmentId } = body;

    if (!segmentId || typeof segmentId !== 'number') {
      return NextResponse.json({ error: 'segmentId (number) is required' }, { status: 400 });
    }

    // Fetch block to verify ownership and get integer id
    const block = await serverDatabases.getDocument(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      blockId,
    );

    // Fetch canvas to verify ownership
    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      String(block.canvasId),
    );

    if (canvas.ownerId !== user.$id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const blockIntId = block.id as number;

    // Check if link already exists
    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      [
        Query.equal('blockId', blockIntId),
        Query.equal('segmentId', segmentId),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      // Link exists, remove it (toggle off)
      await serverDatabases.deleteDocument(
        DATABASE_ID,
        BLOCK_SEGMENTS_COLLECTION_ID,
        existing.documents[0].$id,
      );
      return NextResponse.json({ success: true, action: 'unlinked' });
    } else {
      // Link doesn't exist, create it (toggle on)
      await serverDatabases.createDocument(
        DATABASE_ID,
        BLOCK_SEGMENTS_COLLECTION_ID,
        ID.unique(),
        {
          id: Date.now(),
          blockId: blockIntId,
          segmentId,
          relationshipType: 'linked',
        },
      );
      return NextResponse.json({ success: true, action: 'linked' });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block segment toggle error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
