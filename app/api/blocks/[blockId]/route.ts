import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
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
 * PATCH /api/blocks/[blockId]
 * Update a single block's content
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { blockId } = await context.params;
    const body = await request.json();
    const { contentJson } = body;

    // Fetch block to verify ownership
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

    // Update block
    await serverDatabases.updateDocument(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      blockId,
      { contentJson: contentJson ?? '' },
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block update error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/blocks/[blockId]
 * Delete a single block
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { blockId } = await context.params;

    // Fetch block to verify ownership
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

    // Delete block_segments links first
    const links = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      [Query.equal('blockId', blockIntId)],
    );

    for (const link of links.documents) {
      await serverDatabases.deleteDocument(
        DATABASE_ID,
        BLOCK_SEGMENTS_COLLECTION_ID,
        link.$id,
      );
    }

    // Delete block
    await serverDatabases.deleteDocument(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      blockId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block delete error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
