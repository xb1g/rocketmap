'use client';

import type { BeachheadStatus } from '@/lib/types/canvas';

export function BeachheadBadge({ status }: { status: BeachheadStatus }) {
  const config = {
    primary: { bg: 'bg-chroma-indigo/20', text: 'text-chroma-indigo', label: 'Primary' },
    secondary: { bg: 'bg-state-warning/15', text: 'text-state-warning', label: 'Secondary' },
    later: { bg: 'bg-foreground/5', text: 'text-foreground-muted/50', label: 'Later' },
  }[status];

  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function ScoreTierBadge({ score }: { score: number }) {
  const tier = score >= 4.0 ? 'gold' : score >= 3.0 ? 'silver' : 'red';
  const config = {
    gold: { bg: 'bg-state-healthy/15', text: 'text-state-healthy', border: 'border-state-healthy/20' },
    silver: { bg: 'bg-state-warning/15', text: 'text-state-warning', border: 'border-state-warning/20' },
    red: { bg: 'bg-state-critical/15', text: 'text-state-critical', border: 'border-state-critical/20' },
  }[tier];

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-lg border ${config.bg} ${config.text} ${config.border}`}>
      {score.toFixed(1)}
    </span>
  );
}

export function RecommendationBadge({ recommendation }: { recommendation: 'pursue' | 'test' | 'defer' }) {
  const config = {
    pursue: { bg: 'bg-state-healthy/15', text: 'text-state-healthy', border: 'border-state-healthy/20', label: 'Pursue' },
    test: { bg: 'bg-state-warning/15', text: 'text-state-warning', border: 'border-state-warning/20', label: 'Test First' },
    defer: { bg: 'bg-state-critical/15', text: 'text-state-critical', border: 'border-state-critical/20', label: 'Defer' },
  }[recommendation];

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

export function ScoreBar({ score, maxScore = 5 }: { score: number; maxScore?: number }) {
  const pct = (score / maxScore) * 100;
  const color = score >= 4 ? 'var(--state-healthy)' : score >= 3 ? 'var(--state-warning)' : 'var(--state-critical)';

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono w-4 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-foreground-muted/50 uppercase tracking-wider">Data Confidence</span>
        <span className="text-[10px] font-mono text-foreground-muted/60">{value}%</span>
      </div>
      <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, var(--state-critical), var(--state-warning), var(--state-healthy))`,
          }}
        />
      </div>
    </div>
  );
}

export function ConfidenceDot({ level }: { level: 'low' | 'medium' | 'high' }) {
  const color = { low: 'bg-state-critical/60', medium: 'bg-state-warning/60', high: 'bg-state-healthy/60' }[level];
  return <span className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} title={level} />;
}

export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-canvas-surface border border-border">
      <div className="text-[9px] font-mono text-foreground-muted/50 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-mono text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-foreground-muted/40 mt-0.5">{sub}</div>}
    </div>
  );
}

export function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}
