'use client';

import type { BlockState, BlockType, CanvasMode } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from './constants';
import { BlockTooltip } from './BlockTooltip';

interface BlockFocusHeaderProps {
  blockType: BlockType;
  mode: CanvasMode;
  state: BlockState;
  confidenceScore: number;
  onClose: () => void;
}

const STATE_LABELS: Record<BlockState, { label: string; color: string }> = {
  calm: { label: 'Draft', color: 'var(--state-calm)' },
  healthy: { label: 'Healthy', color: 'var(--state-healthy)' },
  warning: { label: 'Warning', color: 'var(--state-warning)' },
  critical: { label: 'Critical', color: 'var(--state-critical)' },
  ai: { label: 'Analyzing', color: 'var(--state-ai)' },
};

export function BlockFocusHeader({ blockType, mode, state, confidenceScore, onClose }: BlockFocusHeaderProps) {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  const label = mode === 'lean' && def?.leanLabel ? def.leanLabel : def?.bmcLabel ?? blockType;
  const stateInfo = STATE_LABELS[state];

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
      <div className="flex items-center gap-3">
        {def ? (
          <BlockTooltip definition={def} mode={mode}>
            <h2 className="font-display font-semibold text-[15px] cursor-help decoration-dotted underline-offset-4 hover:decoration-solid hover:text-(--chroma-indigo) transition-all">
              {label}
            </h2>
          </BlockTooltip>
        ) : (
          <h2 className="font-display font-semibold text-[15px]">{label}</h2>
        )}
        <span
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
          style={{ background: `${stateInfo.color}15`, color: stateInfo.color, borderColor: `${stateInfo.color}30` }}
        >
          {stateInfo.label}
        </span>
        {confidenceScore > 0 && (
          <span className="text-[10px] font-mono text-foreground-muted">
            {Math.round(confidenceScore * 100)}% confidence
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-foreground-muted hover:text-foreground transition-colors p-1"
        aria-label="Close panel"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
