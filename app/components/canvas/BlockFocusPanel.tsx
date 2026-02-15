'use client';

import { useState } from 'react';
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
  const [contentCollapsed, setContentCollapsed] = useState(false);

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

        {/* Unified scrollable body — everything lives here */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">

          {/* Collapsible content section */}
          <div className={`shrink-0 transition-all duration-300 ease-out overflow-hidden ${
            contentCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
          }`}>
            <BlockFocusEditor
              value={value}
              placeholder={`Describe your ${label.toLowerCase()}...`}
              onChange={onChange}
            />

            {/* Action buttons */}
            <div className="px-4 pb-3 flex gap-2">
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  isAnalyzing
                    ? 'glow-ai text-[var(--state-ai)] border border-[var(--state-ai)]/20'
                    : 'glass-morphism hover:bg-white/10 text-foreground-muted hover:text-foreground'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </button>

              {blockType === 'customer_segments' && onDeepDive && allBlocksFilled && (
                <button
                  onClick={onDeepDive}
                  className="flex-1 px-4 py-2 text-xs font-medium rounded-lg glass-morphism hover:chromatic-border text-foreground-muted hover:text-foreground transition-all"
                >
                  Deep Dive
                </button>
              )}
            </div>

            {/* Deep dive gate message */}
            {blockType === 'customer_segments' && onDeepDive && !allBlocksFilled && (
              <div className="px-4 pb-3">
                <div className="px-3 py-2.5 text-[11px] rounded-lg bg-white/[0.02] border border-white/5 text-foreground-muted/50">
                  Fill all 9 blocks to unlock deep-dive research.
                  {filledCount !== undefined && (
                    <span className="ml-1 text-foreground-muted/40">
                      ({filledCount}/9)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* AI Results */}
            <BlockAIResults analysis={block.aiAnalysis} usage={block.lastUsage} />
          </div>

          {/* Divider with collapse toggle */}
          <div className="shrink-0 relative flex items-center px-4 py-1.5">
            <div className="flex-1 h-px bg-white/5" />
            <button
              onClick={() => setContentCollapsed(!contentCollapsed)}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] text-foreground-muted/40 hover:text-foreground-muted/70 hover:bg-white/5 transition-all"
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${contentCollapsed ? 'rotate-180' : ''}`}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {contentCollapsed ? 'Show content' : 'Copilot'}
            </button>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Chat — fills all remaining space */}
          {chatSection && (
            <div className="flex-1 min-h-[180px] flex flex-col">
              {chatSection}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
