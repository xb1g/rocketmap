import { generateText, streamText } from 'ai';
import { extractDeepseekCacheTokens } from '@/lib/ai/pricing';

export interface AIUsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Model ID used for this call (e.g. 'deepseek-v4-flash') */
  modelId?: string;
  /** DeepSeek cache token breakdown from providerMetadata */
  cacheHitTokens?: number;
  cacheMissTokens?: number;
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

function extractModelId(params: GenerateTextParams | StreamTextParams): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = params.model as any;
  if (typeof m === 'string') return m;
  if (m?.modelId) return m.modelId;
  if (m?.model) return m.model;
  return undefined;
}

function buildUsageInfo(
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number; providerMetadata?: unknown },
  modelId?: string,
): AIUsageInfo {
  const cache = extractDeepseekCacheTokens(usage.providerMetadata);
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    modelId,
    cacheHitTokens: cache?.cacheHitTokens,
    cacheMissTokens: cache?.cacheMissTokens,
  };
}

export async function generateTextWithLogging(
  label: string,
  params: GenerateTextParams,
  options: UsageHookOptions = {},
) {
  logParams(label, params);
  const result = await generateText(params);
  const modelId = extractModelId(params);
  const usage = buildUsageInfo(result.usage, modelId);
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
  const modelId = extractModelId(params);

  // Log usage when the stream completes
  Promise.resolve(result.usage).then((u) => {
    const usage = buildUsageInfo(u, modelId);
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
