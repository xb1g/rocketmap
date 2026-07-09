import { NextRequest, NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import { verifyCanvasOwnership, verifyAssumptionBelongsToCanvas, isForbiddenError } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    await verifyAssumptionBelongsToCanvas(canvasId, assumptionId);

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      queries: [Query.equal('assumption', assumptionId)],
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error fetching experiments:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    await verifyAssumptionBelongsToCanvas(canvasId, assumptionId);
    const body = await request.json();

    const { type, description, successCriteria, successThreshold, costEstimate, durationEstimate } = body;
    if (!type || !description || !successCriteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const experimentData: Record<string, unknown> = {
      assumption: assumptionId,
      type,
      description,
      successCriteria,
      status: 'planned',
      result: null,
      evidence: '',
      sourceUrl: null,
      costEstimate: costEstimate ? String(costEstimate).slice(0, 50) : null,
      durationEstimate: durationEstimate ? String(durationEstimate).slice(0, 50) : null,
      createdAt: now,
      completedAt: null,
    };
    if (successThreshold) {
      experimentData.successThreshold = String(successThreshold).slice(0, 500);
    }

    const experiment = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: ID.unique(),
      data: experimentData,
    });

    // Update assumption status to 'testing'
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: assumptionId,
      data: { status: 'testing' },
    });

    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error creating experiment:', error);
    return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
  }
}
