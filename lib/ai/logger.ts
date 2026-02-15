import { generateText, streamText } from 'ai';

export interface AIUsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

function logParams(label: string, params: GenerateTextParams | StreamTextParams) {
  const systemPreview = typeof params.system === 'string'
    ? params.system.slice(0, 200) + (params.system.length > 200 ? '…' : '')
    : '(structured)';

  const toolNames = params.tools ? Object.keys(params.tools) : [];

  const messages = 'messages' in params && Array.isArray(params.messages)
    ? params.messages
    : [];
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const userPreview = lastUserMsg
    ? String(
        typeof lastUserMsg.content === 'string'
          ? lastUserMsg.content
          : JSON.stringify(lastUserMsg.content),
      ).slice(0, 200)
    : '(none)';

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

export async function generateTextWithLogging(label: string, params: GenerateTextParams) {
  logParams(label, params);
  const result = await generateText(params);
  const usage: AIUsageInfo = {
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
  };
  logUsage(label, usage);
  return { result, usage };
}

export function streamTextWithLogging(label: string, params: StreamTextParams) {
  logParams(label, params);
  const result = streamText(params);

  // Log usage when the stream completes
  Promise.resolve(result.usage).then((u) => {
    logUsage(label, {
      inputTokens: u.inputTokens ?? 0,
      outputTokens: u.outputTokens ?? 0,
      totalTokens: u.totalTokens ?? 0,
    });
  }).catch(() => {
    console.log(`[AI] ${label} | usage: unavailable`);
  });

  return result;
}
