"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type {
  BlockData,
  BlockItem,
  BlockType,
  CanvasMode,
  Segment,
} from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";
import { BlockCell } from "./BlockCell";

interface Section {
  id: "left" | "center" | "right";
  blocks: BlockType[];
  title: string;
}

const SECTIONS: Section[] = [
  {
    id: "left",
    blocks: ["key_partnerships", "key_activities", "key_resources"],
    title: "Resources",
  },
  {
    id: "center",
    blocks: ["value_prop"],
    title: "Value",
  },
  {
    id: "right",
    blocks: [
      "customer_segments",
      "channels",
      "customer_relationships",
      "revenue_streams",
      "cost_structure",
    ],
    title: "Customers",
  },
];

interface MobileCanvasCarouselProps {
  mode: CanvasMode;
  blocks: Map<BlockType, BlockData>;
  focusedBlock: BlockType | null;
  analyzingBlock: BlockType | null;
  chatTargetBlock: BlockType | null;
  allSegments: Segment[];
  onBlockChange: (blockType: BlockType, value: string) => void;
  onBlockFocus: (blockType: BlockType) => void;
  onBlockBlur: () => void;
  onBlockTap: (blockType: BlockType) => void;
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
}

export function MobileCanvasCarousel({
  mode,
  blocks,
  focusedBlock,
  analyzingBlock,
  chatTargetBlock,
  allSegments,
  onBlockChange,
  onBlockFocus,
  onBlockBlur,
  onBlockTap,
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
}: MobileCanvasCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(1); // Start at VP (center)

  // Collect all block items for LinkPicker
  const allBlockItems = new Map<BlockType, BlockItem[]>();
  for (const [bt, block] of blocks) {
    const items = block.content.items ?? [];
    if (items.length > 0) allBlockItems.set(bt, items);
  }

  // Scroll to initial section (VP center) on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Use requestAnimationFrame to ensure layout is ready
    requestAnimationFrame(() => {
      el.scrollTo({ left: el.clientWidth, behavior: "instant" });
    });
  }, []);

  // Track scroll position to update indicators
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const sectionWidth = el.clientWidth;
      if (sectionWidth === 0) return;
      const index = Math.round(el.scrollLeft / sectionWidth);
      setCurrentSection(Math.min(2, Math.max(0, index)));
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * index, behavior: "smooth" });
  }, []);

  return (
    <div className="mobile-carousel-container flex-1 min-h-0">
      {/* Section indicators */}
      <div
        className="mobile-section-indicators"
        role="tablist"
        aria-label="Canvas sections"
      >
        {SECTIONS.map((section, i) => (
          <button
            key={section.id}
            className={`mobile-section-indicator ${currentSection === i ? "active" : ""}`}
            onClick={() => scrollToSection(i)}
            role="tab"
            aria-selected={currentSection === i}
            aria-label={`${section.title} section (${i + 1} of 3)`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* Scrollable carousel */}
      <div
        className="mobile-carousel-scroll"
        ref={scrollRef}
        role="tabpanel"
        aria-label={`${SECTIONS[currentSection]?.title ?? ""} section`}
      >
        {SECTIONS.map((section) => (
          <div className="mobile-carousel-section" key={section.id}>
            {section.blocks.map((blockType) => {
              const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
              if (!def) return null;
              const block = blocks.get(blockType);
              const value = block
                ? getBlockValue(block.content, blockType, mode)
                : "";

              return (
                <div
                  key={blockType}
                  className={`mobile-block-cell ${focusedBlock === blockType ? "mobile-focused-block" : ""}`}
                  onClick={() => onBlockTap(blockType)}
                >
                  <BlockCell
                    definition={def}
                    mode={mode}
                    value={value}
                    state={block?.state ?? "calm"}
                    isFocused={focusedBlock === blockType}
                    isAnalyzing={analyzingBlock === blockType}
                    isChatTarget={chatTargetBlock === blockType}
                    confidenceScore={block?.confidenceScore ?? 0}
                    hasAnalysis={!!block?.aiAnalysis}
                    linkedSegments={block?.linkedSegments}
                    items={block?.content.items}
                    allSegments={allSegments}
                    allBlockItems={allBlockItems}
                    onChange={(v) => onBlockChange(blockType, v)}
                    onFocus={() => onBlockFocus(blockType)}
                    onBlur={onBlockBlur}
                    onExpand={() => onBlockTap(blockType)}
                    onAddToChat={() => onBlockAddToChat(blockType)}
                    onAnalyze={() => onBlockAnalyze(blockType)}
                    onSegmentClick={onSegmentClick}
                    onAddSegment={
                      blockType === "customer_segments"
                        ? onAddSegment
                        : undefined
                    }
                    onSegmentUpdate={
                      blockType === "customer_segments"
                        ? onSegmentUpdate
                        : undefined
                    }
                    onSegmentFocus={
                      blockType === "customer_segments"
                        ? onSegmentFocus
                        : undefined
                    }
                    onItemCreate={
                      onItemCreate && blockType !== "customer_segments"
                        ? () => onItemCreate(blockType)
                        : undefined
                    }
                    onItemUpdate={
                      onItemUpdate
                        ? (itemId, updates) =>
                            onItemUpdate(blockType, itemId, updates)
                        : undefined
                    }
                    onItemDelete={
                      onItemDelete
                        ? (itemId) => onItemDelete(blockType, itemId)
                        : undefined
                    }
                    onItemToggleSegment={
                      onItemToggleSegment
                        ? (itemId, segId) =>
                            onItemToggleSegment(blockType, itemId, segId)
                        : undefined
                    }
                    onItemToggleLink={
                      onItemToggleLink
                        ? (itemId, linkedId) =>
                            onItemToggleLink(blockType, itemId, linkedId)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
