'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BlockData, BlockType, BlockEditProposal, CanvasMode } from '@/lib/types/canvas';
import { BlockFocusHeader } from './BlockFocusHeader';
import { BlockFocusEditor } from './BlockFocusEditor';
import { BlockAIResults } from './BlockAIResults';
import { BLOCK_DEFINITIONS, getBlockValue } from './constants';

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
  onAcceptEdit?: (proposalId: string, edits: BlockEditProposal[]) => void;
  onRejectEdit?: (proposalId: string) => void;
  chatSection?: React.ReactNode;
}

const MIN_WIDTH = 320;
const MAX_WIDTH_RATIO = 0.85;
const DEFAULT_WIDTH = 420;

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
  const value = getBlockValue(block.content, blockType, mode);
  const [contentCollapsed, setContentCollapsed] = useState(false);

  // Resizable width
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="focus-backdrop" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="focus-panel glass-morphism"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
        >
          <div className="absolute inset-y-0 left-0 w-px bg-white/8 group-hover:bg-white/20 group-active:bg-[var(--chroma-indigo)]/50 transition-colors" />
        </div>

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
                className={`flex-1 px-4 py-2 font-display-small text-[11px] uppercase tracking-wider rounded-lg transition-all ${
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
                  className="flex-1 px-4 py-2 font-display-small text-[11px] uppercase tracking-wider rounded-lg glass-morphism hover:chromatic-border text-foreground-muted hover:text-foreground transition-all"
                >
                  Deep Dive
                </button>
              )}
            </div>

            {/* Deep dive gate message */}
            {blockType === 'customer_segments' && onDeepDive && !allBlocksFilled && (
              <div className="px-4 pb-3">
                <div className="px-3 py-2.5 font-body text-[11px] rounded-lg bg-white/[0.02] border border-white/5 text-foreground-muted/50 leading-snug">
                  Fill all 9 blocks to unlock deep-dive research.
                  {filledCount !== undefined && (
                    <span className="ml-1 font-mono text-foreground-muted/40">
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
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/40 hover:text-foreground-muted/70 hover:bg-white/5 transition-all"
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${contentCollapsed ? 'rotate-180' : ''}`}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {contentCollapsed ? 'Show content' : 'Copilot Perspective'}
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
