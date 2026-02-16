"use client";

import Link from "next/link";
import type { CanvasMode } from "@/lib/types/canvas";
import { InlineEditableTitle } from "./InlineEditableTitle";

type SaveStatus = "saved" | "saving" | "unsaved";

interface CanvasToolbarProps {
  title: string;
  mode: CanvasMode;
  saveStatus: SaveStatus;
  onModeChange: (mode: CanvasMode) => void;
  onTitleChange: (title: string) => void;
  onSettingsOpen: () => void;
  onConvertLeanToBmc: () => void;
  hasLeanContent: boolean;
  isConverting: boolean;
}

export function CanvasToolbar({
  title,
  mode,
  saveStatus,
  onModeChange,
  onTitleChange,
  onSettingsOpen,
  onConvertLeanToBmc,
  hasLeanContent,
  isConverting,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      {/* Left: back + title + settings */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="text-foreground-muted hover:text-foreground transition-colors text-sm shrink-0"
          aria-label="Back to dashboard"
        >
          &larr;
        </Link>
        <div className="min-w-0 max-w-[200px] md:max-w-none">
          <InlineEditableTitle value={title} onSave={onTitleChange} />
        </div>
        <button
          onClick={onSettingsOpen}
          className="ui-btn ui-btn-xs ui-btn-ghost shrink-0"
          aria-label="Canvas settings"
          title="Settings"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            suppressHydrationWarning
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
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
        {hasLeanContent && (
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
      </div>

      {/* Right: save status */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-foreground-muted min-w-12 md:min-w-20 justify-end shrink-0">
        {saveStatus === "saved" && (
          <>
            <span className="text-(--state-healthy)">&#10003;</span>
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
            <span className="w-1.5 h-1.5 rounded-full bg-(--state-warning)" />
            <span className="uppercase tracking-wider hidden md:inline">Unsaved</span>
          </>
        )}
      </div>
    </div>
  );
}
