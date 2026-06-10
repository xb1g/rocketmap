/**
 * DeepSeek V4 pricing (per 1M tokens, in USD)
 * Source: user-provided rates
 */
export const MODEL_PRICING = {
  'deepseek-v4-flash': {
    cacheHitPerMTok: 0.0028,
    cacheMissPerMTok: 0.14,
    outputPerMTok: 0.28,
  },
  'deepseek-v4-pro': {
    cacheHitPerMTok: 0.003625,
    cacheMissPerMTok: 0.435,
    outputPerMTok: 0.87,
  },
} as const;

export type ModelId = keyof typeof MODEL_PRICING;

export interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
}

/**
 * Estimate cost in USD for a given model and token usage.
 * Falls back to all-cache-miss for input if cache breakdown is unavailable.
 */
export function estimateCostUsd(
  modelId: ModelId,
  usage: TokenBreakdown,
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;

  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMTok;

  // If we have cache breakdown, use it; otherwise assume all cache-miss
  let inputCost: number;
  if (
    usage.cacheHitTokens !== undefined &&
    usage.cacheMissTokens !== undefined
  ) {
    inputCost =
      (usage.cacheHitTokens / 1_000_000) * pricing.cacheHitPerMTok +
      (usage.cacheMissTokens / 1_000_000) * pricing.cacheMissPerMTok;
  } else {
    inputCost = (usage.inputTokens / 1_000_000) * pricing.cacheMissPerMTok;
  }

  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Extract DeepSeek cache token breakdown from AI SDK providerMetadata.
 * The AI SDK (deepseek via openai-compatible) may include this in usage.providerMetadata.
 */
export function extractDeepseekCacheTokens(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerMetadata: any,
): { cacheHitTokens: number; cacheMissTokens: number } | null {
  if (!providerMetadata) return null;
  // DeepSeek returns these under providerMetadata.deepseek or providerMetadata.openai
  const ds = providerMetadata.deepseek || providerMetadata.openai;
  if (!ds) return null;

  const hit = ds.prompt_cache_hit_tokens ?? ds.cache_hit_tokens ?? 0;
  const miss = ds.prompt_cache_miss_tokens ?? ds.cache_miss_tokens ?? 0;

  if (hit || miss) {
    return {
      cacheHitTokens: Number(hit) || 0,
      cacheMissTokens: Number(miss) || 0,
    };
  }
  return null;
}
