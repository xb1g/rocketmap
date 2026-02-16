import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { requireAuth } from "@/lib/appwrite-server";
import { getUserIdFromCanvas } from "@/lib/utils";
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
} from "@/lib/appwrite";
import { getCanvasBlocks } from "@/lib/ai/canvas-state";
import { getViabilityPrompt } from "@/lib/ai/prompts";
import type { BlockType, CanvasData, ViabilityData } from "@/lib/types/canvas";

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

const viabilitySchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    assumptions: z.number().min(0).max(100),
    market: z.number().min(0).max(100),
    unmetNeed: z.number().min(0).max(100),
  }),
  reasoning: z.string(),
  validatedAssumptions: z.array(
    z.object({
      blockType: z.string(),
      assumption: z.string(),
      status: z.enum(["validated", "invalidated", "untested"]),
      evidence: z.string(),
    })
  ),
});

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;

    // 1. Fetch canvas and verify ownership
    const canvas = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      queries: [],
    });

    if (getUserIdFromCanvas(canvas as unknown as CanvasData) !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Load all blocks (reuse existing canvas-state helper which verifies ownership)
    const blocks = await getCanvasBlocks(canvasId, user.$id);

    // 3. Verify all 9 blocks are filled (>=10 chars each)
    if (blocks.length < 9) {
      return NextResponse.json(
        { error: "All 9 blocks must exist" },
        { status: 400 }
      );
    }

    for (const block of blocks) {
      const content = block.content.bmc || block.content.lean || "";
      if (content.trim().length < 10) {
        return NextResponse.json(
          {
            error: `Block ${block.blockType} must have at least 10 characters`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Call Opus 4.6 with viability prompt
    const result = await generateObject({
      model: anthropic("claude-opus-4-6"),
      temperature: 0.3,
      prompt: getViabilityPrompt(blocks),
      schema: viabilitySchema,
    });

    // 5. Calculate overall score (weighted average)
    const { assumptions, market, unmetNeed } = result.object.breakdown;
    const calculatedScore = Math.round(
      assumptions * 0.4 + market * 0.3 + unmetNeed * 0.3
    );

    // 6. Prepare viability data
    const viabilityData: ViabilityData = {
      score: calculatedScore,
      breakdown: result.object.breakdown,
      reasoning: result.object.reasoning,
      validatedAssumptions: result.object.validatedAssumptions.map(item => ({
        ...item,
        blockType: item.blockType as BlockType,
      })),
      calculatedAt: new Date().toISOString(),
    };

    // 7. Save to canvases table
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      data: {
        viabilityScore: calculatedScore,
        viabilityDataJson: JSON.stringify(viabilityData),
        viabilityCalculatedAt: viabilityData.calculatedAt,
      },
    });

    // 8. Return viability data
    return NextResponse.json({ viability: viabilityData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Viability calculation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
