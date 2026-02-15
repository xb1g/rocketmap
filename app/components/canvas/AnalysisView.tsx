'use client';

import type { BlockData, BlockType, CanvasMode } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from './constants';
import { ConsistencyReport, type ConsistencyData } from './ConsistencyReport';
import { BlockTooltip } from './BlockTooltip';

interface AnalysisViewProps {
  blocks: Map<BlockType, BlockData>;
  mode: CanvasMode;
  consistencyData: ConsistencyData | null;
  isCheckingConsistency: boolean;
  onRunConsistencyCheck: () => void;
}

function BlockSummary({ block, mode }: { block: BlockData; mode: CanvasMode }) {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === block.blockType);
  const label = mode === 'lean' && def?.leanLabel ? def.leanLabel : def?.bmcLabel ?? block.blockType;
  const hasAnalysis = !!block.aiAnalysis;

  return (
    <div className="p-3 rounded-lg bg-white/5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {def ? (
          <BlockTooltip definition={def} mode={mode}>
            <span className="text-xs font-medium cursor-help hover:text-foreground transition-colors">
              {label}
            </span>
          </BlockTooltip>
        ) : (
          <span className="text-xs font-medium">{label}</span>
        )}
        <div className="flex items-center gap-2">
          {hasAnalysis && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: block.confidenceScore >= 0.7
                  ? 'var(--state-healthy)'
                  : block.confidenceScore >= 0.4
                    ? 'var(--state-warning)'
                    : 'var(--state-critical)',
              }}
            />
          )}
          <span className="text-[10px] text-foreground-muted">
            {hasAnalysis ? `${Math.round(block.confidenceScore * 100)}%` : 'Not analyzed'}
          </span>
        </div>
      </div>
      {hasAnalysis && block.aiAnalysis && (
        <div className="flex gap-3 text-[10px] text-foreground-muted">
          <span>{block.aiAnalysis.assumptions.length} assumptions</span>
          <span className="text-(--state-critical)">{block.aiAnalysis.risks.length} risks</span>
          <span>{block.aiAnalysis.questions.length} questions</span>
        </div>
      )}
    </div>
  );
}

export function AnalysisView({
  blocks,
  mode,
  consistencyData,
  isCheckingConsistency,
  onRunConsistencyCheck,
}: AnalysisViewProps) {
  const analyzedCount = Array.from(blocks.values()).filter((b) => b.aiAnalysis).length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-6">
      {/* Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Canvas Analysis</h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            {analyzedCount}/9 blocks analyzed
          </p>
        </div>
        <button
          onClick={onRunConsistencyCheck}
          disabled={isCheckingConsistency || analyzedCount < 2}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
            isCheckingConsistency
              ? 'glow-ai text-(--state-ai)'
              : analyzedCount < 2
                ? 'glass-morphism text-foreground-muted opacity-50 cursor-not-allowed'
                : 'glass-morphism hover:bg-white/10 text-foreground-muted hover:text-foreground'
          }`}
          title={analyzedCount < 2 ? 'Analyze at least 2 blocks first' : undefined}
        >
          {isCheckingConsistency ? 'Checking...' : 'Run Consistency Check'}
        </button>
      </div>

      {/* Block summaries */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
          Block Summaries
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {BLOCK_DEFINITIONS.map((def) => {
            const block = blocks.get(def.type);
            if (!block) return null;
            return <BlockSummary key={def.type} block={block} mode={mode} />;
          })}
        </div>
      </div>

      {/* Consistency Report */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium mb-2 block">
          Cross-Block Analysis
        </span>
        <ConsistencyReport data={consistencyData} isLoading={isCheckingConsistency} />
      </div>
    </div>
  );
}
