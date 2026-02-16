'use client';

import type { SegmentEconomics } from '@/lib/types/canvas';

interface EconomicsFlowDiagramProps {
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

interface FlowNode {
  label: string;
  value: string;
  sublabel: string;
}

export function EconomicsFlowDiagram({ segment }: EconomicsFlowDiagramProps) {
  const color = STATUS_COLORS[segment.status];

  const nodes: FlowNode[] = [
    { label: 'Revenue', value: `${formatCurrency(segment.arpu)}`, sublabel: '$/mo' },
    { label: 'Acquisition', value: `${formatCurrency(segment.cac)}`, sublabel: 'CAC' },
    { label: 'Margin', value: `${segment.grossMarginPct.toFixed(0)}%`, sublabel: 'gross' },
    { label: 'Scale', value: `${segment.ltvCacRatio.toFixed(1)}x`, sublabel: 'LTV/CAC' },
  ];

  return (
    <div className="space-y-3 animate-in fade-in">
      <h4 className="font-display-small text-xs text-foreground" style={{ fontWeight: 600 }}>
        {segment.segmentName}
      </h4>

      {/* Horizontal flow */}
      <div className="flex items-center gap-0 overflow-x-auto">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-center shrink-0">
            {/* Node */}
            <div
              className="glass-morphism rounded-lg px-4 py-3 text-center min-w-[90px] border"
              style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              <div className="text-[10px] text-foreground-muted/50 uppercase tracking-wider">
                {node.label}
              </div>
              <div
                className="text-sm font-semibold mt-0.5"
                style={{ color }}
              >
                {node.value}
              </div>
              <div className="text-[10px] text-foreground-muted/50">{node.sublabel}</div>
            </div>

            {/* Arrow between nodes */}
            {i < nodes.length - 1 && (
              <svg width="28" height="16" viewBox="0 0 28 16" className="shrink-0 mx-0.5">
                <line
                  x1="2" y1="8" x2="20" y2="8"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
                <polygon
                  points="18,4 26,8 18,12"
                  fill={color}
                  fillOpacity="0.4"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Sub-metrics */}
      <div className="flex items-center gap-4 text-[10px] text-foreground-muted/50">
        <span>
          Payback: <span className="text-foreground-muted">{segment.paybackMonths.toFixed(1)} months</span>
        </span>
        <span>
          Churn: <span className="text-foreground-muted">{segment.churnRatePct.toFixed(1)}%/mo</span>
        </span>
      </div>
    </div>
  );
}
