'use client';

import { useState } from 'react';
import type { BlockType, DeepDiveModule, MarketResearchData, Segment, UnitEconomicsData } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';
import { MarketResearchView } from './market-research/MarketResearchView';
import { EconomicsView } from './unit-economics/EconomicsView';
import { JTBDModule } from './jtbd/JTBDModule';
import { ValueProductView } from './value-product/ValueProductView';
import { RevenuePricingView } from './revenue-pricing/RevenuePricingView';
import { normalizeJTBDData } from '@/lib/zones/phase1-jtbd';
import type { ValueProductData as ViewValueProductData } from '@/lib/zones/phase1-value-product';
import type { RevenuePricingData as ViewRevenuePricingData } from '@/lib/zones/phase1-revenue-pricing';

interface DeepDiveOverlayProps {
  blockType: BlockType;
  canvasId: string;
  deepDiveData: MarketResearchData | null;
  segments?: Segment[];
  allBlocksFilled?: boolean;
  filledCount?: number;
  onDataChange: (data: MarketResearchData) => void;
  onClose: () => void;
}

const MARKET_RESEARCH_TABS: { key: DeepDiveModule; label: string }[] = [
  { key: 'tam_sam_som', label: 'TAM / SAM / SOM' },
  { key: 'segmentation', label: 'Segmentation' },
  { key: 'personas', label: 'Personas' },
  { key: 'market_validation', label: 'Validation' },
  { key: 'competitive_landscape', label: 'Competitors' },
];

const ECONOMICS_TABS: { key: DeepDiveModule; label: string }[] = [
  { key: 'unit_economics', label: 'Unit Economics' },
  { key: 'sensitivity_analysis', label: 'Sensitivity' },
];

const BLOCK_MODULE_TABS: Partial<Record<BlockType, { key: DeepDiveModule; label: string }[]>> = {
  customer_segments: [
    { key: 'jtbd', label: 'JTBD' },
    ...MARKET_RESEARCH_TABS,
  ],
  value_prop: [
    { key: 'jtbd', label: 'JTBD' },
    { key: 'value_product', label: 'Value / Product' },
  ],
  revenue_streams: [
    { key: 'revenue_pricing', label: 'Revenue / Pricing' },
    ...ECONOMICS_TABS,
  ],
  cost_structure: ECONOMICS_TABS,
};

const MARKET_RESEARCH_MODULES = new Set<DeepDiveModule>(
  MARKET_RESEARCH_TABS.map((tab) => tab.key),
);

function emptyDeepDiveData(): MarketResearchData {
  return {
    tamSamSom: null,
    segmentation: null,
    personas: null,
    marketValidation: null,
    competitiveLandscape: null,
  };
}

function valueProductViewData(data: MarketResearchData): ViewValueProductData {
  return {
    roleMappings: data.valueProduct?.roleMappings ?? [],
    positioning: data.valueProduct?.positioning ?? {
      customer: '',
      pain: '',
      outcome: '',
      mechanism: '',
      alternative: '',
    },
    productScopeRows: data.valueProduct?.productScopeRows ?? data.valueProduct?.productScope ?? [],
  };
}

