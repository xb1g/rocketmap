import { stepCountIs, convertToModelMessages } from 'ai';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import { getToolsForAgent, createGenerateCanvasTool } from '@/lib/ai/tools';
import { ONBOARDING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { messages } = await request.json();

    // Use the server-side factory so the tool creates the canvas in Appwrite
    const serverGenerateCanvas = createGenerateCanvasTool(user.$id);
    const tools = getToolsForAgent(['generateCanvas'], {
      generateCanvas: serverGenerateCanvas,
    });
    const modelMessages = await convertToModelMessages(messages);

    // Count user messages from both raw UIMessages and converted model messages
    const rawUserCount = Array.isArray(messages)
      ? messages.filter((m: { role: string }) => m.role === 'user').length
      : 0;
    const modelUserCount = modelMessages.filter(
      (m) => m.role === 'user',
    ).length;

    const shouldForceTool = rawUserCount >= 3 || modelUserCount >= 3;

    console.log(
      `[AI] guided-create | rawUserCount=${rawUserCount}, modelUserCount=${modelUserCount}, forceTool=${shouldForceTool}`,
    );

    // Build params — set toolChoice explicitly when forcing
    const toolChoice = shouldForceTool
      ? ({ type: 'tool', toolName: 'generateCanvas' } as const)
      : undefined;

    const result = streamTextWithLogging('guided-create', {
      model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(1),
      toolChoice,
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
