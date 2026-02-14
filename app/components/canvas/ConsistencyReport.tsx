'use client';

interface Contradiction {
  blocks: string[];
  issue: string;
  severity: 'minor' | 'major' | 'critical';
  suggestion: string;
}

interface MissingLink {
  from: string;
  to: string;
  issue: string;
}

export interface ConsistencyData {
  contradictions: Contradiction[];
  missingLinks: MissingLink[];
  overallScore: number;
}

interface ConsistencyReportProps {
  data: ConsistencyData | null;
  isLoading: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'var(--chroma-cyan)',
  major: 'var(--chroma-amber)',
  critical: 'var(--state-critical)',
};

export function ConsistencyReport({ data, isLoading }: ConsistencyReportProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-xs text-foreground-muted text-center glow-ai rounded-lg">
        Running consistency check across all blocks...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-xs text-foreground-muted text-center">
        Run a consistency check to find cross-block issues
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div
          className="text-2xl font-display font-bold"
          style={{
            color: data.overallScore >= 70
              ? 'var(--state-healthy)'
              : data.overallScore >= 40
                ? 'var(--state-warning)'
                : 'var(--state-critical)',
          }}
        >
          {data.overallScore}
        </div>
        <div className="text-xs text-foreground-muted">Coherence Score</div>
      </div>

      {/* Contradictions */}
      {data.contradictions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
            Contradictions ({data.contradictions.length})
          </span>
          {data.contradictions.map((c, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    background: `${SEVERITY_COLORS[c.severity]}20`,
                    color: SEVERITY_COLORS[c.severity],
                  }}
                >
                  {c.severity}
                </span>
                <span className="text-[10px] text-foreground-muted">
                  {c.blocks.join(' / ')}
                </span>
              </div>
              <p className="text-xs text-foreground/80">{c.issue}</p>
              <p className="text-xs text-[var(--chroma-cyan)]/70">{c.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Missing Links */}
      {data.missingLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
            Missing Links ({data.missingLinks.length})
          </span>
          {data.missingLinks.map((ml, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/5 flex flex-col gap-1">
              <span className="text-[10px] text-foreground-muted">
                {ml.from} &rarr; {ml.to}
              </span>
              <p className="text-xs text-foreground/80">{ml.issue}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
