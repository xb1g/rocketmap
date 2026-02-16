import { generateObject } from 'ai';
import { z } from 'zod';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
  BLOCKS_TABLE_ID,
} from '@/lib/appwrite';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

const assumptionsSchema = z.object({
  reasoning: z.string().describe('Brief step-by-step reasoning about the canvas before listing assumptions'),
  assumptions: z.array(z.object({
    statement: z.string().describe('A clear, testable assumption statement'),
    category: z.enum(['market', 'product', 'ops', 'legal']),
    severityScore: z.number().describe('Impact if wrong, integer 0-10: 0=negligible, 10=catastrophic'),
    blockTypes: z.array(z.string()).describe('BMC block types this assumption relates to'),
  })),
});

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(_request: Request, context: RouteContext) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try { controller.enqueue(encoder.encode(sseEvent(data))); } catch { /* closed */ }
      };

      try {
        const user = await requireAuth();
        const { canvasId } = await context.params;

        send({ type: 'step', step: 'loading' });

        // Load canvas blocks (validates canvas exists)
        const blocks = await getCanvasBlocks(canvasId, user.$id);
        const systemPrompt = buildSystemPrompt('general', blocks);

        send({ type: 'step', step: 'analyzing' });

        // Use generateObject for reliable structured output
        const { object, usage } = await generateObject({
          model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
          system: systemPrompt,
          prompt: `Analyze this entire business model canvas and extract ALL hidden assumptions the founder is making. Focus on:

- Market assumptions (target customers exist, willingness to pay, market size claims)
- Product assumptions (technical feasibility, value delivery, competitive advantage)
- Operational assumptions (resource availability, scalability, partnerships, timelines)
- Legal/regulatory assumptions (compliance, IP protection, contracts)

For each assumption:
- Make it specific and testable (not vague)
- Link it to the relevant block types (use exact block type keys like "customer_segments", "value_prop", etc.)
- Score severity 0-10 based on impact if the assumption is wrong (10 = catastrophic)

Think through the canvas step by step in your reasoning, then list all assumptions.`,
          schema: assumptionsSchema,
        });

        console.log(`[assumptions] Generated ${object.assumptions.length} assumptions, tokens: ${usage.totalTokens}`);

        // Send reasoning as thinking
        if (object.reasoning) {
          send({ type: 'thinking', text: object.reasoning });
        }

        // Record usage
        recordAnthropicUsageForUser(user.$id, {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        });

        const extracted = object.assumptions;
        send({ type: 'step', step: 'saving', count: extracted.length });

        // Build block type → $id lookup for relationships
        const blockIdMap = new Map<string, string>();
        const blockDocsRes = await serverTablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: BLOCKS_TABLE_ID,
          queries: [
            Query.equal('canvas', canvasId),
            Query.select(['$id', 'blockType']),
            Query.limit(100),
          ],
        });
        for (const doc of blockDocsRes.rows) {
          blockIdMap.set(doc.blockType as string, doc.$id as string);
        }

        // Persist each assumption to Appwrite
        const created = [];
        for (const assumption of extracted) {
          const blockIds = assumption.blockTypes
            .map((bt) => blockIdMap.get(bt))
            .filter((id): id is string => !!id);

          try {
            const riskLevel = assumption.severityScore >= 7 ? 'high' : assumption.severityScore >= 4 ? 'medium' : 'low';

            const doc = await serverTablesDB.createRow({
              databaseId: DATABASE_ID,
              tableId: ASSUMPTIONS_TABLE_ID,
              rowId: ID.unique(),
              data: {
                canvas: canvasId,
                assumptionText: assumption.statement,
                category: assumption.category,
                status: 'untested',
                riskLevel,
                severityScore: assumption.severityScore,
                ...(blockIds.length > 0 ? { blocks: blockIds } : {}),
              },
            });

            created.push({
              $id: doc.$id,
              statement: assumption.statement,
              category: assumption.category,
              severityScore: assumption.severityScore,
              status: 'untested' as const,
              blockTypes: assumption.blockTypes,
            });
          } catch (err) {
            console.error('Failed to persist assumption:', err);
          }
        }

        send({ type: 'done', assumptions: created });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Assumptions analyze error:', message);
        send({ type: 'error', error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
