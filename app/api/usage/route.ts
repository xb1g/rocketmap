import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import { serverTablesDB, DATABASE_ID } from '@/lib/appwrite';
import { AI_USAGE_EVENTS_TABLE_ID } from '@/lib/ai/usage-events';
import { checkAiQuota } from '@/lib/ai/quota';
import { getAiUsageStatsFromUser } from '@/lib/ai/user-preferences';

export async function GET() {
  try {
    const user = await requireAuth();
    const quota = await checkAiQuota(user);
    const lifetime = getAiUsageStatsFromUser(user);

    // Last 30 days daily breakdown
    // If the ai_usage_events table doesn't exist yet, gracefully return empty breakdowns
    const byDay: Record<string, { cost: number; tokens: number; calls: number }> = {};
    const byFeature: Record<string, { cost: number; tokens: number; calls: number }> = {};

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const eventsResult = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: AI_USAGE_EVENTS_TABLE_ID,
        queries: [
          Query.equal('userId', user.$id),
          Query.greaterThan('$createdAt', thirtyDaysAgo),
          Query.limit(1000),
        ],
      });

      for (const row of eventsResult.rows) {
        const day = (row.$createdAt as string).slice(0, 10); // YYYY-MM-DD
        const cost = Number(row.estimatedCostUsd ?? 0);
        const tokens = Number(row.totalTokens ?? 0);
        const feature = String(row.feature ?? 'unknown');

        byDay[day] = byDay[day] || { cost: 0, tokens: 0, calls: 0 };
        byDay[day].cost += cost;
        byDay[day].tokens += tokens;
        byDay[day].calls += 1;

        byFeature[feature] = byFeature[feature] || { cost: 0, tokens: 0, calls: 0 };
        byFeature[feature].cost += cost;
        byFeature[feature].tokens += tokens;
        byFeature[feature].calls += 1;
      }
    } catch (tableError) {
      console.warn('[api/usage] ai_usage_events table not available yet:', tableError);
    }

    // Estimate lifetime cost using flash pricing as a conservative baseline
    // (we don't store per-call model breakdown in prefs, so use cache-miss rate)
    const lifetimeCostUsd =
      (lifetime.inputTokens / 1_000_000) * 0.14 +
      (lifetime.outputTokens / 1_000_000) * 0.28;

    return NextResponse.json({
      tier: quota.tier,
      daily: {
        limit: quota.limit,
        used: quota.used,
        remaining: Math.max(0, Number((quota.limit - quota.used).toFixed(6))),
        resetsAt: quota.resetsAt,
      },
      lifetime: {
        calls: lifetime.calls,
        inputTokens: lifetime.inputTokens,
        outputTokens: lifetime.outputTokens,
        totalTokens: lifetime.totalTokens,
        estimatedCostUsd: Number(lifetimeCostUsd.toFixed(4)),
        lastUsedAt: lifetime.lastUsedAt,
      },
      byDay,
      byFeature,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/usage] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
