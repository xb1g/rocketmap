"use client";

import { useState } from "react";
import type { BlockData, BlockType, Segment } from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "./constants";

interface DebugPanelProps {
  blocks: Map<BlockType, BlockData>;
  segments: Segment[];
}

type ViewMode = "blocks" | "segments" | "relations" | "raw";

export function DebugPanel({ blocks, segments }: DebugPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("blocks");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<BlockType>>(
    new Set(),
  );

  const toggleBlockExpanded = (blockType: BlockType) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockType)) {
        next.delete(blockType);
      } else {
        next.add(blockType);
      }
      return next;
    });
  };

  const renderBlocksView = () => {
    return (
      <div className="space-y-3">
        {BLOCK_DEFINITIONS.map((def) => {
          const block = blocks.get(def.type);
          const isExpanded = expandedBlocks.has(def.type);

          return (
            <div
              key={def.type}
              className="bg-white/[0.03] border border-white/8 rounded-lg p-4"
            >
              <button
                onClick={() => toggleBlockExpanded(def.type)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold text-white">
                    {def.bmcLabel}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-foreground-muted">
                    {def.type}
                  </span>
                </div>
                <span className="text-foreground-muted text-sm">
                  {isExpanded ? "▼" : "▶"}
                </span>
              </button>

              {isExpanded && block && (
                <div className="mt-4 space-y-3 text-sm">
                  {/* Content */}
                  <div>
                    <div className="font-mono text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                      Content
                    </div>
                    <div className="bg-black/20 rounded p-2 space-y-1">
                      <div>
                        <span className="text-chroma-indigo">BMC:</span>{" "}
                        <span className="text-foreground-muted">
                          {block.content.bmc || "(empty)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-chroma-cyan">Lean:</span>{" "}
                        <span className="text-foreground-muted">
                          {block.content.lean || "(empty)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  {block.content.items && block.content.items.length > 0 && (
                    <div>
                      <div className="font-mono text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                        Items ({block.content.items.length})
                      </div>
                      <div className="space-y-2">
                        {block.content.items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-black/20 rounded p-2 space-y-1"
                          >
                            <div className="font-semibold text-white">
                              {item.name}
                            </div>
                            {item.linkedSegmentIds.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                <span className="text-[10px] text-foreground-muted">
                                  Segments:
                                </span>
                                {item.linkedSegmentIds.map((segId) => {
                                  const seg = segments.find(
                                    (s) => s.$id === segId,
                                  );
                                  return (
                                    <span
                                      key={segId}
                                      className="text-[10px] px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: seg?.colorHex
                                          ? `${seg.colorHex}20`
                                          : "rgba(99, 102, 241, 0.15)",
                                        color: seg?.colorHex || "#6366f1",
                                      }}
                                    >
                                      {seg?.name || segId.slice(0, 8)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {item.linkedItemIds.length > 0 && (
                              <div className="text-[10px] text-foreground-muted">
                                Linked to: {item.linkedItemIds.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Segments */}
                  {block.linkedSegments && block.linkedSegments.length > 0 && (
                    <div>
                      <div className="font-mono text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                        Linked Segments ({block.linkedSegments.length})
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {block.linkedSegments.map((seg) => (
                          <span
                            key={seg.$id}
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: seg.colorHex
                                ? `${seg.colorHex}20`
                                : "rgba(99, 102, 241, 0.15)",
                              color: seg.colorHex || "#6366f1",
                            }}
                          >
                            {seg.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-black/20 rounded p-2">
                      <div className="text-foreground-muted">State</div>
                      <div className="font-semibold text-white">
                        {block.state}
                      </div>
                    </div>
                    <div className="bg-black/20 rounded p-2">
                      <div className="text-foreground-muted">Confidence</div>
                      <div className="font-semibold text-white">
                        {(block.confidenceScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-black/20 rounded p-2">
                      <div className="text-foreground-muted">Risk</div>
                      <div className="font-semibold text-white">
                        {(block.riskScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {block.aiAnalysis && (
                    <div>
                      <div className="font-mono text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                        AI Analysis
                      </div>
                      <div className="bg-black/20 rounded p-2 space-y-2 text-xs">
                        {block.aiAnalysis.assumptions.length > 0 && (
                          <div>
                            <span className="text-chroma-amber">
                              Assumptions:
                            </span>{" "}
                            {block.aiAnalysis.assumptions.length}
                          </div>
                        )}
                        {block.aiAnalysis.risks.length > 0 && (
                          <div>
                            <span className="text-state-critical">Risks:</span>{" "}
                            {block.aiAnalysis.risks.length}
                          </div>
                        )}
                        {block.aiAnalysis.questions.length > 0 && (
                          <div>
                            <span className="text-chroma-cyan">
                              Questions:
                            </span>{" "}
                            {block.aiAnalysis.questions.length}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cards (from cards collection) */}
                  {block.cards && block.cards.length > 0 && (
                    <div>
                      <div className="font-mono text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                        Cards Collection ({block.cards.length})
                      </div>
                      <div className="space-y-2">
                        {block.cards.map((card) => (
                          <div
                            key={card.$id}
                            className="bg-black/20 rounded p-2 space-y-1"
                          >
                            <div className="font-semibold text-white text-sm">
                              {card.name}
                            </div>
                            <div className="text-[10px] text-foreground-muted">
                              Order: {card.order} | ID: {card.$id.slice(0, 8)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deep Dive Data */}
                  {block.deepDiveData && (
                    <div>
                      <div className="font-mono text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                        Deep Dive Data
                      </div>
                      <div className="bg-black/20 rounded p-2 text-xs text-foreground-muted">
                        {Object.keys(block.deepDiveData).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSegmentsView = () => {
    return (
      <div className="space-y-3">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-foreground-muted">
            No segments defined yet
          </div>
        ) : (
          segments.map((seg) => (
            <div
              key={seg.$id}
              className="bg-white/[0.03] border border-white/8 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: seg.colorHex || "#6366f1" }}
                />
                <span className="font-display font-semibold text-white">
                  {seg.name}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-foreground-muted">
                  {seg.$id.slice(0, 8)}
                </span>
                {seg.earlyAdopterFlag && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-state-healthy/20 text-state-healthy">
                    Early Adopter
                  </span>
                )}
              </div>

              {seg.description && (
                <div className="text-sm text-foreground-muted mb-3">
                  {seg.description}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/20 rounded p-2">
                  <div className="text-foreground-muted">Priority Score</div>
                  <div className="font-semibold text-white">
                    {seg.priorityScore}
                  </div>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <div className="text-foreground-muted">Estimated Size</div>
                  <div className="font-semibold text-white">
                    {seg.estimatedSize || "N/A"}
                  </div>
                </div>
              </div>

              {(seg.demographics ||
                seg.psychographics ||
                seg.behavioral ||
                seg.geographic) && (
                <div className="mt-3 space-y-2 text-xs">
                  {seg.demographics && (
                    <div>
                      <span className="text-chroma-indigo">Demographics:</span>{" "}
                      <span className="text-foreground-muted">
                        {seg.demographics}
                      </span>
                    </div>
                  )}
                  {seg.psychographics && (
                    <div>
                      <span className="text-chroma-pink">Psychographics:</span>{" "}
                      <span className="text-foreground-muted">
                        {seg.psychographics}
                      </span>
                    </div>
                  )}
                  {seg.behavioral && (
                    <div>
                      <span className="text-chroma-cyan">Behavioral:</span>{" "}
                      <span className="text-foreground-muted">
                        {seg.behavioral}
                      </span>
                    </div>
                  )}
                  {seg.geographic && (
                    <div>
                      <span className="text-chroma-amber">Geographic:</span>{" "}
                      <span className="text-foreground-muted">
                        {seg.geographic}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRelationsView = () => {
    const relations: Array<{
      blockType: BlockType;
      blockLabel: string;
      segments: Segment[];
      items: Array<{ name: string; segments: Segment[] }>;
    }> = [];

    BLOCK_DEFINITIONS.forEach((def) => {
      const block = blocks.get(def.type);
      if (!block) return;

      const blockSegments = block.linkedSegments || [];
      const itemsWithSegments =
        block.content.items
          ?.filter((item) => item.linkedSegmentIds.length > 0)
          .map((item) => ({
            name: item.name,
            segments: item.linkedSegmentIds
              .map((segId) => segments.find((s) => s.$id === segId))
              .filter((s): s is Segment => s !== undefined),
          })) || [];

      if (blockSegments.length > 0 || itemsWithSegments.length > 0) {
        relations.push({
          blockType: def.type,
          blockLabel: def.bmcLabel,
          segments: blockSegments,
          items: itemsWithSegments,
        });
      }
    });

    return (
      <div className="space-y-3">
        {relations.length === 0 ? (
          <div className="text-center py-12 text-foreground-muted">
            No block-segment relations defined yet
          </div>
        ) : (
          relations.map((rel) => (
            <div
              key={rel.blockType}
              className="bg-white/[0.03] border border-white/8 rounded-lg p-4"
            >
              <div className="font-display font-semibold text-white mb-3">
                {rel.blockLabel}
              </div>

              {rel.segments.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                    Block-Level Segments
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {rel.segments.map((seg) => (
                      <span
                        key={seg.$id}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: seg.colorHex
                            ? `${seg.colorHex}20`
                            : "rgba(99, 102, 241, 0.15)",
                          color: seg.colorHex || "#6366f1",
                        }}
                      >
                        {seg.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rel.items.length > 0 && (
                <div>
                  <div className="text-[10px] text-foreground-muted uppercase tracking-wider mb-1">
                    Item-Level Segments
                  </div>
                  <div className="space-y-2">
                    {rel.items.map((item, idx) => (
                      <div key={idx} className="bg-black/20 rounded p-2">
                        <div className="text-sm text-white mb-1">
                          {item.name}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {item.segments.map((seg) => (
                            <span
                              key={seg.$id}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: seg.colorHex
                                  ? `${seg.colorHex}20`
                                  : "rgba(99, 102, 241, 0.15)",
                                color: seg.colorHex || "#6366f1",
                              }}
                            >
                              {seg.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRawView = () => {
    const data = {
      blocks: Array.from(blocks.entries()).map(([type, block]) => ({
        type,
        ...block,
      })),
      segments,
    };

    return (
      <div className="bg-black/40 rounded-lg p-4">
        <pre className="text-xs text-foreground-muted overflow-x-auto font-mono whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-none border-b border-white/8 bg-canvas-surface/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Debug Panel
              </h2>
              <p className="text-sm text-foreground-muted mt-1">
                Development tool for inspecting canvas data
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("blocks")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "blocks"
                    ? "bg-chroma-indigo text-white"
                    : "bg-white/5 text-foreground-muted hover:bg-white/10"
                }`}
              >
                Blocks
              </button>
              <button
                onClick={() => setViewMode("segments")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "segments"
                    ? "bg-chroma-indigo text-white"
                    : "bg-white/5 text-foreground-muted hover:bg-white/10"
                }`}
              >
                Segments
              </button>
              <button
                onClick={() => setViewMode("relations")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "relations"
                    ? "bg-chroma-indigo text-white"
                    : "bg-white/5 text-foreground-muted hover:bg-white/10"
                }`}
              >
                Relations
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "raw"
                    ? "bg-chroma-indigo text-white"
                    : "bg-white/5 text-foreground-muted hover:bg-white/10"
                }`}
              >
                Raw JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {viewMode === "blocks" && renderBlocksView()}
          {viewMode === "segments" && renderSegmentsView()}
          {viewMode === "relations" && renderRelationsView()}
          {viewMode === "raw" && renderRawView()}
        </div>
      </div>
    </div>
  );
}
