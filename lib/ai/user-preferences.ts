import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import type { Models } from "node-appwrite";
import { serverUsers } from "@/lib/appwrite";
import type { AIUsageInfo } from "@/lib/ai/logger";

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

function getRawAnthropicApiKey(prefs: PreferenceMap): string | null {
  const candidate = prefs[PREF_ANTHROPIC_API_KEY];
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeAnthropicApiKey(apiKey: string): string {
  return apiKey.trim();
}

export function isLikelyAnthropicApiKey(apiKey: string): boolean {
  const trimmed = sanitizeAnthropicApiKey(apiKey);
  return trimmed.startsWith("sk-ant-") && trimmed.length >= 20;
}

export function maskAnthropicApiKey(apiKey: string): string {
  const trimmed = sanitizeAnthropicApiKey(apiKey);
  if (trimmed.length <= 8) {
    return "••••";
  }

  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

export function getAnthropicApiKeyFromUser(
  user: Models.User<Models.Preferences>,
): string | null {
  return getRawAnthropicApiKey(normalizePreferences(user.prefs));
}

export interface AnthropicUsageStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastUsedAt: string | null;
}

export function getAnthropicUsageStatsFromUser(
  user: Models.User<Models.Preferences>,
): AnthropicUsageStats {
  const prefs = normalizePreferences(user.prefs);

  return {
    calls: toNonNegativeInt(prefs[PREF_ANTHROPIC_USAGE_COUNT]),
    inputTokens: toNonNegativeInt(prefs[PREF_ANTHROPIC_INPUT_TOKENS]),
    outputTokens: toNonNegativeInt(prefs[PREF_ANTHROPIC_OUTPUT_TOKENS]),
    totalTokens: toNonNegativeInt(prefs[PREF_ANTHROPIC_TOTAL_TOKENS]),
    lastUsedAt:
      typeof prefs[PREF_ANTHROPIC_LAST_USED_AT] === "string"
        ? (prefs[PREF_ANTHROPIC_LAST_USED_AT] as string)
        : null,
  };
}

export function getAnthropicModelForUser(
  user: Models.User<Models.Preferences>,
  modelId: Parameters<typeof anthropic>[0],
) {
  const userApiKey = getAnthropicApiKeyFromUser(user);
  if (!userApiKey) {
    return anthropic(modelId);
  }

  return createAnthropic({ apiKey: userApiKey })(modelId);
}

async function getUserPreferences(userId: string): Promise<PreferenceMap> {
  const prefs = await serverUsers.getPrefs({ userId });
  return normalizePreferences(prefs);
}

export async function getAnthropicKeyStatusForUser(userId: string): Promise<{
  hasKey: boolean;
  maskedKey: string | null;
}> {
  const prefs = await getUserPreferences(userId);
  const apiKey = getRawAnthropicApiKey(prefs);

  return {
    hasKey: Boolean(apiKey),
    maskedKey: apiKey ? maskAnthropicApiKey(apiKey) : null,
  };
}

export async function saveAnthropicApiKeyForUser(
  userId: string,
  apiKey: string,
): Promise<{ maskedKey: string }> {
  const cleanedKey = sanitizeAnthropicApiKey(apiKey);
  if (!isLikelyAnthropicApiKey(cleanedKey)) {
    throw new Error("Invalid Anthropic API key");
  }

  const prefs = await getUserPreferences(userId);
  const nextPrefs: PreferenceMap = {
    ...prefs,
    [PREF_ANTHROPIC_API_KEY]: cleanedKey,
  };

  await serverUsers.updatePrefs({ userId, prefs: nextPrefs });

  return { maskedKey: maskAnthropicApiKey(cleanedKey) };
}

export async function removeAnthropicApiKeyForUser(userId: string): Promise<void> {
  const prefs = await getUserPreferences(userId);
  const nextPrefs: PreferenceMap = { ...prefs };
  delete nextPrefs[PREF_ANTHROPIC_API_KEY];
  await serverUsers.updatePrefs({ userId, prefs: nextPrefs });
}

export async function recordAnthropicUsageForUser(
  userId: string,
  usage: AIUsageInfo,
): Promise<void> {
  try {
    const prefs = await getUserPreferences(userId);
    const nextPrefs: PreferenceMap = {
      ...prefs,
      [PREF_ANTHROPIC_USAGE_COUNT]:
        toNonNegativeInt(prefs[PREF_ANTHROPIC_USAGE_COUNT]) + 1,
      [PREF_ANTHROPIC_INPUT_TOKENS]:
        toNonNegativeInt(prefs[PREF_ANTHROPIC_INPUT_TOKENS]) +
        Math.max(0, usage.inputTokens ?? 0),
      [PREF_ANTHROPIC_OUTPUT_TOKENS]:
        toNonNegativeInt(prefs[PREF_ANTHROPIC_OUTPUT_TOKENS]) +
        Math.max(0, usage.outputTokens ?? 0),
      [PREF_ANTHROPIC_TOTAL_TOKENS]:
        toNonNegativeInt(prefs[PREF_ANTHROPIC_TOTAL_TOKENS]) +
        Math.max(0, usage.totalTokens ?? 0),
      [PREF_ANTHROPIC_LAST_USED_AT]: new Date().toISOString(),
    };

    await serverUsers.updatePrefs({ userId, prefs: nextPrefs });
  } catch (error) {
    console.error("[ai-usage] Failed to persist Anthropic usage:", error);
  }
}
