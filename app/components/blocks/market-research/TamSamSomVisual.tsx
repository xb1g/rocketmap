'use client';

interface TamSamSomVisualProps {
  tam: number;
  sam: number;
  som: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function TamSamSomVisual({ tam, sam, som }: TamSamSomVisualProps) {
  if (!tam && !sam && !som) return null;

  // Scale circles proportionally (outer = TAM, middle = SAM, inner = SOM)
  const maxR = 110;
  const tamR = maxR;
  const samR = tam > 0 ? Math.max(40, maxR * Math.sqrt(sam / tam)) : 70;
  const somR = tam > 0 ? Math.max(20, maxR * Math.sqrt(som / tam)) : 35;

  const cx = 140;
  const cy = 130;

  return (
    <div className="flex justify-center">
      <svg width="280" height="260" viewBox="0 0 280 260">
        {/* TAM */}
        <circle cx={cx} cy={cy} r={tamR} fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
        <text x={cx} y={cy - tamR + 16} textAnchor="middle" className="fill-foreground-muted" fontSize="10" fontWeight="500">TAM</text>
        <text x={cx} y={cy - tamR + 30} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="600">{formatCurrency(tam)}</text>

        {/* SAM */}
        <circle cx={cx} cy={cy + (tamR - samR) * 0.3} r={samR} fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />
        <text x={cx} y={cy + (tamR - samR) * 0.3 - samR + 16} textAnchor="middle" className="fill-foreground-muted" fontSize="10" fontWeight="500">SAM</text>
        <text x={cx} y={cy + (tamR - samR) * 0.3 - samR + 30} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="600">{formatCurrency(sam)}</text>

        {/* SOM */}
        <circle cx={cx} cy={cy + (tamR - somR) * 0.5} r={somR} fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" />
        <text x={cx} y={cy + (tamR - somR) * 0.5 - 6} textAnchor="middle" className="fill-foreground-muted" fontSize="10" fontWeight="500">SOM</text>
        <text x={cx} y={cy + (tamR - somR) * 0.5 + 8} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="600">{formatCurrency(som)}</text>
      </svg>
    </div>
  );
}
