import { NextResponse } from 'next/server';
import { stepCountIs } from 'ai';
import { generateTextWithLogging } from '@/lib/ai/logger';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
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

    // Persist to Appwrite
    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );
    const canvasIntId = canvas.id as number;

    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [
        Query.equal('canvasId', canvasIntId),
        Query.equal('blockType', blockType),
        Query.limit(1),
      ],
    );

    const aiAnalysisJson = JSON.stringify({
      ...analysis,
      generatedAt: new Date().toISOString(),
    });

    if (existing.documents.length > 0) {
      await serverDatabases.updateDocument(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        existing.documents[0].$id,
        { aiAnalysisJson, confidenceScore, riskScore },
      );
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
