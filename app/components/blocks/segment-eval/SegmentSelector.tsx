'use client';

import type { Segment, SegmentScorecard, BeachheadStatus } from '@/lib/types/canvas';

interface SegmentSelectorProps {
  segments: Segment[];
  scorecards: SegmentScorecard[];
  selectedSegmentId: number | null;
  onSelect: (segmentId: number) => void;
  onCreateNew: () => void;
}

function beachheadDot(status: BeachheadStatus) {
  const colors = {
    primary: 'bg-[var(--chroma-indigo)]',
    secondary: 'bg-amber-400',
    later: 'bg-white/20',
  };
  return colors[status];
}

export function SegmentSelector({
  segments,
  scorecards,
  selectedSegmentId,
  onSelect,
  onCreateNew,
}: SegmentSelectorProps) {
  // Sort: scored segments first (by score desc), then unscored
  const sorted = [...segments].sort((a, b) => {
    const scA = scorecards.find((s) => s.segmentId === a.id);
    const scB = scorecards.find((s) => s.segmentId === b.id);
    if (scA && !scB) return -1;
    if (!scA && scB) return 1;
    if (scA && scB) return scB.overallScore - scA.overallScore;
    return 0;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-white/5">
        <span className="font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/60">
          Segments
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sorted.map((seg) => {
          const scorecard = scorecards.find((s) => s.segmentId === seg.id);
          const isSelected = selectedSegmentId === seg.id;

          return (
            <button
              key={seg.id}
              onClick={() => onSelect(seg.id)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                isSelected
                  ? 'bg-white/8 border-r-2 border-r-[var(--chroma-indigo)]'
                  : 'hover:bg-white/4'
              }`}
            >
              {scorecard ? (
                <span className={`w-2 h-2 rounded-full shrink-0 ${beachheadDot(scorecard.beachheadStatus)}`} />
              ) : (
                <span className="w-2 h-2 rounded-full shrink-0 bg-white/10" />
              )}
              <span className="flex-1 text-xs text-foreground truncate">
                {seg.name}
              </span>
              {scorecard && (
                <span
                  className="text-[10px] font-mono shrink-0"
                  style={{
                    color: scorecard.overallScore >= 4
                      ? 'var(--state-healthy)'
                      : scorecard.overallScore >= 3
                        ? 'var(--state-warning)'
                        : 'var(--state-critical)',
                  }}
                >
                  {scorecard.overallScore.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-white/5">
        <button
          onClick={onCreateNew}
          className="w-full text-[10px] text-foreground-muted/50 hover:text-foreground py-1.5 transition-colors"
        >
          + New Segment
        </button>
      </div>
    </div>
  );
}