export function DeepDiveOverlay({
  blockType,
  canvasId,
  deepDiveData,
  segments = [],
  allBlocksFilled,
  filledCount,
  onDataChange,
  onClose,
}: DeepDiveOverlayProps) {
  const moduleTabs = BLOCK_MODULE_TABS[blockType] ?? MARKET_RESEARCH_TABS;
  const [activeModule, setActiveModule] = useState<DeepDiveModule>(
    moduleTabs[0]?.key ?? 'tam_sam_som'
  );
  const [generatingModule, setGeneratingModule] = useState<DeepDiveModule | null>(null);

  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  const label = def?.bmcLabel ?? blockType;
  const overlayTitle = activeModule === 'revenue_pricing'
    ? 'Revenue / Pricing'
    : activeModule === 'value_product'
      ? 'Value / Product'
      : activeModule === 'jtbd'
        ? 'Pain + JTBD'
        : activeModule === 'unit_economics' || activeModule === 'sensitivity_analysis'
          ? 'Unit Economics'
          : 'Market Research';

  const data: MarketResearchData = deepDiveData ?? emptyDeepDiveData();
  const segmentOptions = segments.map((segment) => ({
    id: segment.$id ?? String(segment.id ?? segment.name),
    $id: segment.$id,
    name: segment.name,
  }));

  const handleSave = async (updated: MarketResearchData) => {
    onDataChange(updated);
    await fetch(`/api/canvas/${canvasId}/blocks/${blockType}/deep-dive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deepDiveJson: JSON.stringify(updated) }),
    });
  };

  const handleGenerate = async (module: DeepDiveModule, inputs?: Record<string, string>) => {
    if (!allBlocksFilled) return;
    setGeneratingModule(module);
    try {
      const res = await fetch(`/api/canvas/${canvasId}/blocks/${blockType}/deep-dive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, inputs: inputs ?? {} }),
      });
      if (res.ok) {
        const json = await res.json();
        onDataChange(json.updatedDeepDive);
      }
    } finally {
      setGeneratingModule(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/40 z-50" onClick={onClose} />

      {/* Full-screen overlay */}
      <div className="fixed inset-4 z-50 glass-morphism rounded-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">{label}</span>
            <span className="text-foreground-muted/40">›</span>
            <span className="text-foreground font-medium">{overlayTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="ui-btn ui-btn-sm ui-btn-ghost"
          >
            Close
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 px-6 py-2 border-b border-border overflow-x-auto">
          {moduleTabs.map((tab) => (
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
            <div className="mb-4 px-4 py-3 rounded-lg bg-state-warning/5 border border-state-warning/10">
              <div className="text-xs font-medium text-state-warning/80 mb-0.5">Canvas incomplete</div>
              <div className="text-[11px] text-foreground-muted/50">
                Fill all 9 blocks before running AI research.
                {filledCount !== undefined && ` (${filledCount}/9 filled)`}
                {' '}Close this panel, use the AI chat to draft your blocks, then come back.
              </div>
            </div>
          )}
          {blockType === 'customer_segments' && MARKET_RESEARCH_MODULES.has(activeModule) && (
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
          {activeModule === 'jtbd' && (
            <JTBDModule
              data={normalizeJTBDData(data.jtbd)}
              segments={segmentOptions}
              isGenerating={generatingModule === 'jtbd'}
              aiEnabled={allBlocksFilled ?? false}
              onGenerate={() => handleGenerate('jtbd')}
              onSave={(jtbd) => handleSave({ ...data, jtbd })}
            />
          )}
          {activeModule === 'value_product' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleGenerate('value_product')}
                disabled={generatingModule === 'value_product' || !allBlocksFilled}
                className={`ui-btn ui-btn-sm ui-btn-block ${
                  generatingModule === 'value_product'
                    ? 'ui-btn-secondary glow-ai text-state-ai'
                    : !allBlocksFilled
                      ? 'ui-btn-ghost text-foreground-muted/40 cursor-not-allowed'
                      : 'ui-btn-secondary text-foreground-muted hover:text-foreground'
                }`}
              >
                {generatingModule === 'value_product'
                  ? 'Generating Value / Product...'
                  : !allBlocksFilled
                    ? 'Fill all blocks to unlock AI'
                    : 'Generate Value / Product'}
              </button>
              <ValueProductView data={valueProductViewData(data)} />
            </div>
          )}
          {activeModule === 'revenue_pricing' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleGenerate('revenue_pricing')}
                disabled={generatingModule === 'revenue_pricing' || !allBlocksFilled}
                className={`ui-btn ui-btn-sm ui-btn-block ${
                  generatingModule === 'revenue_pricing'
                    ? 'ui-btn-secondary glow-ai text-state-ai'
                    : !allBlocksFilled
                      ? 'ui-btn-ghost text-foreground-muted/40 cursor-not-allowed'
                      : 'ui-btn-secondary text-foreground-muted hover:text-foreground'
                }`}
              >
                {generatingModule === 'revenue_pricing'
                  ? 'Generating Revenue / Pricing...'
                  : !allBlocksFilled
                    ? 'Fill all blocks to unlock AI'
                    : 'Generate Revenue / Pricing'}
              </button>
              <RevenuePricingView
                segments={segments}
                initialData={(data.revenuePricing ?? null) as ViewRevenuePricingData | null}
                onDataChange={(revenuePricing) => handleSave({ ...data, revenuePricing })}
              />
            </div>
          )}
          {(blockType === 'revenue_streams' || blockType === 'cost_structure') &&
            (activeModule === 'unit_economics' || activeModule === 'sensitivity_analysis') && (
            <EconomicsView
              activeModule={activeModule === 'sensitivity_analysis' ? 'sensitivity_analysis' : 'unit_economics'}
              economicsData={data.unitEconomics ?? null}
              canvasId={canvasId}
              blockType={blockType}
              aiEnabled={allBlocksFilled ?? false}
              onDataChange={(unitEconomics: UnitEconomicsData) => handleSave({ ...data, unitEconomics })}
            />
          )}
        </div>
      </div>
    </>
  );
}
