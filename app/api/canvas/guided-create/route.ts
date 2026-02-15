import { stepCountIs, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import { getToolsForAgent } from '@/lib/ai/tools';
import { ONBOARDING_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export async function POST(request: Request) {
  try {
    await requireAuth();
    const { messages } = await request.json();

    const tools = getToolsForAgent(['generateCanvas']);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamTextWithLogging('guided-create', {
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(2),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
