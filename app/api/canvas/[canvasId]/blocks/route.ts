import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const body = await request.json();
    const { blockType, contentJson } = body;

    if (!blockType || typeof blockType !== 'string') {
      return NextResponse.json({ error: 'blockType is required' }, { status: 400 });
    }

    // Fetch canvas to verify ownership and get integer id
    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );

    if (canvas.ownerId !== user.$id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canvasIntId = canvas.id as number;

    // Find existing block doc
    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [
        Query.equal('canvasId', canvasIntId),
        Query.equal('blockType', blockType),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      await serverDatabases.updateDocument(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        existing.documents[0].$id,
        { contentJson: contentJson ?? '' },
      );
    } else {
      await serverDatabases.createDocument(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        ID.unique(),
        {
          id: Date.now(),
          canvasId: canvasIntId,
          blockType,
          contentJson: contentJson ?? '',
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block upsert error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
