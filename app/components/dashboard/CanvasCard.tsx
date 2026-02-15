"use client";

import Link from "next/link";
import { DropdownMenu } from "@radix-ui/themes";

interface CanvasCardProps {
  canvas: {
    $id: string;
    title: string;
    slug: string;
    $updatedAt: string;
    blocksCount: number;
  };
  onDuplicate: (canvasId: string) => void;
  onDelete: (canvasId: string) => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function CanvasCard({ canvas, onDuplicate, onDelete }: CanvasCardProps) {
  const filledBlocks = canvas.blocksCount;
  const progressPct = Math.round((filledBlocks / 9) * 100);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking the dropdown menu area
    if ((e.target as HTMLElement).closest(".canvas-card-menu")) {
      return;
    }
    window.location.href = `/canvas/${canvas.slug}`;
  };

  return (
    <div
      className="canvas-card"
      style={{ position: "relative", cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
          paddingRight: "2rem", // Add space for the absolute menu
        }}
      >
        <div style={{ flex: 1, minWidth: 0, paddingRight: "1rem" }}>
          <div className="canvas-card-title">{canvas.title}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            <span className="mode-badge mode-badge-bmc">BMC</span>
            <span className="canvas-card-meta">
              {timeAgo(canvas.$updatedAt)}
            </span>
          </div>
        </div>
        <div
          className="canvas-blocks-mini"
          style={{
            marginTop: "1.25rem",
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gridTemplateRows: "repeat(2, 1fr) 0.65fr",
            gap: "2px",
            width: "70px",
            height: "45px",
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        >
          {/* Key Partners (Tall Left) */}
          <div
            className={`canvas-blocks-mini-cell ${0 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2", gridRow: "span 2 " }}
          />
          {/* Key Activities (Top Left-Mid) */}
          <div
            className={`canvas-blocks-mini-cell ${1 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2" }}
          />
          {/* Key Resources (Bottom Left-Mid) */}
          <div
            className={`canvas-blocks-mini-cell ${2 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2", gridRow: "2" }}
          />
          {/* Value Propositions (Tall Center) */}
          <div
            className={`canvas-blocks-mini-cell ${3 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2", gridRow: "span 2" }}
          />
          {/* Customer Relationships (Top Right-Mid) */}
          <div
            className={`canvas-blocks-mini-cell ${4 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2" }}
          />
          {/* Channels (Bottom Right-Mid) */}
          <div
            className={`canvas-blocks-mini-cell ${5 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2", gridRow: "2" }}
          />
          {/* Customer Segments (Tall Right) */}
          <div
            className={`canvas-blocks-mini-cell ${6 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 2", gridRow: "span 2" }}
          />

          {/* Cost Structure (Bottom Left) */}
          <div
            className={`canvas-blocks-mini-cell ${7 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 5", gridRow: "3" }}
          />
          {/* Revenue Streams (Bottom Right) */}
          <div
            className={`canvas-blocks-mini-cell ${8 < filledBlocks ? "filled" : ""}`}
            style={{ gridColumn: "span 5", gridRow: "3" }}
          />
        </div>
      </div>
      <div 
        className="canvas-progress"
        style={{ marginTop: "1rem" }}
      >
        <div
          className="canvas-progress-bar"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div
        className="canvas-card-menu"
        style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
                color: "var(--foreground-muted)",
                cursor: "pointer",
                fontSize: "0.85rem",
                lineHeight: 1,
              }}
            >
              &middot;&middot;&middot;
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="1" variant="soft">
            <DropdownMenu.Item>
              <Link
                href={`/canvas/${canvas.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                Open
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => onDuplicate(canvas.$id)}>
              Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item color="red" onClick={() => onDelete(canvas.$id)}>
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
