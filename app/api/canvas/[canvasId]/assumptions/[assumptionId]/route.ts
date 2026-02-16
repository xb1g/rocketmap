import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId: id } = await context.params;

    const row = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error('Error fetching assumption:', error);
    return NextResponse.json({ error: 'Assumption not found' }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId: id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.statement !== undefined) updates.assumptionText = body.statement;
    if (body.status !== undefined) updates.status = body.status;
    if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel;
    if (body.confidenceScore !== undefined) updates.confidenceScore = body.confidenceScore;
    if (body.suggestedExperiment !== undefined) updates.suggestedExperiment = body.suggestedExperiment;
    if (body.suggestedExperimentDuration !== undefined) updates.suggestedExperimentDuration = body.suggestedExperimentDuration;
    if (body.lastTestedAt !== undefined) updates.lastTestedAt = body.lastTestedAt;
    if (body.segmentIds !== undefined) updates.segmentIds = JSON.stringify(body.segmentIds);

    const row = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
      data: updates,
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error('Error updating assumption:', error);
    return NextResponse.json({ error: 'Failed to update assumption' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId: id } = await context.params;

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assumption:', error);
    return NextResponse.json({ error: 'Failed to delete assumption' }, { status: 500 });
  }
}
