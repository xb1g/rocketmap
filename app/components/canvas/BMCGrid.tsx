'use client';

import type { BlockData, BlockType, CanvasMode, Segment } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS, getBlockValue } from './constants';
import { BlockCell } from './BlockCell';

interface BMCGridProps {
  mode: CanvasMode;
  blocks: Map<BlockType, BlockData>;
  focusedBlock: BlockType | null;
  analyzingBlock: BlockType | null;
  chatTargetBlock: BlockType | null;
  dimmed: boolean;
  onBlockChange: (blockType: BlockType, value: string) => void;
  onBlockFocus: (blockType: BlockType) => void;
  onBlockBlur: () => void;
  onBlockExpand: (blockType: BlockType) => void;
  onBlockAddToChat: (blockType: BlockType) => void;
  onBlockAnalyze: (blockType: BlockType) => void;
  onSegmentClick?: (segmentId: number) => void;
  onAddSegment?: (name: string) => Promise<void>;
  onSegmentUpdate?: (segmentId: number, updates: Partial<{ name: string; description: string }>) => Promise<void>;
  onSegmentFocus?: (segmentId: number) => void;
}

export function BMCGrid({
  mode,
  blocks,
  focusedBlock,
  analyzingBlock,
  chatTargetBlock,
  dimmed,
  onBlockChange,
  onBlockFocus,
  onBlockBlur,
  onBlockExpand,
  onBlockAddToChat,
  onBlockAnalyze,
  onSegmentClick,
  onAddSegment,
  onSegmentUpdate,
  onSegmentFocus,
}: BMCGridProps) {
  return (
    <div className={`bmc-grid ${dimmed ? 'opacity-40 pointer-events-none' : ''}`} style={{ transition: 'opacity 300ms ease' }}>
      {BLOCK_DEFINITIONS.map((def) => {
        const block = blocks.get(def.type);
        const value = block
          ? getBlockValue(block.content, def.type, mode)
          : '';

        return (
          <BlockCell
            key={def.type}
            definition={def}
            mode={mode}
            value={value}
            state={block?.state ?? 'calm'}
            isFocused={focusedBlock === def.type}
            isAnalyzing={analyzingBlock === def.type}
            isChatTarget={chatTargetBlock === def.type}
            confidenceScore={block?.confidenceScore ?? 0}
            hasAnalysis={!!block?.aiAnalysis}
            linkedSegments={block?.linkedSegments}
            onChange={(v) => onBlockChange(def.type, v)}
            onFocus={() => onBlockFocus(def.type)}
            onBlur={onBlockBlur}
            onExpand={() => onBlockExpand(def.type)}
            onAddToChat={() => onBlockAddToChat(def.type)}
            onAnalyze={() => onBlockAnalyze(def.type)}
            onSegmentClick={onSegmentClick}
            onAddSegment={def.type === 'customer_segments' ? onAddSegment : undefined}
            onSegmentUpdate={def.type === 'customer_segments' ? onSegmentUpdate : undefined}
            onSegmentFocus={def.type === 'customer_segments' ? onSegmentFocus : undefined}
          />
        );
      })}
    </div>
  );
}
