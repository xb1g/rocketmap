'use client';

import { useState } from 'react';
import type { Segment, SegmentScorecard } from '@/lib/types/canvas';
import { RecommendationBadge } from './ScorecardHelpers';

interface BeachheadDecisionProps {
  scorecard: SegmentScorecard;
  segments: Segment[];
  isComparing: boolean;
  comparisonResult: ComparisonResult | null;
  onCompare: (otherSegmentId: number) => void;
  onRescore: () => void;
}

export interface ComparisonResult {
  segmentAName: string;
  segmentBName: string;
  scoreDifference: number;
  betterSegment: 'A' | 'B' | 'tie';
  keyDifferences: {
    criterion: string;
    scoreA: number;
    scoreB: number;
    delta: number;
    explanation: string;
  }[];
  recommendation: string;
}

export function BeachheadDecision({
  scorecard,
  segments,
  isComparing,
  comparisonResult,
  onCompare,
  onRescore,
}: BeachheadDecisionProps) {
  const [showComparePicker, setShowComparePicker] = useState(false);
  const otherSegments = segments.filter((s) => s.id !== scorecard.segmentId);

  return (
    <div className="glass-morphism rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display-small text-sm text-foreground">Beachhead Decision</h4>
        <RecommendationBadge recommendation={scorecard.aiRecommendation} />
      </div>

      {/* AI Reasoning */}
      <p className="text-xs text-foreground-muted/70 leading-relaxed">
        {scorecard.aiReasoning}
      </p>

      {/* Key Risks */}
      {scorecard.keyRisks.length > 0 && (
        <div>
          <h5 className="text-[10px] text-foreground-muted/50 uppercase tracking-wider mb-2">
            Key Risks
          </h5>
          <ul className="space-y-1.5">
            {scorecard.keyRisks.map((risk, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-red-400/70 leading-relaxed"
              >
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-red-400/50" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Experiments */}
      {scorecard.requiredExperiments.length > 0 && (
        <div>
          <h5 className="text-[10px] text-foreground-muted/50 uppercase tracking-wider mb-2">
            Required Experiments
          </h5>
          <ul className="space-y-1.5">
            {scorecard.requiredExperiments.map((exp, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-foreground-muted/60 leading-relaxed"
              >
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded border border-white/10" />
                {exp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {otherSegments.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowComparePicker(!showComparePicker)}
              disabled={isComparing}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-foreground-muted hover:text-foreground transition-colors"
            >
              {isComparing ? 'Comparing…' : 'Compare with…'}
            </button>

            {showComparePicker && (
              <div className="absolute top-full left-0 mt-1 w-48 py-1 rounded-lg bg-[#1a1a2e] border border-white/10 shadow-xl z-10">
                {otherSegments.map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => {
                      setShowComparePicker(false);
                      onCompare(seg.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground-muted hover:bg-white/5 hover:text-foreground transition-colors"
                  >
                    {seg.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          onClick={onRescore}
          className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-foreground-muted hover:text-foreground transition-colors"
        >
          Re-score
        </button>
      </div>

      {/* Comparison Result */}
      {comparisonResult && (
        <div className="mt-3 rounded-lg bg-white/3 border border-white/8 p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {comparisonResult.segmentAName} vs {comparisonResult.segmentBName}
            </span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{
                background: comparisonResult.betterSegment === 'tie' ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.1)',
                color: comparisonResult.betterSegment === 'tie' ? 'rgba(255,255,255,0.5)' : 'rgb(16,185,129)',
              }}
            >
              {comparisonResult.betterSegment === 'tie'
                ? 'Tie'
                : `${comparisonResult.betterSegment === 'A' ? comparisonResult.segmentAName : comparisonResult.segmentBName} wins`}
            </span>
          </div>

          <p className="text-[11px] text-foreground-muted/60 leading-relaxed">
            {comparisonResult.recommendation}
          </p>

          {comparisonResult.keyDifferences.length > 0 && (
            <div className="space-y-1">
              {comparisonResult.keyDifferences.map((diff, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="text-foreground-muted/50 flex-1 truncate">
                    {diff.criterion}
                  </span>
                  <span className="font-mono text-foreground-muted/60 w-4 text-right">
                    {diff.scoreA}
                  </span>
                  <span className="text-foreground-muted/30">vs</span>
                  <span className="font-mono text-foreground-muted/60 w-4">
                    {diff.scoreB}
                  </span>
                  <span
                    className="font-mono w-6 text-right"
                    style={{
                      color: diff.delta > 0
                        ? 'var(--state-healthy)'
                        : diff.delta < 0
                          ? 'var(--state-critical)'
                          : 'var(--foreground-muted)',
                    }}
                  >
                    {diff.delta > 0 ? '+' : ''}{diff.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
