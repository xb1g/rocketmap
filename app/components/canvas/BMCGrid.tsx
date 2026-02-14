'use client';

import type { BlockData, BlockType, CanvasMode } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from './constants';
import { BlockCell } from './BlockCell';

interface BMCGridProps {
  mode: CanvasMode;
  blocks: Map<BlockType, BlockData>;
  focusedBlock: BlockType | null;
  dimmed: boolean;
  onBlockChange: (blockType: BlockType, value: string) => void;
  onBlockFocus: (blockType: BlockType) => void;
  onBlockBlur: () => void;
  onBlockExpand: (blockType: BlockType) => void;
}

export function BMCGrid({
  mode,
  blocks,
  focusedBlock,
  dimmed,
  onBlockChange,
  onBlockFocus,
  onBlockBlur,
  onBlockExpand,
}: BMCGridProps) {
  return (
    <div className={`bmc-grid ${dimmed ? 'opacity-40 pointer-events-none' : ''}`} style={{ transition: 'opacity 300ms ease' }}>
      {BLOCK_DEFINITIONS.map((def) => {
        const block = blocks.get(def.type);
        const value = block
          ? mode === 'lean'
            ? block.content.lean
            : block.content.bmc
          : '';

        return (
          <BlockCell
            key={def.type}
            definition={def}
            mode={mode}
            value={value}
            state={block?.state ?? 'calm'}
            isFocused={focusedBlock === def.type}
            confidenceScore={block?.confidenceScore ?? 0}
            hasAnalysis={!!block?.aiAnalysis}
            onChange={(v) => onBlockChange(def.type, v)}
            onFocus={() => onBlockFocus(def.type)}
            onBlur={onBlockBlur}
            onExpand={() => onBlockExpand(def.type)}
          />
        );
      })}
    </div>
  );
}
