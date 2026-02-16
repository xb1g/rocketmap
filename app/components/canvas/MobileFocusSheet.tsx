"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type {
  BlockData,
  BlockType,
  CanvasMode,
  Segment,
} from "@/lib/types/canvas";
import { BlockFocusHeader } from "./BlockFocusHeader";
import { BlockAIResults } from "./BlockAIResults";
import { BlockCard } from "./BlockCard";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";

type SheetState = "collapsed" | "expanded" | "dismissed";

interface MobileFocusSheetProps {
  blockType: BlockType;
  block: BlockData;
  mode: CanvasMode;
  canvasId: string;
  isAnalyzing: boolean;
  allBlocksFilled?: boolean;
  filledCount?: number;
  allSegments?: Segment[];
  onChange: (value: string) => void;
  onClose: () => void;
  onAnalyze: () => void;
  onDeepDive?: () => void;
  onItemCreate?: (blockType: BlockType) => void;
  onItemUpdate?: (
    blockType: BlockType,
    itemId: string,
    updates: Partial<any>,
  ) => void;
  onItemDelete?: (blockType: BlockType, itemId: string) => void;
  onItemToggleSegment?: (
    blockType: BlockType,
    itemId: string,
    segmentId: string,
  ) => void;
  chatSection?: React.ReactNode;
}

const DISMISS_VELOCITY_THRESHOLD = 0.5;
const DRAG_THRESHOLD = 50;

export function MobileFocusSheet({
  blockType,
  block,
  mode,
  isAnalyzing,
  allBlocksFilled,
  filledCount,
  allSegments,
  onChange,
  onClose,
  onAnalyze,
  onDeepDive,
  onItemCreate,
  onItemUpdate,
  onItemDelete,
  onItemToggleSegment,
  chatSection,
}: MobileFocusSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("collapsed");
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const isDragging = useRef(false);

  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  const label =
    mode === "lean" && def?.leanLabel
      ? def.leanLabel
      : def?.bmcLabel ?? blockType;
  const value = getBlockValue(block.content, blockType, mode);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
      setSheetState("collapsed");
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Wait for exit animation
    setTimeout(onClose, 300);
  }, [onClose]);

  // Touch drag handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    dragStartY.current = touch.clientY;
    dragStartTime.current = Date.now();
    isDragging.current = true;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaY = touch.clientY - dragStartY.current;
      const deltaTime = (Date.now() - dragStartTime.current) / 1000;
      const velocity = deltaTime > 0 ? deltaY / deltaTime : 0;

      if (
        deltaY > DRAG_THRESHOLD ||
        velocity > DISMISS_VELOCITY_THRESHOLD * 1000
      ) {
        // Swiped down
        if (sheetState === "expanded") {
          setSheetState("collapsed");
        } else {
          handleClose();
        }
      } else if (deltaY < -DRAG_THRESHOLD) {
        // Swiped up
        setSheetState("expanded");
      }
    },
    [sheetState, handleClose],
  );

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const sheetClassName = [
    "mobile-focus-sheet",
    isVisible ? (sheetState === "expanded" ? "is-open" : "is-collapsed") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`mobile-sheet-backdrop ${isVisible ? "is-open" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={sheetClassName}
        style={{
          height: sheetState === "expanded" ? "100vh" : "60vh",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} focus panel`}
      >
        {/* Drag handle */}
        <div
          className="mobile-sheet-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="separator"
          aria-label="Drag to resize panel"
          aria-orientation="horizontal"
        />

        {/* Sheet header */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <BlockFocusHeader
            blockType={blockType}
            mode={mode}
            state={block.state}
            confidenceScore={block.confidenceScore}
            onClose={handleClose}
          />
        </div>

        {/* Sheet content */}
        <div className="mobile-sheet-content">
          {/* NEW: Block items (cards) section */}
          {(onItemCreate ||
            (block.content.items && block.content.items.length > 0)) && (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/60">
                  Items
                </span>
                {onItemCreate && (
                  <button
                    onClick={() => onItemCreate(blockType)}
                    className="text-[10px] text-foreground-muted/50 hover:text-foreground transition-colors"
                  >
                    + Add Card
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(block.content.items ?? []).map((item) => {
                  const itemSegments = (item.linkedSegmentIds ?? [])
                    .map((id) => (allSegments ?? []).find((s) => s.$id === id))
                    .filter((s): s is Segment => s !== undefined);

                  const blockCardData = {
                    $id: item.id,
                    blockType,
                    contentJson: JSON.stringify({ text: item.name, tags: [] }),
                    confidenceScore: block.confidenceScore,
                    riskScore: 0,
                    segments: itemSegments,
                  };

                  return (
                    <BlockCard
                      key={item.id}
                      block={blockCardData}
                      allSegments={allSegments ?? []}
                      onUpdate={(id: string, updates: any) => {
                        const parsed = JSON.parse(updates.contentJson);
                        onItemUpdate?.(blockType, id, { name: parsed.text });
                      }}
                      onDelete={(id: string) => onItemDelete?.(blockType, id)}
                      onSegmentToggle={(id: string, segId: string) =>
                        onItemToggleSegment?.(blockType, id, segId)
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`ui-btn ui-btn-sm ui-btn-block font-display-small text-[11px] uppercase tracking-wider ${
                isAnalyzing
                  ? "ui-btn ui-btn-sm ui-btn-secondary glow-ai text-(--state-ai)"
                  : "ui-btn-secondary text-foreground-muted hover:text-foreground"
              }`}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
            </button>

            {(blockType === "customer_segments" ||
              blockType === "revenue_streams" ||
              blockType === "cost_structure") &&
              onDeepDive &&
              allBlocksFilled && (
                <button
                  onClick={onDeepDive}
                  className="ui-btn ui-btn-sm ui-btn-block ui-btn-secondary font-display-small text-[11px] uppercase tracking-wider text-foreground-muted hover:text-foreground"
                >
                  Deep Dive
                </button>
              )}
          </div>

          {/* Deep dive gate message */}
          {(blockType === "customer_segments" ||
            blockType === "revenue_streams" ||
            blockType === "cost_structure") &&
            onDeepDive &&
            !allBlocksFilled && (
              <div className="px-4 pb-3">
                <div className="px-3 py-2.5 font-body text-[11px] rounded-lg bg-white/2 border border-white/5 text-foreground-muted/50 leading-snug">
                  Fill all 9 blocks to unlock deep-dive research.
                  {filledCount !== undefined && (
                    <span className="ml-1 font-mono text-foreground-muted/40">
                      ({filledCount}/9)
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* AI Results */}
          <BlockAIResults analysis={block.aiAnalysis} usage={block.lastUsage} />

          {/* Expand/Collapse button */}
          <div className="px-4 py-2">
            <button
              onClick={() =>
                setSheetState(
                  sheetState === "expanded" ? "collapsed" : "expanded",
                )
              }
              className="w-full py-2 rounded-lg border border-white/8 bg-white/3 text-xs text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {sheetState === "expanded" ? "Collapse" : "Expand to Full Screen"}
            </button>
          </div>

          {/* Chat section */}
          {chatSection && (
            <div className="flex-1 min-h-[200px] flex flex-col">
              {chatSection}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
