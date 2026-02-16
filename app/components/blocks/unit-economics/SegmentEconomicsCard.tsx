'use client';

import type { SegmentEconomics } from '@/lib/types/canvas';

interface SegmentEconomicsCardProps {
  segment: SegmentEconomics;
}

const STATUS_COLORS: Record<SegmentEconomics['status'], string> = {
  healthy: 'var(--state-healthy)',
  warning: 'var(--state-warning)',
  critical: 'var(--state-critical)',
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function SegmentEconomicsCard({ segment }: SegmentEconomicsCardProps) {
  const color = STATUS_COLORS[segment.status];

  const metrics = [
    { label: 'ARPU', value: `${formatCurrency(segment.arpu)}/mo` },
    { label: 'CAC', value: formatCurrency(segment.cac) },
    { label: 'Gross Margin', value: `${segment.grossMarginPct.toFixed(0)}%` },
    { label: 'LTV', value: formatCurrency(segment.ltv) },
    { label: 'Payback', value: `${segment.paybackMonths.toFixed(1)} mo` },
    { label: 'Churn', value: `${segment.churnRatePct.toFixed(1)}%/mo` },
  ];

  return (
    <div className="glass-morphism rounded-lg p-3 space-y-3 animate-in fade-in">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-xs font-medium text-foreground truncate">
          {segment.segmentName}
        </span>
        <span
          className="text-[10px] ml-auto px-1.5 py-0.5 rounded"
          style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          {segment.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <div className="text-[10px] text-foreground-muted/50 uppercase tracking-wider">
              {m.label}
            </div>
            <div className="text-[11px] text-foreground font-medium">{m.value}</div>
          </div>
        ))}
      </div>

      {segment.methodology && (
        <p className="text-[10px] text-foreground-muted/50 leading-relaxed">
          {segment.methodology}
        </p>
      )}
    </div>
  );
}
