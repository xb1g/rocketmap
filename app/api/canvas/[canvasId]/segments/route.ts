import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
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
  params: Promise<{ canvasId: string }>;
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
  return canvasId;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: SEGMENTS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.orderDesc('priorityScore'),
        Query.select([
          '$id', '$createdAt', '$updatedAt',
          'name', 'description', 'earlyAdopterFlag', 'priorityScore',
          'demographics', 'psychographics', 'behavioral', 'geographic',
          'estimatedSize', 'colorHex',
        ]),
        Query.limit(100),
      ],
    });

    return NextResponse.json({ segments: result.rows });
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
    await verifyCanvasOwnership(canvasId, user.$id);
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
      const existingSegments = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: SEGMENTS_TABLE_ID,
        queries: [
          Query.equal('canvas', canvasId),
          Query.select(['$id']),
          Query.limit(100),
        ],
      });
      assignedColor = SEGMENT_COLORS[existingSegments.total % SEGMENT_COLORS.length];
    }

    const doc = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: SEGMENTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        canvas: canvasId,
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
    });

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
