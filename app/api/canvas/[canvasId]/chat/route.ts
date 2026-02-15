import { stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { getAgentConfig } from '@/lib/ai/agents';
import { getToolsForAgent } from '@/lib/ai/tools';

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

    const result = streamTextWithLogging('canvas-chat', {
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: config.systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
