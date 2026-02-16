"use client";

import { useRef, useEffect } from "react";
import type { Segment } from "@/lib/types/canvas";

interface LinkPickerProps {
  currentSegmentIds: string[];
  allSegments: Segment[];
  onToggleSegment: (segmentId: string) => void;
  onClose: () => void;
}

export function LinkPicker({
  currentSegmentIds,
  allSegments,
  onToggleSegment,
  onClose,
}: LinkPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 w-52 rounded-lg border border-white/12 bg-[#1a1a1f] shadow-xl shadow-black/40"
      style={{ bottom: "100%", left: 0, marginBottom: 4 }}
    >
      <div className="p-2 max-h-64 overflow-y-auto">
        <div className="text-[9px] text-foreground-muted/50 mb-1.5 px-1">
          Segments
        </div>
        {allSegments.length === 0 ? (
          <div className="text-[9px] text-foreground-muted/30 px-1 py-2">
            No segments available
          </div>
        ) : (
          allSegments.map((seg) => {
            const isLinked = currentSegmentIds.includes(seg.$id);
            return (
              <button
                key={seg.$id}
                onClick={() => onToggleSegment(seg.$id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isLinked}
                  onChange={() => {}}
                  className="w-3 h-3 rounded border border-white/20"
                />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: seg.colorHex ?? "#6366f1" }}
                />
                <span className="text-[10px] text-foreground truncate flex-1 text-left">
                  {seg.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
