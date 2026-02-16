"use client";

import { useMemo, useState } from "react";
import type {
  BlockType,
  BlockData,
  CanvasMode,
  Segment,
  MarketResearchData,
} from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";
import { SEGMENT_COLORS } from "@/lib/types/canvas";

// ─── Block Icons (inline SVGs matching BlockCell) ────────────────────────────

function BlockIcon({ type }: { type: BlockType }) {
  const common = {
    width: 14,
    height: 14,
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
  onDeepDiveDataChange?: (blockType: BlockType, data: MarketResearchData) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpandedCanvasOverview({
  blocks,
  mode,
  expandedBlock,
  segments,
  highlightedSegmentId: externalHighlight,
  onBlockSelect,
  onSegmentHover: externalSegmentHover,
}: ExpandedCanvasOverviewProps) {
  const [internalHighlight, setInternalHighlight] = useState<string | null>(null);
  const highlightedSegmentId = externalHighlight ?? internalHighlight;
  const handleSegmentHover = externalSegmentHover ?? setInternalHighlight;

  const segmentMap = useMemo(
    () => new Map(segments.map((s) => [s.$id, s])),
    [segments],
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/70">
          Canvas Overview
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Block cards grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {BLOCK_DEFINITIONS.map((def) => {
          const blockData = blocks.get(def.type);
          const isActive = def.type === expandedBlock;
          const label =
            mode === "lean" && def.leanLabel ? def.leanLabel : def.bmcLabel;

          return (
            <OverviewCard
              key={def.type}
              blockType={def.type}
              label={label}
              blockData={blockData}
              mode={mode}
              isActive={isActive}
              segmentMap={segmentMap}
              highlightedSegmentId={highlightedSegmentId}
              onClick={() => onBlockSelect(def.type)}
              onSegmentHover={handleSegmentHover}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Card for a single block ─────────────────────────────────────────────────

function OverviewCard({
  blockType,
  label,
  blockData,
  mode,
  isActive,
  segmentMap,
  highlightedSegmentId,
  onClick,
  onSegmentHover,
}: {
  blockType: BlockType;
  label: string;
  blockData: BlockData | undefined;
  mode: CanvasMode;
  isActive: boolean;
  segmentMap: Map<string, Segment>;
  highlightedSegmentId?: string | null;
  onClick: () => void;
  onSegmentHover?: (segmentId: string | null) => void;
}) {
  const items = blockData?.content?.items ?? [];
  const linkedSegments = blockData?.linkedSegments ?? [];
  const analysis = blockData?.aiAnalysis;
  const confidence = blockData?.confidenceScore ?? 0;
  const hasContent =
    (getBlockValue(blockData?.content ?? { bmc: "", lean: "", items: [] }, blockType, mode)?.length ?? 0) > 0 ||
    items.length > 0;

  const assumptionCount = analysis?.assumptions?.length ?? 0;
  const riskCount = analysis?.risks?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-lg border transition-all duration-200 p-3 space-y-2 ${
        isActive
          ? "border-[var(--chroma-indigo)]/50 bg-[var(--chroma-indigo)]/[0.06] shadow-[0_0_12px_rgba(99,102,241,0.12)]"
          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/12"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span
          className={`w-5 h-5 rounded-md border inline-flex items-center justify-center shrink-0 ${
            isActive
              ? "border-[var(--chroma-indigo)]/30 bg-[var(--chroma-indigo)]/10 text-[var(--chroma-indigo)]"
              : "border-white/12 bg-white/5 text-foreground-muted/70"
          }`}
        >
          <BlockIcon type={blockType} />
        </span>
        <span
          className={`font-display-small text-[11px] uppercase tracking-wider truncate ${
            isActive ? "text-[var(--chroma-indigo)]" : "text-foreground-muted"
          }`}
        >
          {label}
        </span>

        <div className="flex-1" />

        {/* Confidence dot */}
        {analysis && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background:
                confidence >= 0.7
                  ? "var(--state-healthy)"
                  : confidence >= 0.4
                    ? "var(--state-warning)"
                    : "var(--state-critical)",
            }}
            title={`${Math.round(confidence * 100)}% confidence`}
          />
        )}

        {/* Active indicator */}
        {isActive && (
          <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-px rounded-full bg-[var(--chroma-indigo)]/15 text-[var(--chroma-indigo)] border border-[var(--chroma-indigo)]/20">
            Open
          </span>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-0.5">
          {items.slice(0, 5).map((item) => {
            const itemSegIds = item.linkedSegmentIds ?? [];
            return (
              <div
                key={item.id}
                className="flex items-start gap-1.5 text-[10px] text-foreground/70 leading-snug"
              >
                <span className="text-foreground-muted/30 mt-px shrink-0">
                  &bull;
                </span>
                <span className="truncate flex-1">{item.name}</span>
                {/* Tiny segment dots on items */}
                {itemSegIds.length > 0 && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    {itemSegIds.slice(0, 3).map((segId) => {
                      const seg = segmentMap.get(segId);
                      if (!seg) return null;
                      const isHighlighted = highlightedSegmentId === segId;
                      return (
                        <span
                          key={segId}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                            isHighlighted ? "ring-1 ring-white/40 scale-125" : ""
                          }`}
                          style={{
                            background: seg.colorHex || SEGMENT_COLORS[0],
                          }}
                          title={seg.name}
                          onMouseEnter={() => onSegmentHover?.(segId)}
                          onMouseLeave={() => onSegmentHover?.(null)}
                        />
                      );
                    })}
                  </span>
                )}
              </div>
            );
          })}
          {items.length > 5 && (
            <span className="text-[9px] text-foreground-muted/40 pl-3">
              +{items.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasContent && items.length === 0 && (
        <p className="text-[10px] text-foreground-muted/30 italic">
          No content yet
        </p>
      )}

      {/* Segment pills */}
      {linkedSegments.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {linkedSegments.slice(0, 4).map((seg) => {
            const isHighlighted = highlightedSegmentId === seg.$id;
            return (
              <span
                key={seg.$id}
                className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full border transition-all ${
                  isHighlighted
                    ? "border-white/25 bg-white/10 text-foreground/90"
                    : "border-white/8 text-foreground-muted/60"
                }`}
                onMouseEnter={() => onSegmentHover?.(seg.$id)}
                onMouseLeave={() => onSegmentHover?.(null)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: seg.colorHex || SEGMENT_COLORS[0] }}
                />
                {seg.name}
              </span>
            );
          })}
          {linkedSegments.length > 4 && (
            <span className="text-[8px] text-foreground-muted/40">
              +{linkedSegments.length - 4}
            </span>
          )}
        </div>
      )}

      {/* AI analysis counts */}
      {analysis && (assumptionCount > 0 || riskCount > 0) && (
        <div className="flex items-center gap-2 pt-0.5">
          {assumptionCount > 0 && (
            <span className="text-[9px] text-foreground-muted/50">
              {assumptionCount} assumption{assumptionCount !== 1 ? "s" : ""}
            </span>
          )}
          {riskCount > 0 && (
            <span className="text-[9px] text-[var(--state-warning)]/70">
              {riskCount} risk{riskCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
