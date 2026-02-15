'use client';

import { useState, useRef, useCallback } from 'react';
import type { Segment, SegmentScorecard, MarketResearchData } from '@/lib/types/canvas';
import {
  BeachheadBadge,
  ScoreTierBadge,
  ConfidenceBar,
  MetricCard,
  formatCurrency,
} from './ScorecardHelpers';

interface SegmentSnapshotProps {
  segment: Segment;
  scorecard: SegmentScorecard | null;
  deepDiveData: MarketResearchData | null;
  isScoring: boolean;
  onScore: () => void;
  onArpuChange: (arpu: number) => void;
}

export function SegmentSnapshot({
  segment,
  scorecard,
  deepDiveData,
  isScoring,
  onScore,
  onArpuChange,
}: SegmentSnapshotProps) {
  const [arpuInput, setArpuInput] = useState(
    scorecard?.arpu != null ? String(scorecard.arpu) : '',
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleArpuChange = useCallback(
    (value: string) => {
      setArpuInput(value);
      const num = Number(value);
      if (!Number.isNaN(num) && num >= 0) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => onArpuChange(num), 500);
      }
    },
    [onArpuChange],
  );

  // Pull TAM/SAM/SOM from deep dive
  const tam = deepDiveData?.tamSamSom?.tam?.value;
  const sam = deepDiveData?.tamSamSom?.sam?.value;
  const som = deepDiveData?.tamSamSom?.som?.value;

  // Compute revenue potential
  const arpu = scorecard?.arpu ?? (arpuInput ? Number(arpuInput) : null);
  const revenuePotential = som != null && arpu != null && arpu > 0
    ? som * (arpu / 100) // rough: SOM in $ * conversion
    : scorecard?.revenuePotential;

  return (
    <div className="glass-morphism rounded-xl p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-display-small text-base text-foreground flex-1">
          {segment.name}
        </h3>
        {scorecard && (
          <>
            <BeachheadBadge status={scorecard.beachheadStatus} />
            <ScoreTierBadge score={scorecard.overallScore} />
          </>
        )}
        {segment.earlyAdopterFlag && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400/70">
            EA
          </span>
        )}
      </div>

      {segment.description && (
        <p className="text-xs text-foreground-muted/60 leading-relaxed">
          {segment.description}
        </p>
      )}

      {/* Metric row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="TAM"
          value={tam != null ? formatCurrency(tam) : '—'}
          sub="Total addressable"
        />
        <MetricCard
          label="SAM"
          value={sam != null ? formatCurrency(sam) : '—'}
          sub="Serviceable"
        />
        <MetricCard
          label="SOM"
          value={som != null ? formatCurrency(som) : '—'}
          sub="Obtainable"
        />
      </div>

      {/* ARPU + Revenue potential */}
      <div className="grid grid-cols-2 gap-3">
        <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
          <div className="text-[9px] text-foreground-muted/50 uppercase tracking-wider mb-1">
            ARPU (Monthly)
          </div>
          <div className="flex items-center gap-1">
            <span className="text-foreground-muted/40 text-sm">$</span>
            <input
              value={arpuInput}
              onChange={(e) => handleArpuChange(e.target.value)}
              placeholder="—"
              className="bg-transparent text-sm font-mono text-foreground outline-none w-full"
              type="number"
              min="0"
            />
          </div>
        </div>
        <MetricCard
          label="Revenue Potential"
          value={revenuePotential != null ? formatCurrency(revenuePotential) : '—'}
          sub="SOM × ARPU estimate"
        />
      </div>

      {/* Confidence bar (only if scored) */}
      {scorecard && <ConfidenceBar value={scorecard.dataConfidence} />}

      {/* CTA */}
      {!scorecard && (() => {
        // Gate: need at least name + (description or one demographic field)
        const hasName = segment.name.trim().length >= 2;
        const hasDetail =
          (segment.description?.trim().length ?? 0) >= 10 ||
          (segment.demographics?.trim().length ?? 0) >= 5 ||
          (segment.psychographics?.trim().length ?? 0) >= 5 ||
          (segment.behavioral?.trim().length ?? 0) >= 5 ||
          (segment.geographic?.trim().length ?? 0) >= 5;
        const canScore = hasName && hasDetail;

        return canScore ? (
          <button
            onClick={onScore}
            disabled={isScoring}
            className={`w-full py-2.5 rounded-lg text-xs font-medium transition-all ${
              isScoring
                ? 'bg-[var(--chroma-indigo)]/10 text-[var(--chroma-indigo)]/60 glow-ai'
                : 'bg-[var(--chroma-indigo)]/20 text-[var(--chroma-indigo)] hover:bg-[var(--chroma-indigo)]/30'
            }`}
          >
            {isScoring ? 'AI Scoring…' : 'Score This Segment'}
          </button>
        ) : (
          <div className="px-3 py-2.5 rounded-lg bg-white/2 border border-white/5 text-[11px] text-foreground-muted/50 leading-snug">
            Add a description or demographic details to this segment before scoring.
            {!hasName && ' Segment needs a name (2+ chars).'}
          </div>
        );
      })()}
    </div>
  );
}
