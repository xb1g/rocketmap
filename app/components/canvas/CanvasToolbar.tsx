'use client';

import Link from 'next/link';
import type { CanvasMode } from '@/lib/types/canvas';
import { InlineEditableTitle } from './InlineEditableTitle';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface CanvasToolbarProps {
  title: string;
  mode: CanvasMode;
  saveStatus: SaveStatus;
  onModeChange: (mode: CanvasMode) => void;
  onTitleChange: (title: string) => void;
  onSettingsOpen: () => void;
}

export function CanvasToolbar({
  title,
  mode,
  saveStatus,
  onModeChange,
  onTitleChange,
  onSettingsOpen,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      {/* Left: back + title + settings */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-foreground-muted hover:text-foreground transition-colors text-sm"
          aria-label="Back to dashboard"
        >
          &larr;
        </Link>
        <InlineEditableTitle value={title} onSave={onTitleChange} />
        <button
          onClick={onSettingsOpen}
          className="text-foreground-muted hover:text-foreground transition-colors text-sm p-1"
          aria-label="Canvas settings"
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Center: mode toggle */}
      <div className="flex items-center rounded-lg border border-white/10 p-0.5">
        <button
          onClick={() => onModeChange('bmc')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            mode === 'bmc'
              ? 'glass-morphism text-foreground'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          BMC
        </button>
        <button
          onClick={() => onModeChange('lean')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            mode === 'lean'
              ? 'glass-morphism text-foreground'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Lean
        </button>
      </div>

      {/* Right: save status */}
      <div className="flex items-center gap-1.5 text-xs text-foreground-muted min-w-[70px] justify-end">
        {saveStatus === 'saved' && (
          <>
            <span className="text-[var(--state-healthy)]">&#10003;</span>
            <span>Saved</span>
          </>
        )}
        {saveStatus === 'saving' && (
          <>
            <span className="animate-spin inline-block w-3 h-3 border border-foreground-muted border-t-transparent rounded-full" />
            <span>Saving</span>
          </>
        )}
        {saveStatus === 'unsaved' && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--state-warning)]" />
            <span>Unsaved</span>
          </>
        )}
      </div>
    </div>
  );
}
