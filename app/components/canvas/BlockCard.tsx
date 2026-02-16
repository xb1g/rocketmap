"use client";

import { useState, useCallback, useEffect, useRef, forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { BlockType, Segment } from "@/lib/types/canvas";

/** Internal content shape for BlockCard (separate from main BlockContent) */
interface CardContent {
  text: string;
  tags?: string[];
}

interface BlockCardProps {
  block: {
    $id: string;
    blockType: BlockType;
    contentJson: string;
    confidenceScore: number;
    riskScore: number;
    segments: Segment[];
  };
  allSegments: Segment[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allBlockItems?: Map<BlockType, any[]>;
  onUpdate: (blockId: string, updates: { contentJson: string }) => void;
  onDelete: (blockId: string) => void;
  onSegmentToggle: (blockId: string, segmentId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const BlockCard = forwardRef<HTMLDivElement, BlockCardProps>(
  function BlockCard(
    { block, allSegments, onUpdate, onDelete, onSegmentToggle, onMouseEnter, onMouseLeave },
    ref
  ) {
    // Parse contentJson with fallback
    const content: CardContent = useMemo(() => {
      try {
        return JSON.parse(block.contentJson);
      } catch {
        return { text: block.contentJson || '', tags: [] };
      }
    }, [block.contentJson]);

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(content.text);
    const [showLinkPicker, setShowLinkPicker] = useState(false);

    const linkBtnRef = useRef<HTMLButtonElement>(null);
    const floatingRef = useRef<HTMLDivElement>(null);
    const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);

    const linkedSegmentIds = useMemo(
      () => new Set(block.segments.map(s => s.$id)),
      [block.segments],
    );

    // Position the floating menu when it opens
    useEffect(() => {
      if (!showLinkPicker || !linkBtnRef.current) return;
      const rect = linkBtnRef.current.getBoundingClientRect();
      setFloatingPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.left - 60),
      });
    }, [showLinkPicker]);

    // Close on outside click
    useEffect(() => {
      if (!showLinkPicker) return;
      const handler = (e: MouseEvent) => {
        if (
          floatingRef.current && !floatingRef.current.contains(e.target as Node) &&
          linkBtnRef.current && !linkBtnRef.current.contains(e.target as Node)
        ) {
          setShowLinkPicker(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [showLinkPicker]);

    // Close on escape
    useEffect(() => {
      if (!showLinkPicker) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setShowLinkPicker(false);
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }, [showLinkPicker]);

    const handleSave = useCallback(() => {
      onUpdate(block.$id, {
        contentJson: JSON.stringify({ text: editText, tags: content.tags })
      });
      setIsEditing(false);
    }, [editText, content.tags, block.$id, onUpdate]);

    // Confidence color
    const confidenceColor =
      block.confidenceScore >= 70 ? 'var(--state-healthy)' :
      block.confidenceScore >= 40 ? 'var(--state-warning)' :
      'var(--state-critical)';

    return (
      <div
        ref={ref}
        className="block-item-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="p-1.5 space-y-1">
          {/* Text content (view or edit) */}
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditText(content.text);
                  setIsEditing(false);
                }
              }}
              onBlur={handleSave}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] text-foreground outline-none border border-white/12 focus:border-white/25 resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[10px] text-foreground/80 hover:text-foreground text-left w-full transition-colors whitespace-pre-wrap break-words leading-relaxed"
            >
              {content.text || 'Enter block content...'}
            </button>
          )}

          {/* Tags row */}
          {content.tags && content.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {content.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[8px] px-1.5 py-px rounded bg-white/8 text-foreground-muted/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Linked segments row */}
          {block.segments.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {block.segments.map(seg => (
                <span
                  key={seg.$id}
                  className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full border border-white/8 text-foreground-muted/70"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: seg.colorHex || 'var(--state-calm)' }}
                  />
                  {seg.name}
                </span>
              ))}
            </div>
          )}

          {/* Confidence + actions */}
          <div className="flex items-center gap-1.5">
            {/* Link to segments button */}
            <button
              ref={linkBtnRef}
              onClick={() => setShowLinkPicker(!showLinkPicker)}
              className={`flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded transition-colors ${
                showLinkPicker
                  ? 'text-foreground-muted bg-white/8'
                  : 'text-foreground-muted/40 hover:text-foreground-muted hover:bg-white/5'
              }`}
              title="Link to segments"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>{block.segments.length || ''}</span>
            </button>

            {/* Confidence score */}
            <span
              className="text-[9px] font-mono ml-auto"
              style={{ color: confidenceColor }}
            >
              {block.confidenceScore}%
            </span>

            {/* Delete button */}
            <button
              onClick={() => {
                if (confirm('Delete this block? This cannot be undone.')) {
                  onDelete(block.$id);
                }
              }}
              className="text-[9px] px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 transition-colors"
              title="Delete block"
            >
              ×
            </button>
          </div>
        </div>

        {/* Floating segment picker (portalled to body) */}
        {showLinkPicker && floatingPos && allSegments.length > 0 && createPortal(
          <div
            ref={floatingRef}
            className="fixed z-[100] rounded-lg border border-white/12 bg-[#1a1a1f] shadow-xl shadow-black/40 p-1 space-y-0.5 max-h-[180px] w-[180px] overflow-y-auto"
            style={{ top: floatingPos.top, left: floatingPos.left }}
          >
            <div className="text-[8px] text-foreground-muted/40 uppercase tracking-wider px-1.5 py-0.5">
              Link segments
            </div>
            {allSegments.map(seg => {
              const isLinked = linkedSegmentIds.has(seg.$id);
              return (
                <button
                  key={seg.$id}
                  onClick={() => onSegmentToggle(block.$id, seg.$id)}
                  className={`flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded transition-colors ${
                    isLinked ? 'bg-white/8' : 'hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: seg.colorHex || 'var(--state-calm)' }}
                  />
                  <span className={`text-[9px] truncate flex-1 ${
                    isLinked ? 'text-foreground/80' : 'text-foreground-muted/60'
                  }`}>
                    {seg.name}
                  </span>
                  {isLinked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400/80 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    );
  }
);
