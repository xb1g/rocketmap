import { stepCountIs, convertToModelMessages } from 'ai';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { getAgentConfig } from '@/lib/ai/agents';
import { getToolsForAgent } from '@/lib/ai/tools';
import { saveChatMessage } from '@/lib/ai/chat-persistence';
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
    const { messages } = await request.json();

    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const config = getAgentConfig('general', blocks);
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

    // Save assistant response after stream completes (fire-and-forget)
    Promise.resolve(result.text).then((text) => {
      if (text) {
        saveChatMessage(canvasId, 'general', user.$id, {
          messageId: `assistant-${Date.now()}`,
          role: 'assistant',
          content: text,
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
