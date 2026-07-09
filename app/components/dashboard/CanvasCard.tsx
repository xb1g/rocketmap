import Link from "next/link";
import { DropdownMenu } from "@radix-ui/themes";
import type { BlockType, CanvasData } from "@/lib/types/canvas";

interface CanvasCardProps {
  canvas: CanvasData & {
    blocksCount: number;
    filledBlocks: BlockType[];
    viabilityScore: number | null;
    viabilityPotentialScore: number | null;
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

export function CanvasCard({
  canvas,
  onShare,
  onTogglePublic,
  onDuplicate,
  onDelete,
}: CanvasCardProps) {
  const progressPct = Math.round((canvas.blocksCount / 9) * 100);

  return (
    <article className="canvas-card">
      <div className="canvas-card-main">
        <div className="canvas-card-text">
          <Link
            href={`/canvas/${canvas.slug}`}
            className="canvas-card-title"
          >
            {canvas.title}
          </Link>
          {canvas.description ? (
            <p className="canvas-card-desc">{canvas.description}</p>
          ) : null}
        </div>

        <div className="canvas-card-menu">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                className="canvas-card-menu-btn"
                aria-label="Canvas options"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1" variant="soft">
              <DropdownMenu.Item asChild>
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
              <DropdownMenu.Item onSelect={() => onDuplicate(canvas.$id)}>
                Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item color="red" onSelect={() => onDelete(canvas.$id)}>
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="canvas-card-footer">
        <div className="canvas-card-progress">
          <div className="canvas-card-progress-track">
            <div
              className="canvas-card-progress-bar"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="canvas-card-progress-label">{canvas.blocksCount}/9</span>
        </div>

        <div className="canvas-card-meta">
          <span
            className={`canvas-card-visibility ${canvas.isPublic ? "public" : "private"}`}
          >
            {canvas.isPublic ? "Public" : "Private"}
          </span>
          <span className="canvas-card-time">{timeAgo(canvas.$updatedAt ?? "")}</span>
        </div>
      </div>
    </article>
  );
}
