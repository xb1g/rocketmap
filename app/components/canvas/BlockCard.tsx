"use client";

import { useState, useCallback, forwardRef, useMemo } from "react";
import type { BlockType, Segment, BlockContent } from "@/lib/types/canvas";

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
  allBlockItems?: Map<BlockType, { $id: string; contentJson: string; segments: Segment[] }[]>;
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
    const content: BlockContent = useMemo(() => {
      try {
        return JSON.parse(block.contentJson);
      } catch {
        return { text: block.contentJson || '', tags: [] };
      }
    }, [block.contentJson]);

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(content.text);

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
      </div>
    );
  }
);
