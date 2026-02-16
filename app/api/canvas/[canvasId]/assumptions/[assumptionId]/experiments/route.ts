import { NextRequest, NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId } = await context.params;

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      queries: [Query.equal('assumption', assumptionId)],
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId } = await context.params;
    const body = await request.json();

    const { type, description, successCriteria, costEstimate, durationEstimate } = body;
    if (!type || !description || !successCriteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const experiment = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
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
      },
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
    console.error('Error creating experiment:', error);
    return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
  }
}
