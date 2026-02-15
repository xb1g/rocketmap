'use client';

import { useState } from 'react';
import type { DecisionCriterion, SegmentScorecard } from '@/lib/types/canvas';
import { RadarChart } from './RadarChart';
import { ScoreBar, ConfidenceDot, ScoreTierBadge } from './ScorecardHelpers';

interface DecisionMatrixProps {
  scorecard: SegmentScorecard;
  onCriterionScoreChange: (criterionId: string, score: number) => void;
  onCriterionWeightChange: (criterionId: string, weight: number) => void;
}

const CATEGORIES: { key: DecisionCriterion['category']; label: string; weight: string }[] = [
  { key: 'demand', label: 'Demand', weight: '~30%' },
  { key: 'market', label: 'Market', weight: '~40%' },
  { key: 'execution', label: 'Execution', weight: '~30%' },
];

function CriterionRow({
  criterion,
  expanded,
  onToggle,
  onScoreChange,
}: {
  criterion: DecisionCriterion;
  expanded: boolean;
  onToggle: () => void;
  onScoreChange: (score: number) => void;
}) {
  return (
    <div className="border-b border-white/3 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-2 px-1 text-left hover:bg-white/2 transition-colors"
      >
        <ConfidenceDot level={criterion.confidence} />
        <span className="text-xs text-foreground flex-1">{criterion.name}</span>
        <ScoreBar score={criterion.score} />
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-foreground-muted/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-1 pb-3 pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-[11px] text-foreground-muted/60 leading-relaxed pl-4">
            {criterion.reasoning}
          </p>
          <div className="flex items-center gap-1.5 pl-4">
            <span className="text-[9px] text-foreground-muted/40 mr-1">Score:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => onScoreChange(s)}
                className={`w-6 h-6 rounded text-[10px] font-mono transition-colors ${
                  criterion.score === s
                    ? 'bg-white/15 text-foreground border border-white/20'
                    : 'bg-white/3 text-foreground-muted/50 border border-white/5 hover:bg-white/8'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DecisionMatrix({
  scorecard,
  onCriterionScoreChange,
}: DecisionMatrixProps) {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  return (
    <div className="glass-morphism rounded-xl p-5 space-y-5">
      {/* Header with overall score */}
      <div className="flex items-center justify-between">
        <h4 className="font-display-small text-sm text-foreground">Decision Matrix</h4>
        <ScoreTierBadge score={scorecard.overallScore} />
      </div>

      {/* Radar chart */}
      <div className="flex justify-center py-2">
        <RadarChart criteria={scorecard.criteria} />
      </div>

      {/* Category breakdown */}
      {CATEGORIES.map(({ key, label, weight }) => {
        const criteria = scorecard.criteria.filter((c) => c.category === key);
        if (criteria.length === 0) return null;

        const categoryAvg = criteria.reduce((sum, c) => sum + c.score * c.weight, 0) /
          criteria.reduce((sum, c) => sum + c.weight, 0);

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display-small text-[11px] uppercase tracking-wider text-foreground-muted/70">
                {label}
              </span>
              <span className="text-[9px] font-mono text-foreground-muted/30">
                {weight}
              </span>
              <div className="flex-1" />
              <span
                className="text-[10px] font-mono"
                style={{
                  color: categoryAvg >= 4
                    ? 'var(--state-healthy)'
                    : categoryAvg >= 3
                      ? 'var(--state-warning)'
                      : 'var(--state-critical)',
                }}
              >
                {categoryAvg.toFixed(1)}
              </span>
            </div>

            <div className="rounded-lg bg-white/2 border border-white/5 overflow-hidden">
              {criteria.map((c) => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  expanded={expandedCriterion === c.id}
                  onToggle={() =>
                    setExpandedCriterion(expandedCriterion === c.id ? null : c.id)
                  }
                  onScoreChange={(score) => onCriterionScoreChange(c.id, score)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
