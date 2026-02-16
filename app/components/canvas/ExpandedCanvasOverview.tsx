"use client";

import { useMemo } from "react";
import type {
  BlockType,
  BlockData,
  BlockItem,
  CanvasMode,
  Segment,
  MarketResearchData,
} from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";
import { SEGMENT_COLORS } from "@/lib/types/canvas";

// ─── Block Icons (inline SVGs matching BlockCell) ────────────────────────────

function BlockIcon({ type, size = 14 }: { type: BlockType; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "key_partnerships":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1" />
        </svg>
      );
    case "key_activities":
      return (
        <svg {...common}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      );
    case "key_resources":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "value_prop":
      return (
        <svg {...common}>
          <path d="m12 3 1.7 4.4L18 9.1l-4.3 1.7L12 15l-1.7-4.2L6 9.1l4.3-1.7L12 3z" />
        </svg>
      );
    case "customer_relationships":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "channels":
      return (
        <svg {...common}>
          <path d="M3 11v2a4 4 0 0 0 4 4h2" />
          <path d="M3 7v2a8 8 0 0 0 8 8h2" />
          <path d="M3 3v2a12 12 0 0 0 12 12h2" />
        </svg>
      );
    case "customer_segments":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16" cy="9.5" r="2" />
          <path d="M4.5 20a5 5 0 0 1 9 0" />
          <path d="M14 20a4 4 0 0 1 6 0" />
        </svg>
      );
    case "cost_structure":
      return (
        <svg {...common}>
          <path d="M3 7h18v10H3z" />
          <path d="M7 11h10" />
          <path d="M9 15h3" />
        </svg>
      );
    case "revenue_streams":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 15v-3" />
          <path d="M12 15V9" />
          <path d="M17 15V6" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ExpandedCanvasOverviewProps {
  blocks: Map<BlockType, BlockData>;
  mode: CanvasMode;
  expandedBlock: BlockType;
  segments: Segment[];
  canvasId: string;
  readOnly: boolean;
  highlightedSegmentId?: string | null;
  onBlockSelect: (blockType: BlockType) => void;
  onSegmentHover?: (segmentId: string | null) => void;
  onDeepDiveDataChange?: (
    blockType: BlockType,
    data: MarketResearchData,
  ) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpandedCanvasOverview({
  blocks,
  mode,
  expandedBlock,
  segments,
  onBlockSelect,
}: ExpandedCanvasOverviewProps) {
  const blockData = blocks.get(expandedBlock);
  const items = blockData?.content?.items ?? [];
  const def = BLOCK_DEFINITIONS.find((d) => d.type === expandedBlock);
  const label =
    mode === "lean" && def?.leanLabel ? def.leanLabel : (def?.bmcLabel ?? "");

  const segmentMap = useMemo(
    () => new Map(segments.map((s) => [s.$id, s])),
    [segments],
  );

  // Linked segments for this block
  const linkedSegments = blockData?.linkedSegments ?? [];

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header with block name */}
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg border border-[var(--chroma-indigo)]/30 bg-[var(--chroma-indigo)]/10 text-[var(--chroma-indigo)] inline-flex items-center justify-center shrink-0">
          <BlockIcon type={expandedBlock} size={16} />
        </span>
        <h2 className="font-display-small text-sm uppercase tracking-wider text-foreground">
          {label}
        </h2>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] font-mono text-foreground-muted/50">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Segment pills for this block */}
      {linkedSegments.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {linkedSegments.map((seg) => (
            <span
              key={seg.$id}
              className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border border-white/8 text-foreground-muted/70"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: seg.colorHex || SEGMENT_COLORS[0] }}
              />
              {seg.name}
            </span>
          ))}
        </div>
      )}

      {/* Items list — the main content */}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <ItemRow
              key={`${item.id}-${idx}`}
              item={item}
              segmentMap={segmentMap}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/8 p-8 text-center">
          <p className="text-sm text-foreground-muted/40">
            No items yet. Add items from the side panel.
          </p>
        </div>
      )}

      {/* Other blocks — compact nav to switch */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/40">
            Other blocks
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BLOCK_DEFINITIONS.filter((d) => d.type !== expandedBlock).map(
            (d) => {
              const bd = blocks.get(d.type);
              const count = bd?.content?.items?.length ?? 0;
              const bLabel =
                mode === "lean" && d.leanLabel ? d.leanLabel : d.bmcLabel;
              return (
                <button
                  key={d.type}
                  onClick={() => onBlockSelect(d.type)}
                  className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 text-foreground-muted/60 hover:text-foreground-muted transition-all"
                >
                  <BlockIcon type={d.type} size={11} />
                  <span>{bLabel}</span>
                  {count > 0 && (
                    <span className="text-[9px] text-foreground-muted/40">
                      {count}
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Single item row ─────────────────────────────────────────────────────────

function ItemRow({
  item,
  segmentMap,
}: {
  item: BlockItem;
  segmentMap: Map<string, Segment>;
}) {
  const itemSegments = (item.linkedSegmentIds ?? [])
    .map((id) => segmentMap.get(id))
    .filter((s): s is Segment => s !== undefined);

  const linkedItems = item.linkedItemIds ?? [];
  const tags = item.tags ?? [];

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3.5 space-y-2 hover:border-white/12 transition-colors">
      {/* Item name */}
      <p className="text-[13px] text-foreground leading-snug">{item.name}</p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-foreground-muted/60"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: segments + link count */}
      {(itemSegments.length > 0 || linkedItems.length > 0) && (
        <div className="flex items-center gap-2 pt-0.5">
          {/* Segment pills */}
          {itemSegments.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {itemSegments.map((seg) => (
                <span
                  key={seg.$id}
                  className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border border-white/8 text-foreground-muted/50"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: seg.colorHex || SEGMENT_COLORS[0] }}
                  />
                  {seg.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Link count */}
          {linkedItems.length > 0 && (
            <span className="text-[9px] text-foreground-muted/40 flex items-center gap-0.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1" />
                <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1" />
              </svg>
              {linkedItems.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
