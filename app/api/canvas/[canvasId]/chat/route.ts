import { stepCountIs, convertToModelMessages } from 'ai';
import { Query } from 'node-appwrite';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { getAgentConfig } from '@/lib/ai/agents';
import { getToolsForAgent } from '@/lib/ai/tools';
import { saveChatMessage } from '@/lib/ai/chat-persistence';
import type { AssumptionContext } from '@/lib/ai/prompts';
import type { BlockType } from '@/lib/types/canvas';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const { messages, chatKey } = await request.json();

    const blocks = await getCanvasBlocks(canvasId, user.$id);

    // Load tracked assumptions for richer consistency checking context
    let assumptions: AssumptionContext[] = [];
    try {
      const assumptionsResult = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: ASSUMPTIONS_TABLE_ID,
        queries: [
          Query.equal('canvas', canvasId),
          Query.limit(200),
        ],
      });
      assumptions = assumptionsResult.rows.map((row: Record<string, unknown>) => {
        let blockTypes: string[] = [];
        if (Array.isArray(row.blocks)) {
          blockTypes = (row.blocks as Array<{ blockType?: string }>)
            .map(b => b.blockType as BlockType)
            .filter(Boolean);
        }
        return {
          statement: (row.assumptionText as string) ?? '',
          status: (row.status as string) ?? 'untested',
          riskLevel: (row.riskLevel as string) ?? 'medium',
          confidenceScore: (row.confidenceScore as number) ?? 0,
          blockTypes,
        };
      });
    } catch {
      // Non-critical: continue without assumption context
    }

    const config = getAgentConfig('general', blocks, assumptions);
    const tools = getToolsForAgent(config.toolNames);

    const modelMessages = await convertToModelMessages(messages);

    const result = streamTextWithLogging('canvas-chat', {
      model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
      system: config.systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(3),
    }, {
      onUsage: (usage) => recordAnthropicUsageForUser(user.$id, usage),
    });

    // Save assistant response (text + tool results with args) after stream completes
    Promise.resolve(result.steps).then((steps) => {
      const parts: Array<Record<string, unknown>> = [];
      for (const step of steps) {
        if (step.text) parts.push({ type: 'text', text: step.text });
        // Build a map of toolCallId → args from tool calls
        const argsMap = new Map<string, unknown>();
        for (const tc of step.toolCalls) {
          const call = tc as unknown as { toolCallId: string; args: unknown };
          argsMap.set(call.toolCallId, call.args);
        }
        for (const tc of step.toolResults) {
          const tr = tc as unknown as { toolName: string; toolCallId: string; result: unknown };
          parts.push({
            type: 'tool-result',
            toolName: tr.toolName,
            toolCallId: tr.toolCallId,
            args: argsMap.get(tr.toolCallId) ?? {},
            result: tr.result,
          });
        }
      }
      if (parts.length > 0) {
        saveChatMessage(canvasId, chatKey || 'general', user.$id, {
          messageId: `assistant-${Date.now()}`,
          role: 'assistant',
          content: JSON.stringify({ parts }),
        }).catch((err) => console.error('[chat-persist] Failed to save assistant message:', err));
      }
    }).catch(() => {});

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
