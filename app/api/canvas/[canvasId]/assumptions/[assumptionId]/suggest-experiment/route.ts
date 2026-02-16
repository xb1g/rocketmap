import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { getAnthropicModelForUser, recordAnthropicUsageForUser } from '@/lib/ai/user-preferences';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { serverTablesDB, DATABASE_ID, ASSUMPTIONS_TABLE_ID } from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string }>;
}

const experimentSchema = z.object({
  experimentType: z.enum(['survey', 'interview', 'mvp', 'ab_test', 'research', 'other']),
  description: z.string().describe('Step-by-step instructions for running the experiment'),
  successCriteria: z.string().describe('How to know if the assumption is validated (specific, measurable)'),
  costEstimate: z.string().max(50).describe('Short cost estimate (max 50 chars): e.g. "$0", "$50", "$500", "$1000"'),
  durationEstimate: z.string().max(50).describe('Short duration (max 50 chars): e.g. "5 min", "1 week", "2 weeks"'),
  reasoning: z.string().describe('Why this is the cheapest/fastest validation method')
});

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, assumptionId } = await context.params;

    // Fetch the assumption
    const assumptionRow = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: assumptionId,
    });

    const assumptionText = assumptionRow.assumptionText as string;

    // Get canvas context
    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const systemPrompt = buildSystemPrompt('general', blocks);

    // Generate experiment suggestion using Haiku (fastest model)
    const { object, usage } = await generateObject({
      model: getAnthropicModelForUser(user, 'claude-haiku-4-5-20251001'),
      system: systemPrompt,
      prompt: `Suggest the cheapest and fastest experiment to validate this assumption:

"${assumptionText}"

Prioritize free/low-cost methods ($0-$100), short timelines (days to weeks), actionable steps, and measurable success criteria.

Experiment types: survey, interview, MVP, A/B test, research, other.`,
      schema: experimentSchema,
    });

    // Record usage
    recordAnthropicUsageForUser(user.$id, {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
    });

    return NextResponse.json({
      type: object.experimentType,
      description: object.description,
      successCriteria: object.successCriteria,
      costEstimate: object.costEstimate,
      durationEstimate: object.durationEstimate,
      reasoning: object.reasoning,
    });
  } catch (error) {
    console.error('Error suggesting experiment:', error);
    return NextResponse.json(
      { error: 'Failed to suggest experiment' },
      { status: 500 }
    );
  }
}
