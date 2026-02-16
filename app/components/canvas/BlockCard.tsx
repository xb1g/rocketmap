"use client";

import { useState, useCallback, forwardRef } from "react";
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

    return (
      <div
        ref={ref}
        className="block-item-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="p-1.5">
          <div className="text-[10px] text-foreground/80">
            {content.text || "Enter block content..."}
          </div>
        </div>
      </div>
    );
  }
);
