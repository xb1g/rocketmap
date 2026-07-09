"use client";

import { useRef, useEffect, useCallback, forwardRef } from "react";
import type { Segment } from "@/lib/types/canvas";

interface SegmentCardProps {
  segment: Segment;
  mode: 'compact' | 'full';
  onSave?: (updates: { name: string; description: string }) => void;
  onFocus?: () => void;
  onLink?: () => void;
  segmentRefCallback?: (el: HTMLElement | null) => void;
}

export const SegmentCard = forwardRef<HTMLDivElement, SegmentCardProps>(
  function SegmentCard(
    { segment, mode, onSave, onFocus, onLink },
    ref
  ) {
    const nameRef = useRef<HTMLDivElement>(null);
    const descRef = useRef<HTMLDivElement>(null);
    const savedName = useRef(segment.name);
    const savedDesc = useRef(segment.description || '');

    // Compute dot color
    const dotColor = segment.colorHex || (
      segment.priorityScore >= 70 ? 'var(--state-healthy)' :
      segment.priorityScore >= 40 ? 'var(--state-warning)' :
      'var(--state-critical)'
    );

    // Sync text when external changes happen
    useEffect(() => {
      if (nameRef.current && document.activeElement !== nameRef.current) {
        nameRef.current.textContent = segment.name;
        savedName.current = segment.name;
      }
      if (descRef.current && document.activeElement !== descRef.current) {
        descRef.current.textContent = segment.description || '';
        savedDesc.current = segment.description || '';
      }
    }, [segment.name, segment.description]);

    const handleNameBlur = useCallback(() => {
      const current = nameRef.current?.textContent?.trim() || '';
      if (current !== savedName.current.trim()) {
        onSave?.({
          name: current,
          description: descRef.current?.textContent?.trim() || ''
        });
      }
    }, [onSave]);

    const handleDescBlur = useCallback(() => {
      const current = descRef.current?.textContent?.trim() || '';
      const nameCurrent = nameRef.current?.textContent?.trim() || '';
      if (current !== savedDesc.current.trim()) {
        onSave?.({
          name: nameCurrent,
          description: current
        });
      }
    }, [onSave]);

    // Compact mode: single line button
    if (mode === 'compact') {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          className="flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded-[12px] hover:bg-foreground/5 transition-colors group/seg"
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
            <span className="text-[8px] font-mono px-1 py-px rounded bg-(--state-healthy)/[0.10] text-(--state-healthy)/70 shrink-0">
              EA
            </span>
          )}
          <span className="text-[9px] font-mono text-foreground-muted/40 shrink-0">
            {segment.priorityScore}
          </span>
        </button>
      );
    }

    // Full mode: inline editable
    return (
      <div
        ref={ref}
        className="rounded-[14px] border border-border bg-canvas-surface hover:bg-foreground/5 transition-colors"
      >
        <div className="p-1.5">
          <div className="flex items-start gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 mt-[3px]"
              style={{ background: dotColor }}
            />
            <div className="flex-1 min-w-0">
              <div
                ref={nameRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={handleNameBlur}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-[10px] font-medium text-foreground/80 text-left w-full cursor-text outline-none hover:text-foreground whitespace-pre-wrap break-words leading-relaxed"
                spellCheck={false}
                style={{ minHeight: '14px' }}
              >
                {segment.name}
              </div>
              <div
                ref={descRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={handleDescBlur}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-[9px] text-foreground-muted/50 w-full cursor-text outline-none hover:text-foreground-muted/70 whitespace-pre-wrap break-words leading-tight mt-0.5"
                data-placeholder="Description..."
                spellCheck={false}
                style={{ minHeight: '12px' }}
              >
                {segment.description || ''}
              </div>
            </div>
            {segment.earlyAdopterFlag && (
              <span className="text-[7px] font-mono px-1 py-px rounded bg-(--state-healthy)/[0.10] text-(--state-healthy)/70 shrink-0">
                EA
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border">
            <button
              onClick={onFocus}
              className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded-[12px] hover:bg-foreground/5"
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
              className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded-[12px] hover:bg-foreground/5"
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
      </div>
    );
  }
);
