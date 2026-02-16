import { NextRequest, NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import type { Assumption, BlockType } from '@/lib/types/canvas';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

/** Parse an Appwrite assumption row into our Assumption interface */
function parseAssumptionRow(row: Record<string, unknown>): Assumption {
  let blockTypes: BlockType[] = [];
  if (Array.isArray(row.blocks)) {
    blockTypes = (row.blocks as Array<{ blockType?: string }>)
      .map(b => b.blockType as BlockType)
      .filter(Boolean);
  }

  return {
    $id: row.$id as string,
    canvasId: typeof row.canvas === 'string' ? row.canvas : (row.canvas as { $id: string })?.$id ?? '',
    statement: (row.assumptionText as string) ?? '',
    category: (row.category as Assumption['category']) ?? 'product',
    status: (row.status as Assumption['status']) ?? 'untested',
    riskLevel: (row.riskLevel as Assumption['riskLevel']) ?? 'medium',
    severityScore: (row.severityScore as number) ?? 0,
    confidenceScore: (row.confidenceScore as number) ?? 0,
    source: (row.source as Assumption['source']) ?? 'ai',
    blockTypes,
    segmentIds: safeJsonParse(row.segmentIds as string, []),
    linkedValidationItemIds: safeJsonParse(row.linkedValidationItemIds as string, []),
    suggestedExperiment: (row.suggestedExperiment as string) ?? undefined,
    suggestedExperimentDuration: (row.suggestedExperimentDuration as string) ?? undefined,
    createdAt: (row.createdAt as string) ?? (row.$createdAt as string) ?? '',
    updatedAt: (row.updatedAt as string) ?? (row.$updatedAt as string) ?? '',
    lastTestedAt: (row.lastTestedAt as string) ?? undefined,
  };
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { canvasId } = await context.params;

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
    console.error('Error fetching assumptions:', error);
    return NextResponse.json({ error: 'Failed to fetch assumptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { canvasId } = await context.params;
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
    console.error('Error creating assumption:', error);
    return NextResponse.json({ error: 'Failed to create assumption' }, { status: 500 });
  }
}
