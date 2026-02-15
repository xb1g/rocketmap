import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  SEGMENTS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const canvasIntId = await verifyCanvasOwnership(canvasId, user.$id);

    const result = await serverDatabases.listDocuments(
      DATABASE_ID,
      SEGMENTS_COLLECTION_ID,
      [
        Query.equal('canvasId', canvasIntId),
        Query.orderDesc('priorityScore'),
        Query.limit(100),
      ],
    );

    return NextResponse.json({ segments: result.documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('List segments error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const canvasIntId = await verifyCanvasOwnership(canvasId, user.$id);
    const body = await request.json();

    const { name, description, earlyAdopterFlag, priorityScore, demographics, psychographics, behavioral, geographic, estimatedSize, colorHex } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Assign a color from palette if not provided
    const SEGMENT_COLORS = [
      '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
    ];
    let assignedColor = colorHex;
    if (!assignedColor) {
      const existingSegments = await serverDatabases.listDocuments(
        DATABASE_ID,
        SEGMENTS_COLLECTION_ID,
        [Query.equal('canvasId', canvasIntId), Query.limit(100)],
      );
      assignedColor = SEGMENT_COLORS[existingSegments.total % SEGMENT_COLORS.length];
    }

    const doc = await serverDatabases.createDocument(
      DATABASE_ID,
      SEGMENTS_COLLECTION_ID,
      ID.unique(),
      {
        id: Math.floor(Math.random() * 2_000_000_000),
        canvasId: canvasIntId,
        name,
        description: description ?? '',
        earlyAdopterFlag: earlyAdopterFlag ?? false,
        priorityScore: priorityScore ?? 50,
        demographics: demographics ?? '',
        psychographics: psychographics ?? '',
        behavioral: behavioral ?? '',
        geographic: geographic ?? '',
        estimatedSize: estimatedSize ?? '',
        colorHex: assignedColor,
      },
    );

    return NextResponse.json({ segment: doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('Create segment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
