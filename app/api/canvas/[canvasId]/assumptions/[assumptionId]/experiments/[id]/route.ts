import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string; id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId, id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.result !== undefined) updates.result = body.result;
    if (body.evidence !== undefined) updates.evidence = body.evidence;
    if (body.sourceUrl !== undefined) updates.sourceUrl = body.sourceUrl;

    // If marking as completed, auto-update assumption status
    if (body.status === 'completed') {
      updates.completedAt = new Date().toISOString();

      if (body.result) {
        const assumptionUpdates: Record<string, unknown> = {
          lastTestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (body.result === 'supports') assumptionUpdates.status = 'validated';
        else if (body.result === 'contradicts') assumptionUpdates.status = 'refuted';
        else assumptionUpdates.status = 'inconclusive';

        await serverTablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: ASSUMPTIONS_TABLE_ID,
          rowId: assumptionId,
          data: assumptionUpdates,
        });
      }
    }

    const experiment = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: id,
      data: updates,
    });

    return NextResponse.json(experiment);
  } catch (error) {
    console.error('Error updating experiment:', error);
    return NextResponse.json({ error: 'Failed to update experiment' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
}
