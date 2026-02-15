import { stepCountIs, convertToModelMessages } from 'ai';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import { getToolsForAgent } from '@/lib/ai/tools';
import { ONBOARDING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { messages } = await request.json();

    const tools = getToolsForAgent(['generateCanvas']);
    const modelMessages = await convertToModelMessages(messages);

    // Count user messages — force tool call after enough conversation
    const userMessageCount = modelMessages.filter(
      (m) => m.role === 'user',
    ).length;

    const result = streamTextWithLogging('guided-create', {
      model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(2),
      ...(userMessageCount >= 3 && {
        toolChoice: { type: 'tool', toolName: 'generateCanvas' },
      }),
    }, {
      onUsage: (usage) => recordAnthropicUsageForUser(user.$id, usage),
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
