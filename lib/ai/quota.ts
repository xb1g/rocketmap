import { Query } from 'node-appwrite';
import { serverTablesDB, DATABASE_ID } from '@/lib/appwrite';
import { AI_USAGE_EVENTS_TABLE_ID } from '@/lib/ai/usage-events';
import type { Models } from 'node-appwrite';

export const DAILY_BUDGET_USD: Record<string, number> = {
  free: 0.05,   // ~50K tokens on flash, ~16K on pro
  pro: 0.60,    // ~$18/mo worst case
};

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  tier: string;
  resetsAt: string; // ISO timestamp of next midnight UTC
}

function getStartOfDayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getNextMidnightUTC(): Date {
  const start = getStartOfDayUTC();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function getUserTier(user: Models.User<Models.Preferences>): string {
  return user.labels?.includes('pro') ? 'pro' : 'free';
}

/**
 * Check if a user has remaining daily AI budget.
 * Sums today's estimatedCostUsd from ai_usage_events table.
 */
export async function checkAiQuota(
  user: Models.User<Models.Preferences>,
): Promise<QuotaCheck> {
  const tier = getUserTier(user);
  const limit = DAILY_BUDGET_USD[tier] ?? DAILY_BUDGET_USD.free;
  const startOfDay = getStartOfDayUTC().toISOString();

  let used = 0;
  try {
    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: AI_USAGE_EVENTS_TABLE_ID,
      queries: [
        Query.equal('userId', user.$id),
        Query.greaterThan('$createdAt', startOfDay),
        Query.limit(1000),
      ],
    });

    for (const row of result.rows) {
      used += Number(row.estimatedCostUsd ?? 0);
    }
  } catch (error) {
    console.error('[quota] Failed to query usage events:', error);
    // If we can't check quota, be permissive but log
  }

  used = Number(used.toFixed(6));

  return {
    allowed: used < limit,
    used,
    limit,
    tier,
    resetsAt: getNextMidnightUTC().toISOString(),
  };
}

/**
 * Convenience to throw a quota-exceeded error with structured data.
 */
export function createQuotaExceededResponse(quota: QuotaCheck): Response {
  return Response.json(
    {
      error: 'Daily AI budget exceeded',
      limit: quota.limit,
      used: quota.used,
      tier: quota.tier,
      resetsAt: quota.resetsAt,
    },
    { status: 429 },
  );
}
