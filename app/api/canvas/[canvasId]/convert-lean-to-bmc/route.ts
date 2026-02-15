import { NextResponse } from 'next/server';
import { tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateTextWithLogging } from '@/lib/ai/logger';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from '@/lib/appwrite';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { BLOCK_DEFINITIONS, isSharedBlock } from '@/app/components/canvas/constants';
import type { BlockType } from '@/lib/types/canvas';

const convertLeanToBmc = tool({
  description: 'Convert Lean Canvas content into Business Model Canvas content for each non-shared block. Reinterpret the concepts appropriately.',
  inputSchema: z.object({
    conversions: z.array(z.object({
      blockType: z.string().describe('The block type identifier'),
      bmcContent: z.string().describe('The converted BMC content for this block'),
      reasoning: z.string().describe('Brief explanation of how the lean concept was reinterpreted'),
    })).describe('Converted BMC content for each non-shared block'),
  }),
  execute: async (params) => params,
});

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;

    const blocks = await getCanvasBlocks(canvasId, user.$id);

    // Build lean content summary for non-shared blocks
    const leanBlocks: { type: BlockType; leanLabel: string; bmcLabel: string; lean: string }[] = [];
    for (const def of BLOCK_DEFINITIONS) {
      if (isSharedBlock(def.type)) continue;
      const block = blocks.find((b) => b.blockType === def.type);
      if (block && block.content.lean.trim().length > 0) {
        leanBlocks.push({
          type: def.type,
          leanLabel: def.leanLabel!,
          bmcLabel: def.bmcLabel,
          lean: block.content.lean,
        });
      }
    }

    if (leanBlocks.length === 0) {
      return NextResponse.json({ error: 'No lean content to convert' }, { status: 400 });
    }

    // Also include shared blocks for context
    const sharedContext = blocks
      .filter((b) => isSharedBlock(b.blockType) && b.content.bmc.trim())
      .map((b) => {
        const def = BLOCK_DEFINITIONS.find((d) => d.type === b.blockType);
        return `${def?.bmcLabel}: ${b.content.bmc}`;
      })
      .join('\n');

    const leanSummary = leanBlocks
      .map((b) => `- ${b.leanLabel} (→ ${b.bmcLabel}): "${b.lean}"`)
      .join('\n');

    const { result, usage } = await generateTextWithLogging('convert-lean-to-bmc', {
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: `You are a business model expert. The user has filled out a Lean Canvas and wants to convert it to a Business Model Canvas (BMC).

The Lean Canvas and BMC share the same 9-block grid, but 5 blocks have DIFFERENT meanings:
- Lean "Problem" → BMC "Key Partners" (strategic alliances, supplier relationships)
- Lean "Solution" → BMC "Key Activities" (core actions to deliver value)
- Lean "Key Metrics" → BMC "Key Resources" (physical, IP, human, financial assets)
- Lean "Unique Value Proposition" → BMC "Value Propositions" (broader value delivery)
- Lean "Unfair Advantage" → BMC "Customer Relationships" (acquire, retain, grow customers)

4 blocks are shared (same in both): Channels, Customer Segments, Cost Structure, Revenue Streams.

Your job: Take the Lean Canvas content and reinterpret it into the corresponding BMC block. Do NOT just copy text — translate the business concept from the Lean framework to the BMC framework while preserving the user's business idea and details.

For example:
- Lean "Problem: Restaurants waste 30% of food" → BMC "Key Partners: Food waste analytics providers, restaurant supply chain partners, composting/recycling facilities"
- Lean "Solution: AI-powered inventory forecasting" → BMC "Key Activities: Develop and maintain AI forecasting engine, integrate with restaurant POS systems, continuous model training"`,
      messages: [
        {
          role: 'user',
          content: `Convert the following Lean Canvas content to BMC.

Lean Canvas blocks to convert:
${leanSummary}

${sharedContext ? `Shared blocks (for context):\n${sharedContext}` : ''}

Use the convertLeanToBmc tool to provide the converted content for each block. Make each BMC block specific, actionable, and aligned with the overall business model.`,
        },
      ],
      tools: { convertLeanToBmc },
      stopWhen: stepCountIs(3),
    });

    // Extract tool result
    let conversions: { blockType: string; bmcContent: string; reasoning: string }[] = [];
    for (const step of result.steps) {
      for (const tc of step.toolResults) {
        if (tc.toolName === 'convertLeanToBmc') {
          const res = (tc as unknown as { result: { conversions: typeof conversions } }).result;
          conversions = res.conversions;
        }
      }
    }

    if (conversions.length === 0) {
      return NextResponse.json({ error: 'AI did not produce conversions' }, { status: 500 });
    }

    // Persist converted content to Appwrite
    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );
    const canvasIntId = canvas.id as number;

    const updates: { blockType: string; bmc: string; lean: string; reasoning: string }[] = [];

    for (const conv of conversions) {
      const block = blocks.find((b) => b.blockType === conv.blockType);
      if (!block) continue;

      const newContent = { bmc: conv.bmcContent, lean: block.content.lean };

      const existing = await serverDatabases.listDocuments(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        [
          Query.equal('canvasId', canvasIntId),
          Query.equal('blockType', conv.blockType),
          Query.limit(1),
        ],
      );

      if (existing.documents.length > 0) {
        await serverDatabases.updateDocument(
          DATABASE_ID,
          BLOCKS_COLLECTION_ID,
          existing.documents[0].$id,
          { contentJson: JSON.stringify(newContent) },
        );
      }

      updates.push({
        blockType: conv.blockType,
        bmc: conv.bmcContent,
        lean: block.content.lean,
        reasoning: conv.reasoning,
      });
    }

    return NextResponse.json({ updates, usage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Convert lean-to-bmc error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
