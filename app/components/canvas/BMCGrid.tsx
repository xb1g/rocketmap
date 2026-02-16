"use client";

import { useRef, useCallback, useMemo } from "react";
import type {
  BlockData,
  BlockItem,
  BlockType,
  CanvasMode,
  RiskMetrics,
  Segment,
} from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";
import { BlockCell } from "./BlockCell";
import { ConnectionOverlay, type HoveredItem } from "./ConnectionOverlay";

interface BMCGridProps {
  mode: CanvasMode;
  blocks: Map<BlockType, BlockData>;
  focusedBlock: BlockType | null;
  readOnly: boolean;
  analyzingBlock: BlockType | null;
  chatTargetBlock: BlockType | null;
  dimmed: boolean;
  allSegments: Segment[];
  hoveredItem: HoveredItem | null;
  onBlockChange: (blockType: BlockType, value: string) => void;
  onBlockFocus: (blockType: BlockType) => void;
  onBlockBlur: () => void;
  onBlockExpand: (blockType: BlockType) => void;
  onBlockAddToChat: (blockType: BlockType) => void;
  onBlockAnalyze: (blockType: BlockType) => void;
  onSegmentClick?: (segmentId: string) => void;
  onAddSegment?: (name: string, description?: string) => Promise<void>;
  onSegmentUpdate?: (
    segmentId: string,
    updates: Partial<{ name: string; description: string }>,
  ) => Promise<void>;
  onSegmentFocus?: (segmentId: string) => void;
  onItemCreate?: (blockType: BlockType) => void;
  onItemUpdate?: (
    blockType: BlockType,
    itemId: string,
    updates: Partial<BlockItem>,
  ) => void;
  onItemDelete?: (blockType: BlockType, itemId: string) => void;
  onItemToggleSegment?: (
    blockType: BlockType,
    itemId: string,
    segmentId: string,
  ) => void;
  onItemToggleLink?: (
    blockType: BlockType,
    itemId: string,
    linkedItemId: string,
  ) => void;
  onItemHover?: (hoveredItem: HoveredItem | null) => void;
  riskHeatmap?: Record<BlockType, RiskMetrics> | null;
}

export function BMCGrid({
  mode,
  blocks,
  focusedBlock,
  readOnly,
  analyzingBlock,
  chatTargetBlock,
  dimmed,
  allSegments,
  hoveredItem,
  onBlockChange,
  onBlockFocus,
  onBlockBlur,
  onBlockExpand,
  onBlockAddToChat,
  onBlockAnalyze,
  onSegmentClick,
  onAddSegment,
  onSegmentUpdate,
  onSegmentFocus,
  onItemCreate,
  onItemUpdate,
  onItemDelete,
  onItemToggleSegment,
  onItemToggleLink,
  onItemHover,
  riskHeatmap,
}: BMCGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());
  const segmentRefs = useRef<Map<string, HTMLElement>>(new Map());

  const blockRefCallback = useCallback((key: string, el: HTMLElement | null) => {
    if (el) blockRefs.current.set(key, el);
    else blockRefs.current.delete(key);
  }, []);

  const segmentRefCallback = useCallback(
    (segId: string, el: HTMLElement | null) => {
      if (el) segmentRefs.current.set(segId, el);
      else segmentRefs.current.delete(segId);
    },
    [],
  );

  // Collect all block items for the LinkPicker
  const allBlockItems = new Map<BlockType, BlockItem[]>();
  for (const [bt, block] of blocks) {
    const items = block.content.items ?? [];
    if (items.length > 0) allBlockItems.set(bt, items);
  }

  return (
    <div className="relative flex-1 min-h-0" ref={containerRef}>
      <div
        className={`bmc-grid ${dimmed ? "opacity-40 pointer-events-none" : ""}`}
        style={{ transition: "opacity 300ms ease" }}
      >
        {BLOCK_DEFINITIONS.map((def) => {
          const block = blocks.get(def.type);
          const value = block
            ? getBlockValue(block.content, def.type, mode)
            : "";

          // Adapt items → blocks prop for BlockCard rendering
          const items = block?.content.items ?? [];
          const segmentById = new Map(allSegments.map(s => [s.$id, s]));
          const blockCards = items.map((item) => {
            // Resolve item-level linkedSegmentIds to full Segment objects
            const itemSegments = (item.linkedSegmentIds ?? [])
              .map(id => segmentById.get(id))
              .filter((s): s is Segment => s !== undefined);
            return {
              $id: item.id,
              blockType: def.type,
              contentJson: JSON.stringify({ text: item.name, tags: [] }),
              confidenceScore: block?.confidenceScore ?? 0,
              riskScore: 0,
              segments: itemSegments,
              state: block?.state ?? ("calm" as const),
            };
          });

          return (
            <BlockCell
              key={def.type}
              definition={def}
              mode={mode}
              value={value}
              state={block?.state ?? "calm"}
              isFocused={focusedBlock === def.type}
              isAnalyzing={analyzingBlock === def.type}
              isChatTarget={chatTargetBlock === def.type}
              confidenceScore={block?.confidenceScore ?? 0}
              hasAnalysis={!!block?.aiAnalysis}
              linkedSegments={block?.linkedSegments}
              blocks={blockCards.length > 0 ? blockCards : undefined}
              allSegments={allSegments}
              allBlockItems={allBlockItems}
              readOnly={readOnly}
              onChange={(v) => onBlockChange(def.type, v)}
              onFocus={() => onBlockFocus(def.type)}
              onBlur={onBlockBlur}
              onExpand={() => onBlockExpand(def.type)}
              onAddToChat={() => onBlockAddToChat(def.type)}
              onAnalyze={() => onBlockAnalyze(def.type)}
              onSegmentClick={onSegmentClick}
              onAddSegment={
                def.type === "customer_segments" ? onAddSegment : undefined
              }
              onSegmentUpdate={
                def.type === "customer_segments" ? onSegmentUpdate : undefined
              }
              onSegmentFocus={
                def.type === "customer_segments" ? onSegmentFocus : undefined
              }
              onBlockCreate={
                onItemCreate && def.type !== "customer_segments"
                  ? () => onItemCreate(def.type)
                  : undefined
              }
              onBlockUpdate={
                onItemUpdate
                  ? (blockId, updates) => {
                      const parsed = JSON.parse(updates.contentJson);
                      onItemUpdate(def.type, blockId, { name: parsed.text });
                    }
                  : undefined
              }
              onBlockDelete={
                onItemDelete
                  ? (blockId) => onItemDelete(def.type, blockId)
                  : undefined
              }
              onBlockToggleSegment={
                onItemToggleSegment
                  ? (blockId, segId) =>
                      onItemToggleSegment(def.type, blockId, segId)
                  : undefined
              }
              onBlockHover={
                onItemHover
                  ? (blockId) =>
                      onItemHover(
                        blockId ? { blockType: def.type, itemId: blockId } : null,
                      )
                  : undefined
              }
              blockRefCallback={blockRefCallback}
              segmentRefCallback={segmentRefCallback}
              riskMetrics={riskHeatmap?.[def.type]}
            />
          );
        })}
      </div>
      <ConnectionOverlay
        hoveredItem={hoveredItem}
        allBlockItems={allBlockItems}
        segments={allSegments}
        itemRefs={blockRefs}
        segmentRefs={segmentRefs}
        containerRef={containerRef}
      />
    </div>
  );
}
