import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
} from '@/lib/appwrite';
import { getUserIdFromCanvas } from '@/lib/utils';
import type { CanvasData } from '@/lib/types/canvas';

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

    // Fetch canvas to verify ownership
    // Index: none needed (primary key lookup)
    const canvas = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      queries: [],
    }) as unknown as CanvasData;

    if (getUserIdFromCanvas(canvas) !== user.$id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find existing block doc — only need $id for upsert decision
    // Index required: composite [canvas, blockType]
    const existing = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.equal('blockType', blockType),
        Query.select(['$id']),
        Query.limit(1),
      ],
    });

    if (existing.rows.length > 0) {
      await serverTablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: BLOCKS_TABLE_ID,
        rowId: existing.rows[0].$id,
        data: { contentJson: contentJson ?? '' },
      });
    } else {
      await serverTablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: BLOCKS_TABLE_ID,
        rowId: ID.unique(),
        data: {
          canvas: canvasId,
          blockType,
          contentJson: contentJson ?? '',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block upsert error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
