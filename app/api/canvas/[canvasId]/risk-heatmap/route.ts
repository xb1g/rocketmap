import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import type { Assumption, BlockType, RiskMetrics } from '@/lib/types/canvas';
import { calculateRiskMetrics } from '@/lib/utils/risk';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

const ALL_BLOCK_TYPES: BlockType[] = [
  'key_partnerships', 'key_activities', 'key_resources',
  'value_prop', 'customer_relationships', 'channels',
  'customer_segments', 'cost_structure', 'revenue_streams',
];

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

    // Parse rows into Assumption[] (extract blockTypes from M:M relationship)
    const assumptions: Assumption[] = result.rows.map((row: Record<string, unknown>) => {
      let blockTypes: BlockType[] = [];
      if (Array.isArray(row.blocks)) {
        blockTypes = (row.blocks as Array<{ blockType?: string }>)
          .map(b => b.blockType as BlockType)
          .filter(Boolean);
      }
      return {
        $id: row.$id as string,
        canvasId,
        statement: (row.assumptionText as string) ?? '',
        category: (row.category as Assumption['category']) ?? 'product',
        status: (row.status as Assumption['status']) ?? 'untested',
        riskLevel: (row.riskLevel as Assumption['riskLevel']) ?? 'medium',
        severityScore: (row.severityScore as number) ?? 0,
        confidenceScore: (row.confidenceScore as number) ?? 0,
        source: (row.source as Assumption['source']) ?? 'ai',
        blockTypes,
        segmentIds: [],
        linkedValidationItemIds: [],
        createdAt: (row.createdAt as string) ?? '',
        updatedAt: (row.updatedAt as string) ?? '',
      };
    });

    const heatmap: Record<BlockType, RiskMetrics> = {} as Record<BlockType, RiskMetrics>;
    for (const blockType of ALL_BLOCK_TYPES) {
      heatmap[blockType] = calculateRiskMetrics(blockType, assumptions);
    }

    return NextResponse.json(heatmap);
  } catch (error) {
    console.error('Error calculating risk heatmap:', error);
    return NextResponse.json({ error: 'Failed to calculate risk heatmap' }, { status: 500 });
  }
}
