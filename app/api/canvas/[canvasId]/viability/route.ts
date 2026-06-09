import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { requireAuth } from "@/lib/appwrite-server";
import { getUserIdFromCanvas } from "@/lib/utils";
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
} from "@/lib/appwrite";
import { getCanvasBlocks } from "@/lib/ai/canvas-state";
import { getViabilityPrompt } from "@/lib/ai/prompts";
import { recordAnthropicUsageForUser } from "@/lib/ai/user-preferences";
import type { BlockData, BlockType, CanvasData, ViabilityData } from "@/lib/types/canvas";

const deepseekFlash = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
}).chat("deepseek-v4-flash");

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

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

    const canvas = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      queries: [],
    });

    if (getUserIdFromCanvas(canvas as unknown as CanvasData) !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const blocks = await getCanvasBlocks(canvasId, user.$id);

    if (blocks.length < 9) {
      return NextResponse.json({ error: "All 9 blocks must exist" }, { status: 400 });
    }

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

    const result = await generateText({
      model: deepseekFlash,
      temperature: 0.3,
      prompt: getViabilityPrompt(blocks),
    });

    void recordAnthropicUsageForUser(user.$id, {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    });

    // Extract JSON from the response text
    const text = result.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model did not return valid JSON");
    }

    const obj = JSON.parse(jsonMatch[0]) as {
      score: number;
      breakdown: { assumptions: number; market: number; unmetNeed: number };
      reasoning: string;
      validatedAssumptions?: Array<{
        blockType: string;
        assumption: string;
        status: "validated" | "invalidated" | "untested";
        evidence: string;
      }>;
    };

    const { assumptions, market, unmetNeed } = obj.breakdown;
    const calculatedScore = Math.round(assumptions * 0.4 + market * 0.3 + unmetNeed * 0.3);

    const viabilityData: ViabilityData = {
      score: calculatedScore,
      breakdown: obj.breakdown,
      reasoning: obj.reasoning,
      validatedAssumptions: (obj.validatedAssumptions ?? []).map(item => ({
        ...item,
        blockType: item.blockType as BlockType,
      })),
      calculatedAt: new Date().toISOString(),
    };

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

    return NextResponse.json({ viability: viabilityData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Viability calculation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
