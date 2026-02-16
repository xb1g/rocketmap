"use client";

import { useState, useCallback, forwardRef, useEffect } from "react";
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
        </div>
      </div>
    );
  }
);
