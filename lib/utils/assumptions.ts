import type { Assumption, BlockType } from "@/lib/types/canvas";

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Parse an Appwrite assumption row into our Assumption interface. */
export function parseAssumptionRow(row: Record<string, unknown>): Assumption {
  let blockTypes: BlockType[] = [];
  if (Array.isArray(row.blocks)) {
    blockTypes = (row.blocks as Array<{ blockType?: string }>)
      .map((b) => b.blockType as BlockType)
      .filter(Boolean);
  }

  return {
    $id: row.$id as string,
    canvasId:
      typeof row.canvas === "string"
        ? row.canvas
        : ((row.canvas as { $id: string })?.$id ?? ""),
    statement: (row.assumptionText as string) ?? "",
    category: (row.category as Assumption["category"]) ?? "product",
    status: (row.status as Assumption["status"]) ?? "untested",
    riskLevel: (row.riskLevel as Assumption["riskLevel"]) ?? "medium",
    severityScore: (row.severityScore as number) ?? 0,
    confidenceScore: (row.confidenceScore as number) ?? 0,
    source: (row.source as Assumption["source"]) ?? "ai",
    blockTypes,
    segmentIds: safeJsonParse(row.segmentIds as string, []),
    linkedValidationItemIds: safeJsonParse(
      row.linkedValidationItemIds as string,
      [],
    ),
    suggestedExperiment: (row.suggestedExperiment as string) ?? undefined,
    suggestedExperimentDuration:
      (row.suggestedExperimentDuration as string) ?? undefined,
    decisionSignal: (row.decisionSignal as Assumption["decisionSignal"]) ?? undefined,
    createdAt: (row.createdAt as string) ?? (row.$createdAt as string) ?? "",
    updatedAt: (row.updatedAt as string) ?? (row.$updatedAt as string) ?? "",
    lastTestedAt: (row.lastTestedAt as string) ?? undefined,
  };
}
