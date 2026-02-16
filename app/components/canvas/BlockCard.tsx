"use client";

import { useState, useCallback, forwardRef, useMemo } from "react";
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

    const linkedSegmentIds = useMemo(
      () => new Set(block.segments.map(s => s.$id)),
      [block.segments],
    );

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
              className="text-[10px] text-foreground/80 hover:text-foreground text-left w-full transition-colors whitespace-pre-wrap"
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

          {/* Segment badges + confidence + actions */}
          <div className="flex items-center gap-1.5">
            {/* Segment color dots */}
            {block.segments.slice(0, 3).map(seg => (
              <span
                key={seg.$id}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: seg.colorHex || 'var(--state-calm)' }}
                title={seg.name}
              />
            ))}
            {block.segments.length > 3 && (
              <span className="text-[8px] text-foreground-muted/40">
                +{block.segments.length - 3}
              </span>
            )}

            {/* Link to segments button */}
            <button
              onClick={() => setShowLinkPicker(!showLinkPicker)}
              className="flex items-center gap-0.5 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
              title="Link to segments"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
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

          {/* Segment link picker */}
          {showLinkPicker && allSegments.length > 0 && (
            <div className="rounded border border-white/10 bg-white/[0.04] p-1 space-y-0.5 max-h-[120px] overflow-y-auto">
              {allSegments.map(seg => {
                const isLinked = linkedSegmentIds.has(seg.$id);
                return (
                  <button
                    key={seg.$id}
                    onClick={() => onSegmentToggle(block.$id, seg.$id)}
                    className="flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: seg.colorHex || 'var(--state-calm)' }}
                    />
                    <span className="text-[9px] text-foreground-muted/70 truncate flex-1">
                      {seg.name}
                    </span>
                    {isLinked && (
                      <span className="text-[8px] text-emerald-400/70 shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
);
