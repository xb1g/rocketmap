"use client";

import Link from "next/link";
import type { CanvasMode, Segment } from "@/lib/types/canvas";
import { InlineEditableTitle } from "./InlineEditableTitle";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { SegmentFocusPicker } from "./SegmentFocusPicker";

type SaveStatus = "saved" | "saving" | "unsaved";

interface CanvasToolbarProps {
  title: string;
  mode: CanvasMode;
  saveStatus: SaveStatus;
  readOnly: boolean;
  onModeChange: (mode: CanvasMode) => void;
  onTitleChange: (title: string) => void;
  onConvertLeanToBmc: () => void;
  hasLeanContent: boolean;
  isConverting: boolean;
  segments: Segment[];
  focusSegmentId: string | null;
  segmentItemCounts: Map<string, number>;
  onFocusSegmentChange: (segmentId: string | null) => void;
}

export function CanvasToolbar({
  title,
  mode,
  saveStatus,
  readOnly,
  onModeChange,
  onTitleChange,
  onConvertLeanToBmc,
  hasLeanContent,
  isConverting,
  segments,
  focusSegmentId,
  segmentItemCounts,
  onFocusSegmentChange,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      {/* Left: back + title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="text-foreground-muted hover:text-foreground transition-colors text-sm shrink-0"
          aria-label="Back to dashboard"
        >
          &larr;
        </Link>
        <div className="min-w-0 max-w-[200px] md:max-w-none">
          <InlineEditableTitle value={title} readOnly={readOnly} onSave={onTitleChange} />
        </div>
        {readOnly && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-canvas-surface text-foreground-muted border border-border">
            Read-only
          </span>
        )}
      </div>

      {/* Center: mode toggle + convert (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-2">
        <div className="ui-segmented">
          <button
            onClick={() => onModeChange("bmc")}
            className={`ui-segmented-btn ${mode === "bmc" ? "is-active" : ""}`}
          >
            BMC
          </button>
          <button
            onClick={() => onModeChange("lean")}
            className={`ui-segmented-btn ${mode === "lean" ? "is-active" : ""}`}
          >
            Lean
          </button>
        </div>
        {(!readOnly && hasLeanContent) && (
          <button
            onClick={onConvertLeanToBmc}
            disabled={isConverting}
            className="ui-btn ui-btn-xs ui-btn-ghost flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-foreground-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            title="Use AI to convert Lean Canvas content into BMC blocks"
          >
            {isConverting ? (
              <span className="animate-spin inline-block w-3 h-3 border border-foreground-muted border-t-transparent rounded-full" />
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
                suppressHydrationWarning
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            )}
            {isConverting ? "Converting..." : "Lean\u2192BMC"}
          </button>
        )}
        <SegmentFocusPicker
          segments={segments}
          focusSegmentId={focusSegmentId}
          segmentItemCounts={segmentItemCounts}
          onFocusSegmentChange={onFocusSegmentChange}
        />
      </div>

      {/* Right: theme + save status */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle variant="segmented" showLabels={false} />
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-foreground-muted min-w-12 md:min-w-20 justify-end">
        {saveStatus === "saved" && (
          <>
            <span className="text-state-healthy">&#10003;</span>
            <span className="uppercase tracking-wider hidden md:inline">Saved</span>
          </>
        )}
        {saveStatus === "saving" && (
          <>
            <span className="animate-spin inline-block w-2.5 h-2.5 border border-foreground-muted border-t-transparent rounded-full" />
            <span className="uppercase tracking-wider hidden md:inline">Saving</span>
          </>
        )}
        {saveStatus === "unsaved" && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-state-warning" />
            <span className="uppercase tracking-wider hidden md:inline">Unsaved</span>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
