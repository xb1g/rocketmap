"use client";

import { useState, useCallback, forwardRef, useEffect } from "react";
import type { BlockType, Segment, BlockContent } from "@/lib/types/canvas";
import { LinkPicker } from "./LinkPicker";

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
    const parseContent = (json: string): BlockContent => {
      try {
        return JSON.parse(json);
      } catch {
        return { text: json, tags: [] };
      }
    };

    const [content, setContent] = useState<BlockContent>(() => parseContent(block.contentJson));
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(content.text);
    const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // Autosave handler with 500ms debounce
    const handleTextChange = useCallback((newText: string) => {
      setEditText(newText);

      // Clear existing timeout
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }

      // Set new timeout
      const timeoutId = setTimeout(() => {
        const updatedContent: BlockContent = {
          ...content,
          text: newText
        };
        setContent(updatedContent);
        onUpdate(block.$id, { contentJson: JSON.stringify(updatedContent) });
      }, 500);

      setSaveTimeoutId(timeoutId);
    }, [block.$id, content, onUpdate, saveTimeoutId]);

    // Cancel handler
    const handleCancel = useCallback(() => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
      setEditText(content.text);
      setIsEditing(false);
    }, [content.text, saveTimeoutId]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (saveTimeoutId) {
          clearTimeout(saveTimeoutId);
        }
      };
    }, [saveTimeoutId]);

    const handleAddTag = useCallback((tag: string) => {
      if (!tag.trim()) return;
      const updatedContent: BlockContent = {
        ...content,
        tags: [...(content.tags || []), tag.trim()]
      };
      setContent(updatedContent);
      onUpdate(block.$id, { contentJson: JSON.stringify(updatedContent) });
    }, [block.$id, content, onUpdate]);

    const handleRemoveTag = useCallback((index: number) => {
      const updatedContent: BlockContent = {
        ...content,
        tags: content.tags?.filter((_, i) => i !== index) || []
      };
      setContent(updatedContent);
      onUpdate(block.$id, { contentJson: JSON.stringify(updatedContent) });
    }, [block.$id, content, onUpdate]);

    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLinkPicker, setShowLinkPicker] = useState(false);

    return (
      <div
        ref={ref}
        className="block-item-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="p-1.5">
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              onBlur={() => setIsEditing(false)}
              className="w-full bg-white/5 rounded px-1.5 py-1 text-[10px] text-foreground outline-none border border-white/12 focus:border-white/25 resize-none min-h-[40px]"
              placeholder="Enter block content..."
              autoFocus
              rows={3}
            />
          ) : (
            <button
              onClick={() => {
                setEditText(content.text);
                setIsEditing(true);
              }}
              className="w-full text-left text-[10px] text-foreground/80 hover:text-foreground transition-colors whitespace-pre-wrap"
            >
              {content.text || "Enter block content..."}
            </button>
          )}

          {/* Tags */}
          {(content.tags && content.tags.length > 0) || isAddingTag ? (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {content.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-white/8 text-foreground-muted"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(idx)}
                    className="hover:text-foreground transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              {isAddingTag ? (
                <input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagInput.trim()) {
                      handleAddTag(newTagInput);
                      setNewTagInput("");
                      setIsAddingTag(false);
                    }
                    if (e.key === "Escape") {
                      setNewTagInput("");
                      setIsAddingTag(false);
                    }
                  }}
                  onBlur={() => {
                    if (newTagInput.trim()) {
                      handleAddTag(newTagInput);
                    }
                    setNewTagInput("");
                    setIsAddingTag(false);
                  }}
                  className="w-16 bg-white/5 rounded px-1 py-0.5 text-[8px] text-foreground outline-none border border-white/12"
                  placeholder="tag"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="text-[8px] px-1 py-0.5 rounded text-foreground-muted/40 hover:text-foreground-muted hover:bg-white/5 transition-colors"
                >
                  + tag
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="text-[8px] px-1 py-0.5 rounded text-foreground-muted/40 hover:text-foreground-muted hover:bg-white/5 transition-colors mt-1"
            >
              + tag
            </button>
          )}

          {/* Footer: Segments, Confidence, Actions */}
          <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-white/5">
            {/* Segment color badges */}
            {block.segments && block.segments.length > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                {block.segments.slice(0, 3).map((seg) => (
                  <span
                    key={seg.$id}
                    className="segment-badge"
                    style={{ background: seg.colorHex ?? "#6366f1" }}
                    title={seg.name}
                  />
                ))}
                {block.segments.length > 3 && (
                  <span className="text-[7px] text-foreground-muted/40">
                    +{block.segments.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Confidence score */}
            {block.confidenceScore > 0 && (
              <span
                className="text-[7px] font-mono px-1 py-px rounded bg-green-400/10 text-green-400/70 shrink-0"
                title={`Confidence: ${block.confidenceScore}%`}
              >
                {Math.round(block.confidenceScore)}%
              </span>
            )}

            <div className="flex-1" />

            {/* Link button */}
            <button
              onClick={() => setShowLinkPicker(!showLinkPicker)}
              className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
              title="Link to segments"
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

            {/* Delete button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[9px] text-red-400/40 hover:text-red-400 transition-colors px-1 py-0.5 rounded hover:bg-red-400/5"
              title="Delete block"
            >
              ×
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a1a1f] border border-white/12 rounded-lg p-4 max-w-sm">
              <h3 className="text-sm font-medium text-foreground mb-2">Delete Block?</h3>
              <p className="text-xs text-foreground-muted mb-4">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 text-xs rounded bg-white/5 text-foreground hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(block.$id);
                    setShowDeleteConfirm(false);
                  }}
                  className="px-3 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link Picker for Segments */}
        {showLinkPicker && (
          <div className="relative">
            <LinkPicker
              currentSegmentIds={block.segments.map(s => s.$id)}
              allSegments={allSegments}
              onToggleSegment={(segmentId) => {
                onSegmentToggle(block.$id, segmentId);
              }}
              onClose={() => setShowLinkPicker(false)}
            />
          </div>
        )}
      </div>
    );
  }
);
