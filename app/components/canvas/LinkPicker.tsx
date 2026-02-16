"use client";

import { useState, useRef, useEffect } from "react";
import type { BlockItem, BlockType, Segment } from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "./constants";

interface LinkPickerProps {
  item: BlockItem;
  blockType: BlockType;
  segments: Segment[];
  allBlockItems: Map<BlockType, BlockItem[]>;
  anchorRef: React.RefObject<HTMLElement | null>;
  onToggleSegment: (segmentId: string) => void;
  onToggleItem: (linkedItemId: string) => void;
  onClose: () => void;
}

export function LinkPicker({
  item,
  blockType,
  segments,
  allBlockItems,
  anchorRef,
  onToggleSegment,
  onToggleItem,
  onClose,
}: LinkPickerProps) {
  const [tab, setTab] = useState<"segments" | "blocks">("segments");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const otherBlocks = BLOCK_DEFINITIONS.filter((d) => d.type !== blockType);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 w-52 rounded-lg border border-white/12 bg-[#1a1a1f] shadow-xl shadow-black/40"
      style={{ bottom: "100%", left: 0, marginBottom: 4 }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-white/8">
        <button
          onClick={() => setTab("segments")}
          className={`flex-1 text-[9px] py-1.5 transition-colors ${
            tab === "segments"
              ? "text-foreground border-b border-indigo-400"
              : "text-foreground-muted/50 hover:text-foreground-muted"
          }`}
        >
          Segments
        </button>
        <button
          onClick={() => setTab("blocks")}
          className={`flex-1 text-[9px] py-1.5 transition-colors ${
            tab === "blocks"
              ? "text-foreground border-b border-indigo-400"
              : "text-foreground-muted/50 hover:text-foreground-muted"
          }`}
        >
          Blocks
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
        {tab === "segments" && (
          <>
            {segments.length === 0 && (
              <p className="text-[9px] text-foreground-muted/40 px-1 py-2 text-center">
                No segments yet
              </p>
            )}
            {segments.map((seg) => {
              const isLinked = item.linkedSegmentIds.includes(seg.$id);
              return (
                <button
                  key={seg.$id}
                  onClick={() => onToggleSegment(seg.$id)}
                  className={`flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded transition-colors ${
                    isLinked
                      ? "bg-white/8 text-foreground"
                      : "text-foreground-muted/70 hover:bg-white/5 hover:text-foreground-muted"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: seg.colorHex ?? "#6366f1" }}
                  />
                  <span className="text-[10px] truncate flex-1">
                    {seg.name}
                  </span>
                  {isLinked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="shrink-0 text-indigo-400"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </>
        )}

        {tab === "blocks" && (
          <>
            {otherBlocks.map((def) => {
              const items = allBlockItems.get(def.type) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={def.type} className="mb-1">
                  <p className="text-[8px] font-mono uppercase tracking-wider text-foreground-muted/40 px-1 py-0.5">
                    {def.bmcLabel}
                  </p>
                  {items.map((otherItem) => {
                    const linkId = `${def.type}:${otherItem.id}`;
                    const isLinked = item.linkedItemIds.includes(linkId);
                    return (
                      <button
                        key={otherItem.id}
                        onClick={() => onToggleItem(linkId)}
                        className={`flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded transition-colors ${
                          isLinked
                            ? "bg-white/8 text-foreground"
                            : "text-foreground-muted/70 hover:bg-white/5 hover:text-foreground-muted"
                        }`}
                      >
                        <span className="text-[10px] truncate flex-1">
                          {otherItem.name}
                        </span>
                        {isLinked && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="shrink-0 text-indigo-400"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {otherBlocks.every(
              (def) => (allBlockItems.get(def.type) ?? []).length === 0,
            ) && (
              <p className="text-[9px] text-foreground-muted/40 px-1 py-2 text-center">
                No items in other blocks yet
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
