'use client';

import { useState, useCallback, useRef } from 'react';
import type { TamSamSomData, MarketSizeEstimate } from '@/lib/types/canvas';
import { TamSamSomVisual } from './TamSamSomVisual';

interface TamSamSomModuleProps {
  data: TamSamSomData | null;
  isGenerating: boolean;
  aiEnabled?: boolean;
  onGenerate: (inputs: Record<string, string>) => void;
  onSave: (data: TamSamSomData) => void;
}

const EMPTY_DATA: TamSamSomData = {
  industry: '',
  geography: '',
  targetCustomerType: '',
  tam: null,
  sam: null,
  som: null,
  reasoning: '',
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: 'text-emerald-400 bg-emerald-400/10',
    medium: 'text-amber-400 bg-amber-400/10',
    low: 'text-red-400 bg-red-400/10',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[level] ?? colors.low}`}>
      {level}
    </span>
  );
}

function EstimateSection({
  label,
  estimate,
  onChange,
}: {
  label: string;
  estimate: MarketSizeEstimate | null;
  onChange: (est: MarketSizeEstimate) => void;
}) {
  if (!estimate) return null;
  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{formatCurrency(estimate.value)}</span>
          <ConfidenceBadge level={estimate.confidence} />
        </div>
      </div>
      <textarea
        value={estimate.methodology}
        onChange={(e) => onChange({ ...estimate, methodology: e.target.value })}
        className="w-full bg-transparent text-xs text-foreground-muted resize-none outline-none"
        rows={2}
        placeholder="Methodology..."
      />
      {estimate.sources.length > 0 && (
        <div className="text-[10px] text-foreground-muted/60">
          Sources: {estimate.sources.join(', ')}
        </div>
      )}
    </div>
  );
}

export function TamSamSomModule({ data, isGenerating, aiEnabled = true, onGenerate, onSave }: TamSamSomModuleProps) {
  const current = data ?? EMPTY_DATA;
  const [industry, setIndustry] = useState(current.industry);
  const [geography, setGeography] = useState(current.geography);
  const [targetCustomerType, setTargetCustomerType] = useState(current.targetCustomerType);

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSave = useCallback(
    (updated: TamSamSomData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(updated), 800);
    },
    [onSave],
  );

  const handleEstimateChange = (key: 'tam' | 'sam' | 'som', est: MarketSizeEstimate) => {
    const updated = { ...current, [key]: est };
    debouncedSave(updated);
  };

  return (
    <div className="space-y-6">
      {/* Input fields */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Industry', value: industry, setter: setIndustry, field: 'industry' as const },
          { label: 'Geography', value: geography, setter: setGeography, field: 'geography' as const },
          { label: 'Target Customer Type', value: targetCustomerType, setter: setTargetCustomerType, field: 'targetCustomerType' as const },
        ].map(({ label, value, setter, field }) => (
          <div key={field} className="space-y-1">
            <label className="text-[10px] text-foreground-muted uppercase tracking-wider">{label}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setter(e.target.value);
                debouncedSave({ ...current, [field]: e.target.value });
              }}
              className="w-full bg-white/5 border border-white/8 rounded-md px-3 py-1.5 text-sm text-foreground outline-none focus:border-white/20 transition-colors"
              placeholder={label}
            />
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={() => onGenerate({ industry, geography, targetCustomerType })}
        disabled={isGenerating || !aiEnabled}
        className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
          isGenerating
            ? 'glow-ai text-[var(--state-ai)] border border-[var(--state-ai)]/20'
            : !aiEnabled
              ? 'glass-morphism text-foreground-muted/40 cursor-not-allowed'
              : 'glass-morphism hover:bg-white/10 text-foreground-muted hover:text-foreground'
        }`}
      >
        {isGenerating ? 'Estimating market size...' : !aiEnabled ? 'Fill all blocks to unlock AI' : 'Estimate with AI'}
      </button>

      {/* Results */}
      {(current.tam || current.sam || current.som) && (
        <div className="space-y-4">
          {/* Visual */}
          <TamSamSomVisual
            tam={current.tam?.value ?? 0}
            sam={current.sam?.value ?? 0}
            som={current.som?.value ?? 0}
          />

          {/* Estimates */}
          <div className="space-y-3">
            <EstimateSection label="TAM — Total Addressable Market" estimate={current.tam} onChange={(e) => handleEstimateChange('tam', e)} />
            <EstimateSection label="SAM — Serviceable Addressable Market" estimate={current.sam} onChange={(e) => handleEstimateChange('sam', e)} />
            <EstimateSection label="SOM — Serviceable Obtainable Market" estimate={current.som} onChange={(e) => handleEstimateChange('som', e)} />
          </div>

          {/* Reasoning */}
          {current.reasoning && (
            <div className="p-3 rounded-lg bg-white/3 space-y-1">
              <span className="text-[10px] text-foreground-muted uppercase tracking-wider">Reasoning</span>
              <textarea
                value={current.reasoning}
                onChange={(e) => debouncedSave({ ...current, reasoning: e.target.value })}
                className="w-full bg-transparent text-xs text-foreground-muted resize-none outline-none"
                rows={4}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
