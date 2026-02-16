import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getSessionUser } from "@/lib/appwrite-server";
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
  SEGMENTS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
} from "@/lib/appwrite";
import type {
  BlockData,
  BlockType,
  BlockContent,
  CanvasData,
  AIAnalysis,
  MarketResearchData,
  Segment,
} from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "@/app/components/canvas/constants";
import type { AssumptionItem } from "@/app/components/canvas/AssumptionsView";
import { CanvasClient } from "./CanvasClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function parseContentJson(raw: string | undefined): BlockContent {
  if (!raw) return { bmc: "", lean: "", items: [] };
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      bmc: parsed.bmc ?? "",
      lean: parsed.lean ?? "",
      items: parsed.items ?? [],
    };
  } catch {
    return { bmc: String(raw), lean: "", items: [] };
  }
}

function parseAiAnalysis(raw: string | undefined): AIAnalysis | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      draft: parsed.draft ?? "",
      assumptions: parsed.assumptions ?? [],
      risks: parsed.risks ?? [],
      questions: parsed.questions ?? [],
      generatedAt: parsed.generatedAt ?? "",
    };
  } catch {
    return null;
  }
}

function parseDeepDiveJson(raw: string | undefined): MarketResearchData | null {
  if (!raw) return null;
  try {
    return (
      typeof raw === "string" ? JSON.parse(raw) : raw
    ) as MarketResearchData;
  } catch {
    return null;
  }
}

function normalizeSegmentRef(
  segmentRef: any,
  segmentById: Map<string, Segment>,
): Segment | null {
  if (!segmentRef) return null;

  const segmentId =
    typeof segmentRef === "string"
      ? segmentRef
      : typeof segmentRef === "object"
        ? segmentRef.$id
        : null;

  if (!segmentId) return null;

  const fromLookup = segmentById.get(segmentId);
  if (fromLookup) return fromLookup;

  if (typeof segmentRef === "string") {
    return null;
  }

  if (typeof segmentRef !== "string" && segmentRef.$id) {
    return {
      $id: segmentRef.$id,
      name: segmentRef.name ?? "",
      description: segmentRef.description ?? "",
      earlyAdopterFlag: segmentRef.earlyAdopterFlag ?? false,
      priorityScore: segmentRef.priorityScore ?? 50,
      demographics: segmentRef.demographics ?? "",
      psychographics: segmentRef.psychographics ?? "",
      behavioral: segmentRef.behavioral ?? "",
      geographic: segmentRef.geographic ?? "",
      estimatedSize: segmentRef.estimatedSize ?? "",
      colorHex: segmentRef.colorHex,
    };
  }

  return null;
}

