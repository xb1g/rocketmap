'use client';

import { useState } from 'react';
import type { EconomicsAlert } from '@/lib/types/canvas';

interface AlertsSectionProps {
  alerts: EconomicsAlert[];
}

const SEVERITY_STYLES: Record<EconomicsAlert['severity'], { icon: string; color: string; bg: string }> = {
  critical: { icon: '\u2297', color: 'var(--state-critical)', bg: 'rgba(239,68,68,0.08)' },
  warning: { icon: '\u26A0', color: 'var(--state-warning)', bg: 'rgba(245,158,11,0.08)' },
  info: { icon: '\u24D8', color: 'var(--state-ai)', bg: 'rgba(56,189,248,0.08)' },
};

export function AlertsSection({ alerts }: AlertsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const visible = expanded ? alerts : alerts.slice(0, 3);
  const hasMore = alerts.length > 3;

  return (
    <div className="space-y-2 animate-in fade-in">
      <h3 className="font-display-small text-xs text-foreground-muted uppercase tracking-wider">
        Alerts
      </h3>
      <div className="space-y-1.5">
        {visible.map((alert, i) => {
          const style = SEVERITY_STYLES[alert.severity];
          return (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 rounded-lg border border-white/8"
              style={{ background: style.bg }}
            >
              <span
                className="text-sm mt-0.5 shrink-0"
                style={{ color: style.color }}
              >
                {style.icon}
              </span>
              <span className="text-xs text-foreground-muted leading-relaxed">
                {alert.message}
              </span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-foreground-muted/50 hover:text-foreground-muted transition-colors"
        >
          {expanded ? 'Show less' : `+${alerts.length - 3} more alerts`}
        </button>
      )}
    </div>
  );
}
