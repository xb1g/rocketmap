import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  SEGMENTS_COLLECTION_ID,
  BLOCK_SEGMENTS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; segmentId: string }>;
}

async function verifyCanvasOwnership(canvasId: string, userId: string) {
  const canvas = await serverDatabases.getDocument(
    DATABASE_ID,
    CANVASES_COLLECTION_ID,
    canvasId,
  );
  if (canvas.ownerId !== userId) {
    throw new Error('Forbidden');
  }
  return canvas.id as number;
}

async function findSegmentDoc(segmentId: string, canvasIntId: number) {
  const result = await serverDatabases.listDocuments(
    DATABASE_ID,
    SEGMENTS_COLLECTION_ID,
    [
      Query.equal('id', parseInt(segmentId, 10)),
      Query.equal('canvasId', canvasIntId),
      Query.limit(1),
    ],
  );
  if (result.documents.length === 0) {
    throw new Error('Not found');
  }
  return result.documents[0];
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, segmentId } = await context.params;
    const canvasIntId = await verifyCanvasOwnership(canvasId, user.$id);
    const doc = await findSegmentDoc(segmentId, canvasIntId);
    const body = await request.json();

    const allowedFields = [
      'name', 'description', 'earlyAdopterFlag', 'priorityScore',
      'demographics', 'psychographics', 'behavioral', 'geographic', 'estimatedSize',
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const updated = await serverDatabases.updateDocument(
      DATABASE_ID,
      SEGMENTS_COLLECTION_ID,
      doc.$id,
      updates,
    );

    return NextResponse.json({ segment: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Update segment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, segmentId } = await context.params;
    const canvasIntId = await verifyCanvasOwnership(canvasId, user.$id);
    const doc = await findSegmentDoc(segmentId, canvasIntId);
    const segmentIntId = doc.id as number;

    // Cascade delete all block_segments links
    const links = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCK_SEGMENTS_COLLECTION_ID,
      [Query.equal('segmentId', segmentIntId), Query.limit(100)],
    );
    await Promise.all(
      links.documents.map((link) =>
        serverDatabases.deleteDocument(DATABASE_ID, BLOCK_SEGMENTS_COLLECTION_ID, link.$id),
      ),
    );

    // Delete the segment
    await serverDatabases.deleteDocument(DATABASE_ID, SEGMENTS_COLLECTION_ID, doc.$id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Delete segment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
