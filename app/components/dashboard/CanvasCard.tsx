"use client";

import Link from "next/link";
import { DropdownMenu } from "@radix-ui/themes";
import type { BlockType } from "@/lib/types/canvas";

interface CanvasCardProps {
  canvas: {
    $id: string;
    title: string;
    slug: string;
    description: string;
    isPublic: boolean;
    $updatedAt: string;
    $createdAt: string;
    blocksCount: number;
    filledBlocks: BlockType[];
    viabilityScore: number | null;
  };
  onShare: (slug: string) => void;
  onTogglePublic: (canvasId: string, isPublic: boolean) => void;
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

// BMC grid positions for the mini grid — matches standard BMC layout
const MINI_GRID_BLOCKS: {
  type: BlockType;
  col: string;
  row: string;
}[] = [
  { type: "key_partnerships", col: "1 / 3", row: "1 / 3" },
  { type: "key_activities", col: "3 / 5", row: "1 / 2" },
  { type: "key_resources", col: "3 / 5", row: "2 / 3" },
  { type: "value_prop", col: "5 / 7", row: "1 / 3" },
  { type: "customer_relationships", col: "7 / 9", row: "1 / 2" },
  { type: "channels", col: "7 / 9", row: "2 / 3" },
  { type: "customer_segments", col: "9 / 11", row: "1 / 3" },
  { type: "cost_structure", col: "1 / 6", row: "3 / 4" },
  { type: "revenue_streams", col: "6 / 11", row: "3 / 4" },
];

function getViabilityColor(score: number): string {
  if (score < 50) return "#f43f5e";
  if (score < 75) return "#f59e0b";
  return "#10b981";
}

function getViabilityLabel(score: number): string {
  if (score < 50) return "Low";
  if (score < 75) return "Medium";
  return "High";
}

export function CanvasCard({
  canvas,
  onShare,
  onTogglePublic,
  onDuplicate,
  onDelete,
}: CanvasCardProps) {
  const filledSet = new Set(canvas.filledBlocks);
  const progressPct = Math.round((canvas.blocksCount / 9) * 100);
  const hasViability = canvas.viabilityScore != null;
  const viabilityScore = canvas.viabilityScore ?? 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".canvas-card-menu")) return;
    window.location.href = `/canvas/${canvas.slug}`;
  };

  return (
    <div
      className="canvas-card"
      style={{ position: "relative", cursor: "pointer" }}
      onClick={handleCardClick}
    >
      {/* Header: title + menu */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.5rem",
          paddingRight: "2rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="canvas-card-title">{canvas.title}</div>
          {canvas.description && (
            <div className="canvas-card-desc">{canvas.description}</div>
          )}
        </div>
      </div>

      {/* Middle: Mini BMC grid + viability score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.75rem",
        }}
      >
        {/* Accurate mini BMC grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gridTemplateRows: "repeat(2, 1fr) 0.65fr",
            gap: "2px",
            width: "80px",
            height: "48px",
            flexShrink: 0,
          }}
        >
          {MINI_GRID_BLOCKS.map((block) => (
            <div
              key={block.type}
              className={`canvas-blocks-mini-cell ${filledSet.has(block.type) ? "filled" : ""}`}
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        {/* Viability score */}
        {hasViability ? (
          <div className="canvas-card-viability">
            <div
              className="canvas-card-viability-ring"
              style={
                {
                  "--viability-color": getViabilityColor(viabilityScore),
                  "--viability-pct": `${viabilityScore}%`,
                } as React.CSSProperties
              }
            >
              <span className="canvas-card-viability-value">
                {Math.round(viabilityScore)}
              </span>
            </div>
            <span
              className="canvas-card-viability-label"
              style={{ color: getViabilityColor(viabilityScore) }}
            >
              {getViabilityLabel(viabilityScore)}
            </span>
          </div>
        ) : (
          <div className="canvas-card-viability canvas-card-viability--empty">
            <div className="canvas-card-viability-ring canvas-card-viability-ring--empty">
              <span className="canvas-card-viability-value" style={{ opacity: 0.3 }}>
                —
              </span>
            </div>
            <span
              className="canvas-card-viability-label"
              style={{ opacity: 0.35 }}
            >
              Not scored
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Block count + progress */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--foreground-muted)",
              marginBottom: "0.25rem",
            }}
          >
            {canvas.blocksCount}/9 blocks
          </div>
          <div className="canvas-progress" style={{ width: "64px" }}>
            <div
              className="canvas-progress-bar"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: badges + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          className={`mode-badge ${canvas.isPublic ? "mode-badge-lean" : "mode-badge-bmc"}`}
        >
          {canvas.isPublic ? "Public" : "Private"}
        </span>
        <span className="mode-badge mode-badge-bmc">BMC</span>
        <span className="canvas-card-meta">{timeAgo(canvas.$updatedAt)}</span>
      </div>

      {/* Dropdown menu */}
      <div
        className="canvas-card-menu"
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
        }}
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
            <DropdownMenu.Item onSelect={() => onShare(canvas.slug)}>
              Copy link
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => onTogglePublic(canvas.$id, !canvas.isPublic)}
            >
              {canvas.isPublic ? "Make private" : "Make public"}
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
