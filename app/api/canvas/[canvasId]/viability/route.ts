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
import type { BlockData, BlockType, CanvasData, ViabilityData } from "@/lib/types/canvas";

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

const viabilitySchema = z.object({
  score: z.number().describe("0-100 viability score"),
  breakdown: z.object({
    assumptions: z.number().describe("0-100 assumptions sub-score"),
    market: z.number().describe("0-100 market sub-score"),
    unmetNeed: z.number().describe("0-100 unmet need sub-score"),
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

function getSegmentsText(block: BlockData): string {
  if (block.blockType !== "customer_segments" || !block.linkedSegments?.length) {
    return "";
  }

  return block.linkedSegments
    .map((segment) =>
      [
        segment.name,
        segment.description,
        segment.demographics,
        segment.psychographics,
        segment.behavioral,
        segment.geographic,
        segment.estimatedSize,
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" | ")
    )
    .filter((line) => line.length > 0)
    .join(" \n");
}

function getBlockViabilityText(block: BlockData): string {
  const baseText = block.content.bmc || block.content.lean || "";
  const segmentText = getSegmentsText(block);

  if (block.blockType === "customer_segments" && segmentText.length > 0) {
    return `${baseText}\n${segmentText}`.trim();
  }

  return baseText;
}

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

    // 3. Verify all 9 blocks exist — content depth is evaluated by AI, not gated here
    if (blocks.length < 9) {
      return NextResponse.json(
        { error: "All 9 blocks must exist" },
        { status: 400 }
      );
    }

    // Require at least some content across the canvas (any block with text counts)
    const totalContent = blocks.reduce(
      (sum, b) => sum + getBlockViabilityText(b).trim().length,
      0
    );
    if (totalContent < 50) {
      return NextResponse.json(
        { error: "Canvas needs more content before calculating viability" },
        { status: 400 }
      );
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
