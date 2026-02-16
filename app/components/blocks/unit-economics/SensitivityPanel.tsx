'use client';

import { useState } from 'react';
import type { BlockType, UnitEconomicsData, SensitivityResult } from '@/lib/types/canvas';

interface SensitivityPanelProps {
  economicsData: UnitEconomicsData;
  canvasId: string;
  blockType: BlockType;
  onDataChange: (data: UnitEconomicsData) => void;
}

interface Preset {
  label: string;
  parameter: string;
  delta: number;
}

const PRESETS: Preset[] = [
  { label: 'CAC +20%', parameter: 'cac', delta: 20 },
  { label: 'Churn +50%', parameter: 'churn', delta: 50 },
  { label: 'ARPU -15%', parameter: 'arpu', delta: -15 },
];

const VERDICT_STYLES: Record<SensitivityResult['verdict'], { label: string; color: string; bg: string }> = {
  survives: { label: 'Survives', color: 'var(--state-healthy)', bg: 'rgba(16,185,129,0.12)' },
  stressed: { label: 'Stressed', color: 'var(--state-warning)', bg: 'rgba(245,158,11,0.12)' },
  breaks: { label: 'Breaks', color: 'var(--state-critical)', bg: 'rgba(239,68,68,0.12)' },
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function SensitivityPanel({
  economicsData,
  canvasId,
  blockType,
  onDataChange,
}: SensitivityPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [customParam, setCustomParam] = useState('cac');
  const [customDelta, setCustomDelta] = useState(20);
  const [useCustom, setUseCustom] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const results = economicsData.sensitivityResults ?? [];

  const handleRun = async () => {
    const param = useCustom ? customParam : selectedPreset?.parameter;
    const delta = useCustom ? customDelta : selectedPreset?.delta;
    if (!param || delta === undefined) return;

    setIsRunning(true);
    try {
      const res = await fetch(`/api/canvas/${canvasId}/blocks/${blockType}/deep-dive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'sensitivity_analysis',
          inputs: {
            parameter: param,
            deltaPct: String(delta),
            existingEconomics: JSON.stringify(economicsData),
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.updatedDeepDive?.unitEconomics) {
          onDataChange(json.updatedDeepDive.unitEconomics);
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Presets */}
      <div className="space-y-2">
        <h3 className="font-display-small text-xs text-foreground-muted uppercase tracking-wider">
          Preset Scenarios
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setSelectedPreset(preset);
                setUseCustom(false);
              }}
              className={`ui-btn ui-btn-xs ${
                !useCustom && selectedPreset?.label === preset.label
                  ? 'ui-btn-secondary text-foreground'
                  : 'ui-btn-ghost text-foreground-muted'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom slider */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseCustom(!useCustom)}
            className={`text-[10px] uppercase tracking-wider ${
              useCustom ? 'text-foreground' : 'text-foreground-muted/50'
            }`}
          >
            Custom
          </button>
        </div>
        {useCustom && (
          <div className="flex items-center gap-3">
            <select
              value={customParam}
              onChange={(e) => setCustomParam(e.target.value)}
              className="bg-white/5 border border-white/8 rounded-md px-2 py-1 text-xs text-foreground outline-none"
            >
              <option value="cac">CAC</option>
              <option value="churn">Churn</option>
              <option value="arpu">ARPU</option>
              <option value="grossMargin">Gross Margin</option>
            </select>
            <input
              type="range"
              min={-100}
              max={100}
              value={customDelta}
              onChange={(e) => setCustomDelta(Number(e.target.value))}
              className="flex-1 accent-[var(--state-ai)]"
            />
            <span className="text-xs text-foreground-muted w-12 text-right">
              {customDelta > 0 ? '+' : ''}{customDelta}%
            </span>
          </div>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning || (!selectedPreset && !useCustom)}
        className={`ui-btn ui-btn-sm ui-btn-block ${
          isRunning
            ? 'ui-btn-secondary glow-ai text-[var(--state-ai)]'
            : !selectedPreset && !useCustom
              ? 'ui-btn-ghost text-foreground-muted/40 cursor-not-allowed'
              : 'ui-btn-secondary text-foreground-muted hover:text-foreground'
        }`}
      >
        {isRunning ? 'Running simulation...' : 'Run Simulation'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display-small text-xs text-foreground-muted uppercase tracking-wider">
            Results
          </h3>
          {results.map((result, i) => {
            const verdict = VERDICT_STYLES[result.verdict];
            return (
              <div key={i} className="glass-morphism rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {result.parameter}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ color: verdict.color, background: verdict.bg }}
                  >
                    {verdict.label}
                  </span>
                </div>

                {/* Before / After comparison */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="space-y-1 p-2 rounded bg-white/3">
                    <div className="text-foreground-muted/50 uppercase tracking-wider">Original</div>
                    <div className="text-foreground-muted">
                      LTV/CAC: {result.original.ltvCacRatio.toFixed(1)}x
                    </div>
                    <div className="text-foreground-muted">
                      LTV: {formatCurrency(result.original.ltv)}
                    </div>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-white/3">
                    <div className="text-foreground-muted/50 uppercase tracking-wider">Adjusted</div>
                    <div style={{ color: verdict.color }}>
                      LTV/CAC: {result.adjusted.ltvCacRatio.toFixed(1)}x
                    </div>
                    <div style={{ color: verdict.color }}>
                      LTV: {formatCurrency(result.adjusted.ltv)}
                    </div>
                  </div>
                </div>

                {result.impact && (
                  <p className="text-[10px] text-foreground-muted/50 leading-relaxed">
                    {result.impact}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
