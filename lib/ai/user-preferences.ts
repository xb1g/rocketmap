import { createOpenAI } from "@ai-sdk/openai";
import type { Models } from "node-appwrite";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});
import { serverUsers } from "@/lib/appwrite";
import type { AIUsageInfo } from "@/lib/ai/logger";

// New neutral pref keys (provider-agnostic)
const PREF_AI_API_KEY = "aiApiKey";
const PREF_AI_USAGE_COUNT = "aiUsageCount";
const PREF_AI_INPUT_TOKENS = "aiInputTokens";
const PREF_AI_OUTPUT_TOKENS = "aiOutputTokens";
const PREF_AI_TOTAL_TOKENS = "aiTotalTokens";
const PREF_AI_LAST_USED_AT = "aiLastUsedAt";

// Legacy Anthropic pref keys (for backward-compatible reads)
const PREF_ANTHROPIC_API_KEY = "anthropicApiKey";
const PREF_ANTHROPIC_USAGE_COUNT = "anthropicUsageCount";
const PREF_ANTHROPIC_INPUT_TOKENS = "anthropicInputTokens";
const PREF_ANTHROPIC_OUTPUT_TOKENS = "anthropicOutputTokens";
const PREF_ANTHROPIC_TOTAL_TOKENS = "anthropicTotalTokens";
const PREF_ANTHROPIC_LAST_USED_AT = "anthropicLastUsedAt";

type PreferenceMap = Record<string, unknown>;

function normalizePreferences(
  prefs: Models.Preferences | PreferenceMap | null | undefined,
): PreferenceMap {
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) {
    return {};
  }

  return { ...(prefs as PreferenceMap) };
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return 0;
}

