import { stepCountIs } from 'ai';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  BLOCKS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
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
    console.log(`[analyze] canvasId=${canvasId} blockType=${blockType} userId=${user.$id}`);

    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const config = getAgentConfig(blockType as BlockType, blocks);
    const tools = getToolsForAgent(config.toolNames);
    console.log(`[analyze] blocks loaded=${blocks.length} tools=[${Object.keys(tools).join(', ')}]`);

    const targetBlock = blocks.find((b) => b.blockType === blockType);
    let content = '';
    if (targetBlock) {
      const parts = [targetBlock.content.bmc, targetBlock.content.lean].filter(Boolean);
      if (targetBlock.content.items?.length) {
        for (const item of targetBlock.content.items) {
          parts.push(`• ${item.name}`);
        }
      }
      content = parts.join('\n').trim();
    }

    const result = streamTextWithLogging(
      `analyze:${blockType}`,
      {
        model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
        system: config.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze the "${blockType}" block. Current content: "${content || '(empty)'}". Use the analyzeBlock tool to provide your structured analysis. Also use the identifyAssumptions tool to extract hidden assumptions with risk levels.`,
          },
        ],
        tools,
        toolChoice: 'required',
        stopWhen: stepCountIs(3),
      },
      {
        onUsage: (usageData) => recordAnthropicUsageForUser(user.$id, usageData),
      },
    );

    // Persist results to Appwrite after stream completes (fire-and-forget)
    Promise.resolve(result.steps).then(async (steps) => {
      let analysis: {
        draft: string;
        assumptions: string[];
        risks: string[];
        questions: string[];
        confidenceScore?: number;
        riskScore?: number;
      } = { draft: '', assumptions: [], risks: [], questions: [] };
      let identifiedAssumptions: Array<{
        statement: string;
        riskLevel: 'high' | 'medium' | 'low';
        reasoning: string;
        affectedBlocks: string[];
      }> = [];

      for (const step of steps) {
        for (const tc of step.toolResults) {
          if (tc.toolName === 'analyzeBlock') {
            const toolResult = (tc as unknown as { result: typeof analysis }).result;
            if (toolResult) analysis = toolResult;
          }
          if (tc.toolName === 'identifyAssumptions') {
            const res = (tc as unknown as { result: { assumptions: typeof identifiedAssumptions } }).result;
            identifiedAssumptions = res?.assumptions ?? [];
          }
        }
      }

      const aiConfidence = typeof analysis.confidenceScore === 'number' ? analysis.confidenceScore : null;
      const aiRisk = typeof analysis.riskScore === 'number' ? analysis.riskScore : null;
      const confidenceScore = aiConfidence !== null
        ? aiConfidence / 100
        : (content.length > 20 ? 0.4 : 0.2);
      const riskScore = aiRisk !== null
        ? aiRisk / 100
        : Math.min(1, analysis.risks.length * 0.15);

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

      if (identifiedAssumptions.length > 0) {
        const blocksLookup = await serverTablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: BLOCKS_TABLE_ID,
          queries: [
            Query.equal('canvas', canvasId),
            Query.select(['$id', 'blockType']),
            Query.limit(100),
          ],
        });
        const blockIdMap = new Map<string, string>();
        for (const doc of blocksLookup.rows) {
          blockIdMap.set(doc.blockType as string, doc.$id as string);
        }

        const now = new Date().toISOString();
        await Promise.allSettled(
          identifiedAssumptions.map((assumption) => {
            const affectedBlockIds = assumption.affectedBlocks
              .map((bt) => blockIdMap.get(bt))
              .filter((id): id is string => !!id);
            const severityScore = assumption.riskLevel === 'high' ? 8 : assumption.riskLevel === 'medium' ? 5 : 2;

            return serverTablesDB.createRow({
              databaseId: DATABASE_ID,
              tableId: ASSUMPTIONS_TABLE_ID,
              rowId: ID.unique(),
              data: {
                canvas: canvasId,
                assumptionText: assumption.statement,
                category: 'product',
                status: 'untested',
                riskLevel: assumption.riskLevel,
                severityScore,
                confidenceScore: 0,
                source: 'ai',
                segmentIds: JSON.stringify([]),
                linkedValidationItemIds: JSON.stringify([]),
                createdAt: now,
                updatedAt: now,
                ...(affectedBlockIds.length > 0 ? { blocks: affectedBlockIds } : {}),
              },
            });
          }),
        );
      }
    }).catch((err) => console.error('[analyze-persist] Failed to save analysis:', err));

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Block analyze error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
