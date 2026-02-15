import { generateText, streamText } from 'ai';

export interface AIUsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

interface UsageHookOptions {
  onUsage?: (usage: AIUsageInfo) => void | Promise<void>;
}

function logParams(label: string, params: GenerateTextParams | StreamTextParams) {
  const systemPreview = typeof params.system === 'string'
    ? params.system.slice(0, 200) + (params.system.length > 200 ? '…' : '')
    : '(structured)';

  const toolNames = params.tools ? Object.keys(params.tools) : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = 'messages' in params && Array.isArray(params.messages)
    ? params.messages
    : [];
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  let userPreview = '(none)';
  if (lastUserMsg) {
    if (typeof lastUserMsg.content === 'string') {
      userPreview = lastUserMsg.content.slice(0, 200);
    } else if (Array.isArray(lastUserMsg.parts)) {
      // UIMessage format: extract text from parts
      const textPart = lastUserMsg.parts.find((p: { type: string }) => p.type === 'text');
      userPreview = textPart?.text?.slice(0, 200) ?? '(non-text)';
    } else {
      userPreview = JSON.stringify(lastUserMsg.content).slice(0, 200);
    }
  }

  console.log(
    `[AI] ${label} | model=${String(params.model)} | tools=[${toolNames.join(', ')}]`,
  );
  console.log(`[AI]   system: ${systemPreview}`);
  console.log(`[AI]   user: ${userPreview}`);
}

function logUsage(label: string, usage: AIUsageInfo) {
  console.log(
    `[AI] ${label} | tokens: ${usage.totalTokens} total (${usage.inputTokens} in / ${usage.outputTokens} out)`,
  );
}

export async function generateTextWithLogging(
  label: string,
  params: GenerateTextParams,
  options: UsageHookOptions = {},
) {
  logParams(label, params);
  const result = await generateText(params);
  const usage: AIUsageInfo = {
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
  };
  logUsage(label, usage);
  if (options.onUsage) {
    try {
      await options.onUsage(usage);
    } catch (error) {
      console.error(`[AI] ${label} | failed to run usage hook:`, error);
    }
  }
  return { result, usage };
}

export function streamTextWithLogging(
  label: string,
  params: StreamTextParams,
  options: UsageHookOptions = {},
) {
  logParams(label, params);
  const result = streamText(params);

  // Log usage when the stream completes
  Promise.resolve(result.usage).then((u) => {
    const usage: AIUsageInfo = {
      inputTokens: u.inputTokens ?? 0,
      outputTokens: u.outputTokens ?? 0,
      totalTokens: u.totalTokens ?? 0,
    };
    logUsage(label, usage);
    if (options.onUsage) {
      Promise.resolve(options.onUsage(usage)).catch((error) => {
        console.error(`[AI] ${label} | failed to run usage hook:`, error);
      });
    }
  }).catch(() => {
    console.log(`[AI] ${label} | usage: unavailable`);
  });

  return result;
}
