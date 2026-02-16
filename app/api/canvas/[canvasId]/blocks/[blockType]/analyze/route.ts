import { NextResponse } from 'next/server';
import { stepCountIs } from 'ai';
import { generateTextWithLogging } from '@/lib/ai/logger';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  BLOCKS_TABLE_ID,
} from '@/lib/appwrite';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { getAgentConfig } from '@/lib/ai/agents';
import { getToolsForAgent } from '@/lib/ai/tools';
import type { BlockType } from '@/lib/types/canvas';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

interface RouteContext {
  params: Promise<{ canvasId: string; blockType: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;

    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const config = getAgentConfig(blockType as BlockType, blocks);
    const tools = getToolsForAgent(config.toolNames);

    const targetBlock = blocks.find((b) => b.blockType === blockType);
    const content = targetBlock
      ? `${targetBlock.content.bmc}\n${targetBlock.content.lean}`.trim()
      : '';

    const { result, usage } = await generateTextWithLogging(
      `analyze:${blockType}`,
      {
        model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
        system: config.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze the "${blockType}" block. Current content: "${content || '(empty)'}". Use the analyzeBlock tool to provide your structured analysis.`,
          },
        ],
        tools,
        stopWhen: stepCountIs(3),
      },
      {
        onUsage: (usageData) => recordAnthropicUsageForUser(user.$id, usageData),
      },
    );

    // Extract tool call result
    let analysis = { draft: '', assumptions: [] as string[], risks: [] as string[], questions: [] as string[] };
    for (const step of result.steps) {
      for (const tc of step.toolResults) {
        if (tc.toolName === 'analyzeBlock') {
          analysis = (tc as unknown as { result: typeof analysis }).result;
        }
      }
    }

    // Compute scores
    const hasContent = content.length > 20;
    const hasDepth = analysis.assumptions.length > 0 && analysis.risks.length > 0;
    const confidenceScore = hasContent ? (hasDepth ? 0.7 : 0.4) : 0.2;
    const riskScore = Math.min(1, analysis.risks.length * 0.15);

    // Persist to Appwrite — canvas ownership already verified by getCanvasBlocks above
    // Find existing block doc — only need $id for update target
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

    const aiAnalysisJson = JSON.stringify({
      ...analysis,
      generatedAt: new Date().toISOString(),
    });

    if (existing.rows.length > 0) {
      await serverTablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: BLOCKS_TABLE_ID,
        rowId: existing.rows[0].$id,
        data: { aiAnalysisJson, confidenceScore, riskScore },
      });
    }

    return NextResponse.json({
      analysis: { ...analysis, generatedAt: new Date().toISOString() },
      confidenceScore,
      riskScore,
      usage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block analyze error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
