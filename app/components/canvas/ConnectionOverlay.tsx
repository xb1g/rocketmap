"use client";

import { useState, useEffect, useCallback } from "react";
import type { BlockItem, BlockType, Segment } from "@/lib/types/canvas";

export interface HoveredItem {
  blockType: BlockType;
  itemId: string;
}

interface ConnectionOverlayProps {
  hoveredItem: HoveredItem | null;
  allBlockItems: Map<BlockType, BlockItem[]>;
  segments: Segment[];
  itemRefs: React.RefObject<Map<string, HTMLElement>>;
  segmentRefs: React.RefObject<Map<number, HTMLElement>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Line {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dashed: boolean;
}

function getCenter(el: HTMLElement, container: HTMLElement): { x: number; y: number } | null {
  const elRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  return {
    x: elRect.left - cRect.left + elRect.width / 2,
    y: elRect.top - cRect.top + elRect.height / 2,
  };
}

export function ConnectionOverlay({
  hoveredItem,
  allBlockItems,
  segments,
  itemRefs,
  segmentRefs,
  containerRef,
}: ConnectionOverlayProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [visible, setVisible] = useState(false);

  const computeLines = useCallback(() => {
    if (!hoveredItem || !containerRef.current) {
      setLines([]);
      setVisible(false);
      return;
    }

    const container = containerRef.current;
    const refKey = `${hoveredItem.blockType}:${hoveredItem.itemId}`;
    const sourceEl = itemRefs.current?.get(refKey);
    if (!sourceEl) {
      setLines([]);
      return;
    }

    const sourcePos = getCenter(sourceEl, container);
    if (!sourcePos) return;

    // Find the hovered item's data
    const blockItems = allBlockItems.get(hoveredItem.blockType) ?? [];
    const item = blockItems.find((i) => i.id === hoveredItem.itemId);
    if (!item) return;

    const newLines: Line[] = [];

    // Segment links (dashed, colored by segment)
    for (const segId of item.linkedSegmentIds) {
      const seg = segments.find((s) => s.id === segId);
      const segEl = segmentRefs.current?.get(segId);
      if (!segEl) continue;
      const targetPos = getCenter(segEl, container);
      if (!targetPos) continue;
      newLines.push({
        key: `seg-${segId}`,
        x1: sourcePos.x,
        y1: sourcePos.y,
        x2: targetPos.x,
        y2: targetPos.y,
        color: seg?.colorHex ?? "#6366f1",
        dashed: true,
      });
    }

    // Item links (solid indigo)
    for (const linkedId of item.linkedItemIds) {
      const targetEl = itemRefs.current?.get(linkedId);
      if (!targetEl) continue;
      const targetPos = getCenter(targetEl, container);
      if (!targetPos) continue;
      newLines.push({
        key: `item-${linkedId}`,
        x1: sourcePos.x,
        y1: sourcePos.y,
        x2: targetPos.x,
        y2: targetPos.y,
        color: "#6366f1",
        dashed: false,
      });
    }

    setLines(newLines);
    setVisible(true);
  }, [hoveredItem, allBlockItems, segments, itemRefs, segmentRefs, containerRef]);

  // Recompute on hover change
  useEffect(() => {
    computeLines();
  }, [computeLines]);

  // Recompute on scroll/resize
  useEffect(() => {
    if (!hoveredItem) return;
    const handler = () => computeLines();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [hoveredItem, computeLines]);

  // Fade out when no hovered item
  useEffect(() => {
    if (!hoveredItem) {
      const timer = setTimeout(() => setLines([]), 150);
      setVisible(false);
      return () => clearTimeout(timer);
    }
  }, [hoveredItem]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transition: "opacity 150ms ease",
      }}
    >
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeDasharray={line.dashed ? "4 3" : undefined}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
