"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Segment } from "@/lib/types/canvas";
import { getSegmentColor } from "@/lib/types/canvas";

interface SegmentFocusPickerProps {
  segments: Segment[];
  focusSegmentId: string | null;
  segmentItemCounts: Map<string, number>;
  onFocusSegmentChange: (segmentId: string | null) => void;
}

/**
 * Toolbar control that turns the canvas into a single-segment "lens".
 * Selecting a segment enters focus mode; "All segments" (or the clear
 * button) exits. Purely client-side UI state — no persistence.
 */
export function SegmentFocusPicker({
  segments,
  focusSegmentId,
  segmentItemCounts,
  onFocusSegmentChange,
}: SegmentFocusPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Option list: index 0 is the "All segments" reset, then each segment.
  const options = useMemo(
    () => [
      { id: null as string | null, name: "All segments", color: undefined as string | undefined, count: 0 },
      ...segments.map((seg, i) => ({
        id: seg.$id,
        name: seg.name,
        color: getSegmentColor(seg, i),
        count: segmentItemCounts.get(seg.$id) ?? 0,
      })),
    ],
    [segments, segmentItemCounts],
  );

  const focusedIndex = useMemo(() => {
    const idx = segments.findIndex((s) => s.$id === focusSegmentId);
    return idx === -1 ? -1 : idx;
  }, [segments, focusSegmentId]);

  const focusColor =
    focusSegmentId && focusedIndex !== -1
      ? getSegmentColor(segments[focusedIndex], focusedIndex)
      : undefined;
  const focusName = focusedIndex !== -1 ? segments[focusedIndex].name : null;

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const select = useCallback(
    (id: string | null) => {
      onFocusSegmentChange(id);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onFocusSegmentChange],
  );

  // Outside click closes the menu.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // On open, move focus to the currently-selected option.
  useEffect(() => {
    if (!open) return;
    const activeIndex = focusSegmentId
      ? options.findIndex((o) => o.id === focusSegmentId)
      : 0;
    const id = setTimeout(() => {
      optionRefs.current[Math.max(0, activeIndex)]?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [open, focusSegmentId, options]);

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          optionRefs.current[Math.min(options.length - 1, index + 1)]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          optionRefs.current[Math.max(0, index - 1)]?.focus();
          break;
        case "Home":
          e.preventDefault();
          optionRefs.current[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          optionRefs.current[options.length - 1]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        default:
          break;
      }
    },
    [options.length, close],
  );

  if (segments.length === 0) return null;

  const isFocusing = focusSegmentId !== null && focusColor !== undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={
            isFocusing
              ? `Focusing on segment ${focusName}. Change focused segment`
              : "Focus canvas on a customer segment"
          }
          className={`ui-btn ui-btn-xs flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            isFocusing
              ? "text-foreground"
              : "ui-btn-ghost text-foreground-muted hover:text-foreground"
          } ${isFocusing ? "rounded-r-none" : ""}`}
          style={
            isFocusing
              ? {
                  border: `1px solid color-mix(in srgb, ${focusColor} 45%, transparent)`,
                  background: `color-mix(in srgb, ${focusColor} 12%, transparent)`,
                }
              : undefined
          }
        >
          {isFocusing ? (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: focusColor }}
            />
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          <span className="max-w-[120px] truncate">
            {isFocusing ? focusName : "All segments"}
          </span>
        </button>
        {isFocusing && (
          <button
            type="button"
            onClick={() => select(null)}
            aria-label="Clear segment focus"
            className="ui-btn ui-btn-xs rounded-l-none border-l-0 flex items-center text-foreground-muted hover:text-foreground transition-colors"
            style={{
              borderTop: `1px solid color-mix(in srgb, ${focusColor} 45%, transparent)`,
              borderRight: `1px solid color-mix(in srgb, ${focusColor} 45%, transparent)`,
              borderBottom: `1px solid color-mix(in srgb, ${focusColor} 45%, transparent)`,
              borderLeft: "none",
              background: `color-mix(in srgb, ${focusColor} 12%, transparent)`,
            }}
            title="Clear segment focus"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div
          role="listbox"
          aria-label="Focus canvas on a customer segment"
          className="absolute right-0 top-full mt-1 z-50 min-w-[200px] max-h-[280px] overflow-y-auto rounded-lg border border-border bg-canvas-surface p-1 space-y-0.5 shadow-[0_20px_25px_-5px_rgba(var(--ink-shadow),0.12),0_8px_10px_-6px_rgba(var(--ink-shadow),0.12)]"
        >
          <div className="text-[8px] text-foreground-muted/40 uppercase tracking-wider px-1.5 py-0.5 font-mono">
            Focus segment
          </div>
          {options.map((opt, index) => {
            const isSelected = opt.id === focusSegmentId;
            return (
              <button
                key={opt.id ?? "__all"}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(opt.id)}
                onKeyDown={(e) => onListKeyDown(e, index)}
                className={`flex items-center gap-2 w-full text-left px-1.5 py-1 rounded transition-colors ${
                  isSelected ? "bg-foreground/8" : "hover:bg-foreground/5"
                }`}
              >
                {opt.color ? (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: opt.color }}
                  />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 border border-border"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-[11px] truncate flex-1 ${
                    isSelected ? "text-foreground/90" : "text-foreground-muted/80"
                  }`}
                >
                  {opt.name}
                </span>
                {opt.id !== null && (
                  <span className="text-[9px] font-mono text-foreground-muted/40 shrink-0">
                    {opt.count}
                  </span>
                )}
                {isSelected && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-state-healthy/80 shrink-0"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
