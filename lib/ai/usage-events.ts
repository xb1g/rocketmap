import { ID } from 'node-appwrite';
import { serverTablesDB, DATABASE_ID } from '@/lib/appwrite';
import type { AIUsageInfo } from '@/lib/ai/logger';
import { estimateCostUsd, type ModelId } from '@/lib/ai/pricing';

/**
 * Appwrite table ID for AI usage events.
 * MUST be created manually in Appwrite console with these columns:
 * - userId: string, indexed
 * - canvasId: string, optional, indexed
 * - feature: string (e.g. 'canvas-chat', 'deep-dive', 'viability')
 * - model: string (e.g. 'deepseek-v4-flash')
 * - inputTokens: integer
 * - outputTokens: integer
 * - totalTokens: integer
 * - cacheHitTokens: integer (optional, default 0)
 * - cacheMissTokens: integer (optional, default 0)
 * - estimatedCostUsd: double
 */
export const AI_USAGE_EVENTS_TABLE_ID = 'ai_usage_events';

export interface UsageEventData {
  userId: string;
  canvasId?: string;
  feature: string;
  model: ModelId | string;
  usage: AIUsageInfo;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
}

/**
 * Write a single AI usage event to the events table.
 * Also updates the legacy lifetime counters in user prefs.
 */
export async function recordAiUsageEvent(data: UsageEventData): Promise<void> {
  const cost = estimateCostUsd(data.model as ModelId, {
    inputTokens: data.usage.inputTokens,
    outputTokens: data.usage.outputTokens,
    cacheHitTokens: data.cacheHitTokens,
    cacheMissTokens: data.cacheMissTokens,
  });

  try {
    await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: AI_USAGE_EVENTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        userId: data.userId,
        ...(data.canvasId ? { canvasId: data.canvasId } : {}),
        feature: data.feature,
        model: data.model,
        inputTokens: data.usage.inputTokens,
        outputTokens: data.usage.outputTokens,
        totalTokens: data.usage.totalTokens,
        cacheHitTokens: data.cacheHitTokens ?? 0,
        cacheMissTokens: data.cacheMissTokens ?? 0,
        estimatedCostUsd: cost,
      },
    });
  } catch (error) {
    console.error('[ai-usage-events] Failed to write usage event:', error);
    // Non-blocking: don't fail the AI call if usage tracking fails
  }
}