function getRawAiApiKey(prefs: PreferenceMap): string | null {
  // Prefer new key, fallback to legacy
  const candidate = prefs[PREF_AI_API_KEY] ?? prefs[PREF_ANTHROPIC_API_KEY];
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeAiApiKey(apiKey: string): string {
  return apiKey.trim();
}

export function isLikelyAiApiKey(apiKey: string): boolean {
  const trimmed = sanitizeAiApiKey(apiKey);
  return (
    (trimmed.startsWith("sk-") || trimmed.startsWith("sk-ant-")) &&
    trimmed.length >= 20
  );
}

/** @deprecated Use {@link isLikelyAiApiKey} instead */
export const isLikelyAnthropicApiKey = isLikelyAiApiKey;

export function maskAiApiKey(apiKey: string): string {
  const trimmed = sanitizeAiApiKey(apiKey);
  if (trimmed.length <= 8) {
    return "••••";
  }

  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

/** @deprecated Use {@link maskAiApiKey} instead */
export const maskAnthropicApiKey = maskAiApiKey;

export function getAiApiKeyFromUser(
  user: Models.User<Models.Preferences>,
): string | null {
  return getRawAiApiKey(normalizePreferences(user.prefs));
}

/** @deprecated Use {@link getAiApiKeyFromUser} instead */
export const getAnthropicApiKeyFromUser = getAiApiKeyFromUser;

export interface AiUsageStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastUsedAt: string | null;
}

/** @deprecated Use {@link AiUsageStats} instead */
export type AnthropicUsageStats = AiUsageStats;

export function getAiUsageStatsFromUser(
  user: Models.User<Models.Preferences>,
): AiUsageStats {
  const prefs = normalizePreferences(user.prefs);

  // Read new keys first, fallback to legacy keys for migration
  const calls =
    toNonNegativeInt(prefs[PREF_AI_USAGE_COUNT]) ||
    toNonNegativeInt(prefs[PREF_ANTHROPIC_USAGE_COUNT]);
  const inputTokens =
    toNonNegativeInt(prefs[PREF_AI_INPUT_TOKENS]) ||
    toNonNegativeInt(prefs[PREF_ANTHROPIC_INPUT_TOKENS]);
  const outputTokens =
    toNonNegativeInt(prefs[PREF_AI_OUTPUT_TOKENS]) ||
    toNonNegativeInt(prefs[PREF_ANTHROPIC_OUTPUT_TOKENS]);
  const totalTokens =
    toNonNegativeInt(prefs[PREF_AI_TOTAL_TOKENS]) ||
    toNonNegativeInt(prefs[PREF_ANTHROPIC_TOTAL_TOKENS]);
  const lastUsedAt =
    typeof prefs[PREF_AI_LAST_USED_AT] === "string"
      ? (prefs[PREF_AI_LAST_USED_AT] as string)
      : typeof prefs[PREF_ANTHROPIC_LAST_USED_AT] === "string"
        ? (prefs[PREF_ANTHROPIC_LAST_USED_AT] as string)
        : null;

  return { calls, inputTokens, outputTokens, totalTokens, lastUsedAt };
}

/** @deprecated Use {@link getAiUsageStatsFromUser} instead */
export const getAnthropicUsageStatsFromUser = getAiUsageStatsFromUser;

export function getLanguageModel(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _user: Models.User<Models.Preferences>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _modelId: string,
) {
  return deepseek.chat("deepseek-v4-flash");
}

/** @deprecated use getLanguageModel */
export const getAnthropicModelForUser = getLanguageModel;

async function getUserPreferences(userId: string): Promise<PreferenceMap> {
  const prefs = await serverUsers.getPrefs({ userId });
  return normalizePreferences(prefs);
}

export async function getAiKeyStatusForUser(userId: string): Promise<{
  hasKey: boolean;
  maskedKey: string | null;
}> {
  const prefs = await getUserPreferences(userId);
  const apiKey = getRawAiApiKey(prefs);

  return {
    hasKey: Boolean(apiKey),
    maskedKey: apiKey ? maskAiApiKey(apiKey) : null,
  };
}

/** @deprecated Use {@link getAiKeyStatusForUser} instead */
export const getAnthropicKeyStatusForUser = getAiKeyStatusForUser;

export async function saveAiApiKeyForUser(
  userId: string,
  apiKey: string,
): Promise<{ maskedKey: string }> {
  const cleanedKey = sanitizeAiApiKey(apiKey);
  if (!isLikelyAiApiKey(cleanedKey)) {
    throw new Error("Invalid AI API key");
  }

  const prefs = await getUserPreferences(userId);
  const nextPrefs: PreferenceMap = {
    ...prefs,
    [PREF_AI_API_KEY]: cleanedKey,
  };

  await serverUsers.updatePrefs({ userId, prefs: nextPrefs });

  return { maskedKey: maskAiApiKey(cleanedKey) };
}

/** @deprecated Use {@link saveAiApiKeyForUser} instead */
export const saveAnthropicApiKeyForUser = saveAiApiKeyForUser;

export async function removeAiApiKeyForUser(userId: string): Promise<void> {
  const prefs = await getUserPreferences(userId);
  const nextPrefs: PreferenceMap = { ...prefs };
  delete nextPrefs[PREF_AI_API_KEY];
  delete nextPrefs[PREF_ANTHROPIC_API_KEY];
  await serverUsers.updatePrefs({ userId, prefs: nextPrefs });
}

/** @deprecated Use {@link removeAiApiKeyForUser} instead */
export const removeAnthropicApiKeyForUser = removeAiApiKeyForUser;

export async function recordAiUsageForUser(
  userId: string,
  usage: AIUsageInfo,
): Promise<void> {
  try {
    const prefs = await getUserPreferences(userId);
    const nextPrefs: PreferenceMap = {
      ...prefs,
      [PREF_AI_USAGE_COUNT]:
        toNonNegativeInt(prefs[PREF_AI_USAGE_COUNT]) + 1,
      [PREF_AI_INPUT_TOKENS]:
        toNonNegativeInt(prefs[PREF_AI_INPUT_TOKENS]) +
        Math.max(0, usage.inputTokens ?? 0),
      [PREF_AI_OUTPUT_TOKENS]:
        toNonNegativeInt(prefs[PREF_AI_OUTPUT_TOKENS]) +
        Math.max(0, usage.outputTokens ?? 0),
      [PREF_AI_TOTAL_TOKENS]:
        toNonNegativeInt(prefs[PREF_AI_TOTAL_TOKENS]) +
        Math.max(0, usage.totalTokens ?? 0),
      [PREF_AI_LAST_USED_AT]: new Date().toISOString(),
    };

    await serverUsers.updatePrefs({ userId, prefs: nextPrefs });
  } catch (error) {
    console.error("[ai-usage] Failed to persist AI usage:", error);
  }
}

/** @deprecated Use {@link recordAiUsageForUser} instead */
export const recordAnthropicUsageForUser = recordAiUsageForUser;

import { recordAiUsageEvent, type UsageEventData } from '@/lib/ai/usage-events';

/**
 * Combined helper: updates prefs lifetime counters AND writes usage event to table.
 * Use this in onUsage callbacks from generateTextWithLogging / streamTextWithLogging.
 */
export async function recordAiUsage(
  userId: string,
  feature: string,
  usage: AIUsageInfo,
  options?: { canvasId?: string; model?: string },
): Promise<void> {
  // Update lifetime prefs (fast, for dashboard display)
  await recordAiUsageForUser(userId, usage);

  // Write detailed event (for quota enforcement, per-feature breakdown, cost tracking)
  const eventData: UsageEventData = {
    userId,
    feature,
    model: options?.model ?? usage.modelId ?? 'deepseek-v4-flash',
    usage,
    ...(options?.canvasId ? { canvasId: options.canvasId } : {}),
    ...(usage.cacheHitTokens !== undefined ? { cacheHitTokens: usage.cacheHitTokens } : {}),
    ...(usage.cacheMissTokens !== undefined ? { cacheMissTokens: usage.cacheMissTokens } : {}),
  };

  await recordAiUsageEvent(eventData);
}
