import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import { verifyCanvasOwnership, verifyAssumptionBelongsToCanvas, isForbiddenError } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string }>;
}

const DECISION_SIGNALS = new Set([
  'kill',
  'pivot',
  'double_down',
  'insufficient_evidence',
]);

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId: id } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    await verifyAssumptionBelongsToCanvas(canvasId, id);

    const row = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json(row);
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error fetching assumption:', error);
    return NextResponse.json({ error: 'Assumption not found' }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId: id } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    await verifyAssumptionBelongsToCanvas(canvasId, id);
    const body = await request.json();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.statement !== undefined) updates.assumptionText = body.statement;
    if (body.status !== undefined) updates.status = body.status;
    if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel;
    if (body.confidenceScore !== undefined) updates.confidenceScore = body.confidenceScore;
    if (body.suggestedExperiment !== undefined) updates.suggestedExperiment = body.suggestedExperiment;
    if (body.suggestedExperimentDuration !== undefined) updates.suggestedExperimentDuration = body.suggestedExperimentDuration;
    if (body.decisionSignal !== undefined) {
      if (!DECISION_SIGNALS.has(body.decisionSignal)) {
        return NextResponse.json({ error: 'Invalid decision signal' }, { status: 400 });
      }
      updates.decisionSignal = body.decisionSignal;
    }
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
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error updating assumption:', error);
    return NextResponse.json({ error: 'Failed to update assumption' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId: id } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    await verifyAssumptionBelongsToCanvas(canvasId, id);

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error deleting assumption:', error);
    return NextResponse.json({ error: 'Failed to delete assumption' }, { status: 500 });
  }
}
