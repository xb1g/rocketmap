"use client";

import { useState, useCallback, forwardRef } from "react";
import type { BlockItem, Segment } from "@/lib/types/canvas";

interface BlockItemCardProps {
  item: BlockItem;
  segments: Segment[];
  onUpdate: (updates: Partial<BlockItem>) => void;
  onDelete: () => void;
  onLinkClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const BlockItemCard = forwardRef<HTMLDivElement, BlockItemCardProps>(
  function BlockItemCard(
    { item, segments, onUpdate, onDelete, onLinkClick, onMouseEnter, onMouseLeave },
    ref,
  ) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.name);
    const [editDesc, setEditDesc] = useState(item.description ?? "");

    const linkedSegments = segments.filter(seg => item.linkedSegmentIds.includes(seg.$id));

    const handleSave = useCallback(() => {
      if (!editName.trim()) return;
      const updates: Partial<BlockItem> = {};
      if (editName.trim() !== item.name) updates.name = editName.trim();
      const newDesc = editDesc.trim() || undefined;
      if (newDesc !== (item.description || undefined)) updates.description = newDesc;
      if (Object.keys(updates).length > 0) onUpdate(updates);
      setIsEditing(false);
    }, [editName, editDesc, item, onUpdate]);

    if (isEditing) {
      return (
        <div
          ref={ref}
          className="block-item-card"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className="p-1.5 space-y-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground outline-none border border-white/12 focus:border-white/25"
              placeholder="Item name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onFocus={(e) => e.stopPropagation()}
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] text-foreground-muted outline-none border border-white/12 focus:border-white/25 resize-none"
              placeholder="Description..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsEditing(false);
              }}
              onFocus={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-foreground hover:bg-white/12 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-[9px] px-1.5 py-0.5 rounded text-foreground-muted/50 hover:text-foreground-muted transition-colors"
              >
                Cancel
              </button>
              <div className="flex-1" />
              <button
                onClick={onDelete}
                className="text-[9px] px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="block-item-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="p-1.5">
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => {
                  setEditName(item.name);
                  setEditDesc(item.description ?? "");
                  setIsEditing(true);
                }}
                className="text-[10px] font-medium text-foreground/80 hover:text-foreground text-left w-full truncate transition-colors"
              >
                {item.name}
              </button>
              {item.description && (
                <p className="text-[9px] text-foreground-muted/50 line-clamp-2 mt-0.5 leading-tight">
                  {item.description}
                </p>
              )}
              {/* Segment tags */}
              {linkedSegments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {linkedSegments.slice(0, 3).map((seg) => (
                    <span
                      key={seg.$id}
                      className="inline-flex items-center gap-0.5 text-[8px] px-1 py-px rounded bg-white/5 text-foreground-muted/60 border border-white/8"
                      title={seg.description || seg.name}
                    >
                      <span
                        className="w-1 h-1 rounded-full shrink-0"
                        style={{ background: seg.colorHex || 'var(--state-healthy)' }}
                      />
                      {seg.name}
                    </span>
                  ))}
                  {linkedSegments.length > 3 && (
                    <span className="text-[8px] text-foreground-muted/40 px-1">
                      +{linkedSegments.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Cross-block link count */}
            {item.linkedItemIds.length > 0 && (
              <span
                className="text-[7px] font-mono px-1 py-px rounded bg-indigo-400/10 text-indigo-400/70 shrink-0"
                title={`${item.linkedItemIds.length} linked item(s)`}
              >
                {item.linkedItemIds.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
            <button
              onClick={onLinkClick}
              className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
              title="Link to other block items"
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link
            </button>
          </div>
        </div>
      </div>
    );
  },
);