export default async function CanvasPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getSessionUser();

  console.log('🔍 [Canvas Page] Accessing:', { slug, userId: user?.$id, hasUser: !!user });

  if (!user) {
    console.log('❌ [Canvas Page] No user session - redirecting to auth');
    redirect("/?error=unauthorized");
  }

  // 1. Fetch canvas by slug
  // Index required: slug (key)
  // Note: "users" relationship field is automatically loaded (can't be in Query.select)
  let canvas;
  try {
    console.log('🔍 [Canvas Page] Querying database for slug:', slug);
    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      queries: [
        Query.equal("slug", slug),
        Query.select(["$id", "title", "slug", "description", "isPublic"]),
        Query.limit(1),
      ],
    });
    console.log('✅ [Canvas Page] Query result:', {
      found: result.rows.length,
      canvasId: result.rows[0]?.$id,
      title: result.rows[0]?.title
    });
    if (result.rows.length === 0) {
      console.log('❌ [Canvas Page] Canvas not found - redirecting to dashboard');
      redirect("/dashboard");
    }
    canvas = result.rows[0];
  } catch (error) {
    console.error('❌ [Canvas Page] Database error:', error);
    redirect("/dashboard");
  }

  // 2. Fetch blocks and segments for this canvas
  let blockDocs: any[] = [];
  let segmentDocs: any[] = [];

  try {
    // Index required: blocks.canvas (key), segments.canvas + priorityScore (composite, desc)
    const [blocksRes, segmentsRes] = await Promise.all([
      serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: BLOCKS_TABLE_ID,
        queries: [
          Query.equal("canvas", canvas.$id),
          Query.select([
            "$id", "$createdAt", "blockType", "contentJson",
            "aiAnalysisJson", "confidenceScore", "riskScore",
            "deepDiveJson",
          ]),
          Query.limit(100),
        ],
      }),
      serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: SEGMENTS_TABLE_ID,
        queries: [
          Query.equal("canvas", canvas.$id),
          Query.select([
            "$id", "name", "description", "earlyAdopterFlag",
            "priorityScore", "demographics", "psychographics",
            "behavioral", "geographic", "estimatedSize", "colorHex",
          ]),
          Query.orderDesc("priorityScore"),
          Query.limit(100),
        ],
      }),
    ]);
    blockDocs = blocksRes.rows;
    segmentDocs = segmentsRes.rows;

    // Debug: Log how many blocks we have
    console.log(`[Canvas ${canvas.$id}] Loaded ${blockDocs.length} blocks from database`);
    if (blockDocs.length > 9) {
      console.log('Block types:', blockDocs.map(d => d.blockType));
    }
  } catch (error) {
    console.error("Error fetching canvas components:", error);
  }

  // 3. Fetch assumptions directly — linked to blocks via many-to-many
  const blockIds = blockDocs.map((d: any) => d.$id as string);
  let initialAssumptions: AssumptionItem[] = [];
  if (blockIds.length > 0) {
    try {
      const assumptionsRes = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: ASSUMPTIONS_TABLE_ID,
        queries: [
          Query.select(["$id", "assumptionText", "category", "severityScore", "status"]),
          Query.orderDesc("severityScore"),
          Query.limit(100),
        ],
      });

      // Filter to assumptions linked to this canvas's blocks
      // The "blocks" relationship auto-loads (not in select)
      initialAssumptions = assumptionsRes.rows
        .filter((a: any) => {
          if (!Array.isArray(a.blocks)) return false;
          return a.blocks.some((b: any) => {
            const bId = typeof b === "string" ? b : b?.$id;
            return bId && blockIds.includes(bId);
          });
        })
        .map((a: any) => {
          const linkedBlockTypes = Array.isArray(a.blocks)
            ? a.blocks
                .map((b: any) => {
                  const bId = typeof b === "string" ? b : b?.$id;
                  const doc = blockDocs.find((d: any) => d.$id === bId);
                  return doc?.blockType as string | undefined;
                })
                .filter((bt: string | undefined): bt is string => !!bt)
            : [];
          return {
            $id: a.$id,
            statement: a.assumptionText ?? "",
            category: a.category ?? "market",
            severityScore: a.severityScore ?? 0,
            status: a.status ?? "untested",
            blockTypes: linkedBlockTypes,
          };
        });
    } catch (err) {
      console.error("Error fetching assumptions:", err);
    }
  }

  // 4. Map segments for easy lookup
  const initialSegments: Segment[] = segmentDocs.map((doc: any) => ({
    $id: doc.$id,
    name: doc.name,
    description: doc.description ?? "",
    earlyAdopterFlag: doc.earlyAdopterFlag ?? false,
    priorityScore: doc.priorityScore ?? 50,
    demographics: doc.demographics ?? "",
    psychographics: doc.psychographics ?? "",
    behavioral: doc.behavioral ?? "",
    geographic: doc.geographic ?? "",
    estimatedSize: doc.estimatedSize ?? "",
    colorHex: doc.colorHex,
  }));

  const segmentById = new Map(
    initialSegments.map((segment) => [segment.$id, segment]),
  );

  // 4. Group blocks by blockType (handle multiple blocks per type)
  const blocksByType = new Map<string, any[]>();
  for (const doc of blockDocs) {
    const type = doc.blockType;
    if (!blocksByType.has(type)) {
      blocksByType.set(type, []);
    }
    blocksByType.get(type)!.push(doc);
  }

  // 5. Build initial blocks, converting extra blocks to items
  const initialBlocks: BlockData[] = BLOCK_DEFINITIONS.map((def) => {
    const docsForType = blocksByType.get(def.type) || [];

    if (docsForType.length === 0) {
      // No blocks for this type, return empty
      return {
        blockType: def.type as BlockType,
        content: { bmc: "", lean: "", items: [] },
        state: "calm" as const,
        aiAnalysis: null,
        confidenceScore: 0,
        riskScore: 0,
        deepDiveData: null,
        linkedSegments: [],
      };
    }

    // Use first block as the "main" block
    const mainDoc = docsForType[0];
    const content = parseContentJson(mainDoc?.contentJson);

    // Convert remaining blocks to items
    if (docsForType.length > 1) {
      console.log(`[${def.type}] Converting ${docsForType.length - 1} extra blocks to items`);

      const extraItems = docsForType.slice(1).map((doc, idx) => {
        const extraContent = parseContentJson(doc.contentJson);
        // Use the bmc content as the item name
        const name = extraContent.bmc || extraContent.lean || `Item ${idx + 1}`;
        const description = extraContent.bmc !== extraContent.lean && extraContent.lean
          ? extraContent.lean
          : "";

        return {
          id: doc.$id,
          name,
          description,
          linkedSegmentIds: [],
          linkedItemIds: [],
          createdAt: doc.$createdAt || new Date().toISOString(),
        };
      });

      content.items = [...content.items, ...extraItems];
    }

    // Relationship attributes for segments
    const linkedSegments: Segment[] = Array.isArray(mainDoc?.segments)
      ? mainDoc.segments
          .map((s: any) => normalizeSegmentRef(s, segmentById))
          .filter((s): s is Segment => s !== null)
      : [];

    return {
      blockType: def.type as BlockType,
      content,
      state: "calm" as const,
      aiAnalysis: parseAiAnalysis(mainDoc?.aiAnalysisJson),
      confidenceScore: mainDoc?.confidenceScore ?? 0,
      riskScore: mainDoc?.riskScore ?? 0,
      deepDiveData: parseDeepDiveJson(mainDoc?.deepDiveJson),
      linkedSegments,
    };
  });

  const canvasData: CanvasData = {
    $id: canvas.$id,
    title: canvas.title,
    slug: canvas.slug,
    description: canvas.description ?? "",
    isPublic: canvas.isPublic ?? false,
    users: canvas.users?.$id || canvas.users || "", // Handle relationship object or ID
  };

  return (
    <div className="canvas-page-bg text-lg">
      <CanvasClient
        canvasId={canvas.$id}
        initialCanvasData={canvasData}
        initialBlocks={initialBlocks}
        initialSegments={initialSegments}
        initialAssumptions={initialAssumptions}
      />
    </div>
  );
}
