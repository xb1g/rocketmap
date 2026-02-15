'use client';

import { useState } from 'react';
import type { BlockType, DeepDiveModule, MarketResearchData } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import { MarketResearchView } from './market-research/MarketResearchView';

interface DeepDiveOverlayProps {
  blockType: BlockType;
  canvasId: string;
  deepDiveData: MarketResearchData | null;
  allBlocksFilled?: boolean;
  filledCount?: number;
  onDataChange: (data: MarketResearchData) => void;
  onClose: () => void;
}

const MODULE_TABS: { key: DeepDiveModule; label: string }[] = [
  { key: 'tam_sam_som', label: 'TAM / SAM / SOM' },
  { key: 'segmentation', label: 'Segmentation' },
  { key: 'personas', label: 'Personas' },
  { key: 'market_validation', label: 'Validation' },
  { key: 'competitive_landscape', label: 'Competitors' },
];

export function DeepDiveOverlay({
  blockType,
  canvasId,
  deepDiveData,
  allBlocksFilled,
  filledCount,
  onDataChange,
  onClose,
}: DeepDiveOverlayProps) {
  const [activeModule, setActiveModule] = useState<DeepDiveModule>('tam_sam_som');
  const [generatingModule, setGeneratingModule] = useState<DeepDiveModule | null>(null);

  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  const label = def?.bmcLabel ?? blockType;

  const data: MarketResearchData = deepDiveData ?? {
    tamSamSom: null,
    segmentation: null,
    personas: null,
    marketValidation: null,
    competitiveLandscape: null,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* Full-screen overlay */}
      <div className="fixed inset-4 z-50 glass-morphism rounded-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">{label}</span>
            <span className="text-foreground-muted/40">›</span>
            <span className="text-foreground font-medium">Market Research</span>
          </div>
          <button
            onClick={onClose}
            className="ui-btn ui-btn-sm ui-btn-ghost"
          >
            Close
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 px-6 py-2 border-b border-white/5 overflow-x-auto">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveModule(tab.key)}
              className={`ui-tab-btn whitespace-nowrap ${
                activeModule === tab.key
                  ? 'is-active'
                  : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!allBlocksFilled && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="text-xs font-medium text-amber-400/80 mb-0.5">Canvas incomplete</div>
              <div className="text-[11px] text-foreground-muted/50">
                Fill all 9 blocks before running AI research.
                {filledCount !== undefined && ` (${filledCount}/9 filled)`}
                {' '}Close this panel, use the AI chat to draft your blocks, then come back.
              </div>
            </div>
          )}
          {blockType === 'customer_segments' && (
            <MarketResearchView
              activeModule={activeModule}
              data={data}
              canvasId={canvasId}
              blockType={blockType}
              generatingModule={generatingModule}
              aiEnabled={allBlocksFilled ?? false}
              onGeneratingChange={setGeneratingModule}
              onDataChange={onDataChange}
            />
          )}
        </div>
      </div>
    </>
  );
}
