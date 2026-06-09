import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { getAnthropicModelForUser, recordAnthropicUsageForUser } from '@/lib/ai/user-preferences';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { serverTablesDB, DATABASE_ID, ASSUMPTIONS_TABLE_ID } from '@/lib/appwrite';
import { verifyCanvasOwnership, verifyAssumptionBelongsToCanvas, isForbiddenError } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId } = await context.params;
    await verifyCanvasOwnership(canvasId, user.$id);
    await verifyAssumptionBelongsToCanvas(canvasId, assumptionId);

    const assumptionRow = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: assumptionId,
    });

    const assumptionText = assumptionRow.assumptionText as string;

    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const systemPrompt = buildSystemPrompt('general', blocks);

    const { text, usage } = await generateText({
      model: getAnthropicModelForUser(user, 'claude-haiku-4-5-20251001'),
      system: systemPrompt,
      prompt: `Suggest the cheapest and fastest experiment to validate this assumption:

"${assumptionText}"

Prioritize free/low-cost methods ($0-$100), short timelines (days to weeks), actionable steps, and measurable success criteria.

Return ONLY valid JSON (no markdown, no explanation):
{
  "experimentType": "survey|interview|mvp|ab_test|research|other",
  "description": "step-by-step instructions",
  "successCriteria": "how to know if validated (specific, measurable)",
  "costEstimate": "$0",
  "durationEstimate": "1 week",
  "reasoning": "why this is cheapest/fastest method"
}`,
    });

    recordAnthropicUsageForUser(user.$id, {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model did not return valid JSON');
    const obj = JSON.parse(jsonMatch[0]) as {
      experimentType: string;
      description: string;
      successCriteria: string;
      costEstimate: string;
      durationEstimate: string;
      reasoning: string;
    };

    return NextResponse.json(obj);
  } catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error suggesting experiment:', error);
    return NextResponse.json({ error: 'Failed to suggest experiment' }, { status: 500 });
  }
}
