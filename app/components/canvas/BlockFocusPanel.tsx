'use client';

import type { BlockData, BlockType, CanvasMode } from '@/lib/types/canvas';
import { BlockFocusHeader } from './BlockFocusHeader';
import { BlockFocusEditor } from './BlockFocusEditor';
import { BlockAIResults } from './BlockAIResults';
import { BLOCK_DEFINITIONS } from './constants';

interface BlockFocusPanelProps {
  blockType: BlockType;
  block: BlockData;
  mode: CanvasMode;
  canvasId: string;
  isAnalyzing: boolean;
  allBlocksFilled?: boolean;
  filledCount?: number;
  onChange: (value: string) => void;
  onClose: () => void;
  onAnalyze: () => void;
  onDeepDive?: () => void;
  chatSection?: React.ReactNode;
}

export function BlockFocusPanel({
  blockType,
  block,
  mode,
  isAnalyzing,
  allBlocksFilled,
  filledCount,
  onChange,
  onClose,
  onAnalyze,
  onDeepDive,
  chatSection,
}: BlockFocusPanelProps) {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  const label = mode === 'lean' && def?.leanLabel ? def.leanLabel : def?.bmcLabel ?? blockType;
  const value = mode === 'lean' ? block.content.lean : block.content.bmc;

  return (
    <>
      {/* Backdrop */}
      <div className="focus-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="focus-panel glass-morphism">
        <BlockFocusHeader
          blockType={blockType}
          mode={mode}
          state={block.state}
          confidenceScore={block.confidenceScore}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          <BlockFocusEditor
            value={value}
            placeholder={`Describe your ${label.toLowerCase()}...`}
            onChange={onChange}
          />

          {/* Analyze button */}
          <div className="px-4 pb-2">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`w-full px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                isAnalyzing
                  ? 'glow-ai text-[var(--state-ai)] border border-[var(--state-ai)]/20'
                  : 'glass-morphism hover:bg-white/10 text-foreground-muted hover:text-foreground'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
            </button>
          </div>

          {/* Deep Dive button — only for customer_segments */}
          {blockType === 'customer_segments' && onDeepDive && (
            <div className="px-4 pb-2">
              {allBlocksFilled ? (
                <button
                  onClick={onDeepDive}
                  className="w-full px-4 py-2 text-xs font-medium rounded-lg glass-morphism hover:chromatic-border text-foreground-muted hover:text-foreground transition-all"
                >
                  Deep Dive — Market Research
                </button>
              ) : (
                <div className="w-full px-4 py-3 text-xs rounded-lg bg-white/3 border border-white/5">
                  <div className="text-foreground-muted/60 font-medium mb-1">
                    Deep Dive — Market Research
                  </div>
                  <div className="text-foreground-muted/40 text-[11px]">
                    Fill all 9 canvas blocks to unlock deep-dive research.
                    {filledCount !== undefined && (
                      <span className="ml-1 text-foreground-muted/50">
                        ({filledCount}/9 filled)
                      </span>
                    )}
                    <span className="block mt-1">
                      Use the AI chat below to help draft your blocks faster.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Results */}
          <BlockAIResults analysis={block.aiAnalysis} usage={block.lastUsage} />
        </div>

        {/* Chat section */}
        {chatSection && (
          <div className="border-t border-white/5">
            {chatSection}
          </div>
        )}
      </div>
    </>
  );
}
