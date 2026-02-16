import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  SEGMENTS_TABLE_ID,
} from '@/lib/appwrite';
import { getUserIdFromCanvas } from '@/lib/utils';
import type { CanvasData } from '@/lib/types/canvas';

interface RouteContext {
  params: Promise<{ canvasId: string; segmentId: string }>;
}

async function verifyCanvasOwnership(canvasId: string, userId: string) {
  const canvas = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    rowId: canvasId,
  }) as unknown as CanvasData;
  if (getUserIdFromCanvas(canvas) !== userId) {
    throw new Error('Forbidden');
  }
}

async function findSegmentDoc(segmentId: string, canvasId: string) {
  const segment = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: SEGMENTS_TABLE_ID,
    rowId: segmentId,
  });

  // Verify segment belongs to this canvas
  if (segment.canvas !== canvasId && (segment.canvas as any)?.$id !== canvasId) {
    throw new Error('Not found');
  }

  return segment;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, segmentId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    const doc = await findSegmentDoc(segmentId, canvasId);
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

    const updated = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: SEGMENTS_TABLE_ID,
      rowId: doc.$id,
      data: updates,
    });

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
    await verifyCanvasOwnership(canvasId, user.$id);
    const doc = await findSegmentDoc(segmentId, canvasId);

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: SEGMENTS_TABLE_ID,
      rowId: doc.$id,
    });

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
