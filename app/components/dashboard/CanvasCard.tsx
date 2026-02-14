'use client';

import Link from 'next/link';
import { DropdownMenu } from '@radix-ui/themes';

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
  if (mins < 1) return 'Just now';
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

  return (
    <div className="canvas-card" style={{ position: 'relative' }}>
      <Link
        href={`/canvas/${canvas.slug}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="canvas-card-title">{canvas.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="mode-badge mode-badge-bmc">BMC</span>
              <span className="canvas-card-meta">{timeAgo(canvas.$updatedAt)}</span>
            </div>
          </div>
          <div className="canvas-blocks-mini">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`canvas-blocks-mini-cell ${i < filledBlocks ? 'filled' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="canvas-progress">
          <div className="canvas-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      </Link>

      <div
        className="canvas-card-menu"
        style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                color: 'var(--foreground-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                lineHeight: 1,
              }}
            >
              &middot;&middot;&middot;
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="1" variant="soft">
            <DropdownMenu.Item>
              <Link href={`/canvas/${canvas.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
