import { NextRequest, NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import { verifyCanvasOwnership, isForbiddenError } from '@/lib/utils';
import type { Assumption } from '@/lib/types/canvas';
import { parseAssumptionRow } from '@/lib/utils/assumptions';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.limit(200),
      ],
    });

    const assumptions = result.rows.map(parseAssumptionRow);
    return NextResponse.json(assumptions);
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error fetching assumptions:', error);
    return NextResponse.json({ error: 'Failed to fetch assumptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    const body = await request.json();

    const { statement, riskLevel, category, blockTypes, segmentIds, source } = body;
    if (!statement || !riskLevel) {
      return NextResponse.json({ error: 'Missing required fields: statement, riskLevel' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Resolve block type strings to block $ids for M:M relationship
    let blockIds: string[] = [];
    if (Array.isArray(blockTypes) && blockTypes.length > 0) {
      const blocksResult = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'blocks',
        queries: [
          Query.equal('canvas', canvasId),
          Query.select(['$id', 'blockType']),
          Query.limit(100),
        ],
      });
      const blockIdMap = new Map<string, string>();
      for (const doc of blocksResult.rows) {
        blockIdMap.set(doc.blockType as string, doc.$id as string);
      }
      blockIds = blockTypes.map((bt: string) => blockIdMap.get(bt)).filter((id): id is string => !!id);
    }

    // Map severityScore from riskLevel for backward compat
    const severityScore = riskLevel === 'high' ? 8 : riskLevel === 'medium' ? 5 : 2;

    const row = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        canvas: canvasId,
        assumptionText: statement,
        category: category ?? 'product',
        status: 'untested',
        riskLevel,
        severityScore,
        confidenceScore: 0,
        source: source ?? 'user',
        segmentIds: JSON.stringify(segmentIds ?? []),
        linkedValidationItemIds: JSON.stringify([]),
        suggestedExperiment: null,
        suggestedExperimentDuration: null,
        createdAt: now,
        updatedAt: now,
        lastTestedAt: null,
        ...(blockIds.length > 0 ? { blocks: blockIds } : {}),
      },
    });

    return NextResponse.json(parseAssumptionRow(row as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error creating assumption:', error);
    return NextResponse.json({ error: 'Failed to create assumption' }, { status: 500 });
  }
}
