"use client";

import { useState, forwardRef } from "react";
import type { Segment } from "@/lib/types/canvas";

interface SegmentCardProps {
  segment: Segment;
  mode: 'compact' | 'full';
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (updates: { name: string; description: string }) => void;
  onCancel?: () => void;
  onFocus?: () => void;
  onLink?: () => void;
  segmentRefCallback?: (el: HTMLElement | null) => void;
}

export const SegmentCard = forwardRef<HTMLDivElement, SegmentCardProps>(
  function SegmentCard(
    { segment, mode, isEditing, onEdit, onSave, onCancel, onFocus, onLink, segmentRefCallback },
    ref
  ) {
    const [editName, setEditName] = useState(segment.name);
    const [editDesc, setEditDesc] = useState(segment.description || '');

    // Compute dot color
    const dotColor = segment.colorHex || (
      segment.priorityScore >= 70 ? 'var(--state-healthy)' :
      segment.priorityScore >= 40 ? 'var(--state-warning)' :
      'var(--state-critical)'
    );

    // Compact mode: single line button
    if (mode === 'compact') {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          className="flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors group/seg"
          onClick={onLink}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          <span className="text-[10px] text-foreground-muted/70 group-hover/seg:text-foreground-muted truncate flex-1">
            {segment.name}
          </span>
          {segment.earlyAdopterFlag && (
            <span className="text-[8px] font-mono px-1 py-px rounded bg-emerald-400/10 text-emerald-400/70 shrink-0">
              EA
            </span>
          )}
          <span className="text-[9px] font-mono text-foreground-muted/40 shrink-0">
            {segment.priorityScore}
          </span>
        </button>
      );
    }

    // Full mode: multi-line card with edit state
    return (
      <div
        ref={ref}
        className="rounded-md border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
      >
        {isEditing ? (
          // Edit mode
          <div className="p-1.5 space-y-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground outline-none border border-white/12 focus:border-white/25"
              placeholder="Segment name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel?.();
              }}
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] text-foreground-muted outline-none border border-white/12 focus:border-white/25 resize-none"
              placeholder="Description..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel?.();
              }}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSave?.({ name: editName, description: editDesc })}
                className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-foreground hover:bg-white/12 transition-colors"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="text-[9px] px-1.5 py-0.5 rounded text-foreground-muted/50 hover:text-foreground-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // View mode
          <div className="p-1.5">
            <div className="flex items-start gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-[3px]"
                style={{ background: dotColor }}
              />
              <div className="flex-1 min-w-0">
                <button
                  onClick={onEdit}
                  className="text-[10px] font-medium text-foreground/80 hover:text-foreground text-left w-full truncate transition-colors"
                >
                  {segment.name}
                </button>
                {segment.description && (
                  <p className="text-[9px] text-foreground-muted/50 line-clamp-2 mt-0.5 leading-tight">
                    {segment.description}
                  </p>
                )}
              </div>
              {segment.earlyAdopterFlag && (
                <span className="text-[7px] font-mono px-1 py-px rounded bg-emerald-400/10 text-emerald-400/70 shrink-0">
                  EA
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
              <button
                onClick={onFocus}
                className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
                title="Open in focus view"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Focus
              </button>
              <button
                onClick={onLink}
                className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
                title="Link to other blocks"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Link
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
