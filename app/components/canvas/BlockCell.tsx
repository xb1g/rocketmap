'use client';

import type { BlockDefinition, BlockState, CanvasMode } from '@/lib/types/canvas';

interface BlockCellProps {
  definition: BlockDefinition;
  mode: CanvasMode;
  value: string;
  state: BlockState;
  isFocused: boolean;
  confidenceScore: number;
  hasAnalysis: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onExpand: () => void;
}

export function BlockCell({
  definition,
  mode,
  value,
  state,
  isFocused,
  confidenceScore,
  hasAnalysis,
  onChange,
  onFocus,
  onBlur,
  onExpand,
}: BlockCellProps) {
  const label =
    mode === 'lean' && definition.leanLabel
      ? definition.leanLabel
      : definition.bmcLabel;

  const showLeanChip =
    mode === 'lean' && definition.leanLabel !== null;

  return (
    <div
      className={`bmc-cell glass-morphism state-transition glow-${state} ${
        isFocused ? 'ring-1 ring-[var(--chroma-indigo)]/30' : ''
      }`}
      style={{
        gridColumn: definition.gridCol,
        gridRow: definition.gridRow,
      }}
    >
      <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
          {label}
        </span>
        {showLeanChip && (
          <span className="text-[8px] uppercase tracking-wider px-1 py-px rounded-full bg-[var(--chroma-indigo)]/10 text-[var(--chroma-indigo)]">
            Lean
          </span>
        )}
        <div className="flex-1" />
        {hasAnalysis && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: confidenceScore >= 0.7
                ? 'var(--state-healthy)'
                : confidenceScore >= 0.4
                  ? 'var(--state-warning)'
                  : 'var(--state-critical)',
            }}
            title={`${Math.round(confidenceScore * 100)}% confidence`}
          />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          className="text-foreground-muted hover:text-foreground transition-colors p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
          style={{ opacity: isFocused ? 1 : undefined }}
          aria-label={`Expand ${label}`}
          title="Expand"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
      <textarea
        className="bmc-cell-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={`Describe your ${label.toLowerCase()}...`}
        spellCheck={false}
      />
    </div>
  );
}
