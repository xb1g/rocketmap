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
  onChange: (value: string) => void;
  onClose: () => void;
  onAnalyze: () => void;
  chatSection?: React.ReactNode;
}

export function BlockFocusPanel({
  blockType,
  block,
  mode,
  isAnalyzing,
  onChange,
  onClose,
  onAnalyze,
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

          {/* AI Results */}
          <BlockAIResults analysis={block.aiAnalysis} />
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
