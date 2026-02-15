'use client';

import type { DecisionCriterion } from '@/lib/types/canvas';

interface RadarChartProps {
  criteria: DecisionCriterion[];
  size?: number;
}

const MAX_SCORE = 5;
const RINGS = [1, 2, 3, 4, 5];

export function RadarChart({ criteria, size = 280 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 40;
  const n = criteria.length;

  if (n === 0) return null;

  const angleStep = (2 * Math.PI) / n;
  // Start from top (-π/2)
  const startAngle = -Math.PI / 2;

  function polarToCart(angle: number, r: number): [number, number] {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Ring paths
  const ringPaths = RINGS.map((ring) => {
    const r = (ring / MAX_SCORE) * radius;
    const points = Array.from({ length: n }, (_, i) => {
      const angle = startAngle + i * angleStep;
      return polarToCart(angle, r);
    });
    return points.map((p) => `${p[0]},${p[1]}`).join(' ');
  });

  // Data polygon
  const dataPoints = criteria.map((c, i) => {
    const angle = startAngle + i * angleStep;
    const r = (c.score / MAX_SCORE) * radius;
    return polarToCart(angle, r);
  });
  const dataPath = dataPoints.map((p) => `${p[0]},${p[1]}`).join(' ');

  // Determine fill color based on average score
  const avg = criteria.reduce((sum, c) => sum + c.score, 0) / n;
  const fillColor = avg >= 4 ? 'rgba(16,185,129,0.15)' : avg >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)';
  const strokeColor = avg >= 4 ? 'rgba(16,185,129,0.7)' : avg >= 3 ? 'rgba(245,158,11,0.7)' : 'rgba(244,63,94,0.7)';

  // Axis lines and labels
  const axes = criteria.map((c, i) => {
    const angle = startAngle + i * angleStep;
    const [ex, ey] = polarToCart(angle, radius);
    const [lx, ly] = polarToCart(angle, radius + 18);

    // Determine text anchor based on position
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (lx < cx - 10) anchor = 'end';
    else if (lx > cx + 10) anchor = 'start';

    // Shorten long labels
    const label = c.name.length > 16 ? c.name.slice(0, 14) + '…' : c.name;

    return { ex, ey, lx, ly, anchor, label, name: c.name };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[280px] mx-auto"
    >
      {/* Grid rings */}
      {ringPaths.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.ex}
          y2={a.ey}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={dataPath}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={strokeColor} />
      ))}

      {/* Labels */}
      {axes.map((a, i) => (
        <text
          key={i}
          x={a.lx}
          y={a.ly}
          textAnchor={a.anchor}
          dominantBaseline="middle"
          className="fill-foreground-muted/60"
          style={{ fontSize: '8px', fontFamily: 'var(--font-body)' }}
        >
          <title>{a.name}</title>
          {a.label}
        </text>
      ))}
    </svg>
  );
}
