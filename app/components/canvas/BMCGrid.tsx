"use client";

import { useRef, useCallback } from "react";
import type {
  BlockData,
  BlockItem,
  BlockType,
  CanvasMode,
  Segment,
} from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";
import { BlockCell } from "./BlockCell";
import { ConnectionOverlay, type HoveredItem } from "./ConnectionOverlay";

interface BMCGridProps {
  mode: CanvasMode;
  blocks: Map<BlockType, BlockData>;
  focusedBlock: BlockType | null;
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
  // New block handlers for multi-block architecture
  onBlockUpdate?: (blockId: string, updates: { contentJson: string }) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockSegmentToggle?: (blockId: string, segmentId: number) => void;
  onBlockHover?: (blockId: string | null) => void;
}

export function BMCGrid({
  mode,
  blocks,
  focusedBlock,
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
  onBlockUpdate,
  onBlockDelete,
  onBlockSegmentToggle,
  onBlockHover,
}: BMCGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const segmentRefs = useRef<Map<string, HTMLElement>>(new Map());

  const itemRefCallback = useCallback((key: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
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
              items={block?.content.items}
              allSegments={allSegments}
              allBlockItems={allBlockItems}
              onChange={(v) => onBlockChange(def.type, v)}
              onFocus={() => onBlockFocus(def.type)}
              onBlur={onBlockBlur}
              onExpand={() => onBlockExpand(def.type)}
              onAddToChat={() => onBlockAddToChat(def.type)}
              onAnalyze={() => onBlockAnalyze(def.type)}
              onSegmentClick={onSegmentClick}
<<<<<<< HEAD
              onAddSegment={def.type === 'customer_segments' ? onAddSegment : undefined}
              onSegmentUpdate={def.type === 'customer_segments' ? onSegmentUpdate : undefined}
              onSegmentFocus={def.type === 'customer_segments' ? onSegmentFocus : undefined}
              onItemCreate={onItemCreate && def.type !== 'customer_segments' ? () => onItemCreate(def.type) : undefined}
              onItemUpdate={onItemUpdate ? (itemId, updates) => onItemUpdate(def.type, itemId, updates) : undefined}
              onItemDelete={onItemDelete ? (itemId) => onItemDelete(def.type, itemId) : undefined}
              onItemToggleSegment={onItemToggleSegment ? (itemId, segId) => onItemToggleSegment(def.type, itemId, segId) : undefined}
              onItemToggleLink={onItemToggleLink ? (itemId, linkedId) => onItemToggleLink(def.type, itemId, linkedId) : undefined}
              onItemHover={onItemHover ? (itemId) => onItemHover(itemId ? { blockType: def.type, itemId } : null) : undefined}
              onBlockUpdate={onBlockUpdate}
              onBlockDelete={onBlockDelete}
              onBlockSegmentToggle={onBlockSegmentToggle}
              onBlockHover={onBlockHover}
=======
              onAddSegment={
                def.type === "customer_segments" ? onAddSegment : undefined
              }
              onSegmentUpdate={
                def.type === "customer_segments" ? onSegmentUpdate : undefined
              }
              onSegmentFocus={
                def.type === "customer_segments" ? onSegmentFocus : undefined
              }
              onItemCreate={
                onItemCreate && def.type !== "customer_segments"
                  ? () => onItemCreate(def.type)
                  : undefined
              }
              onItemUpdate={
                onItemUpdate
                  ? (itemId, updates) => onItemUpdate(def.type, itemId, updates)
                  : undefined
              }
              onItemDelete={
                onItemDelete
                  ? (itemId) => onItemDelete(def.type, itemId)
                  : undefined
              }
              onItemToggleSegment={
                onItemToggleSegment
                  ? (itemId, segId) =>
                      onItemToggleSegment(def.type, itemId, segId)
                  : undefined
              }
              onItemToggleLink={
                onItemToggleLink
                  ? (itemId, linkedId) =>
                      onItemToggleLink(def.type, itemId, linkedId)
                  : undefined
              }
              onItemHover={
                onItemHover
                  ? (itemId) =>
                      onItemHover(
                        itemId ? { blockType: def.type, itemId } : null,
                      )
                  : undefined
              }
>>>>>>> main
              itemRefCallback={itemRefCallback}
              segmentRefCallback={segmentRefCallback}
            />
          );
        })}
      </div>
      <ConnectionOverlay
        hoveredItem={hoveredItem}
        allBlockItems={allBlockItems}
        segments={allSegments}
        itemRefs={itemRefs}
        segmentRefs={segmentRefs}
        containerRef={containerRef}
      />
    </div>
  );
}
