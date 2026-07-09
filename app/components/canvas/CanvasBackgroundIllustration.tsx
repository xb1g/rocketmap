export function CanvasBackgroundIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full -z-10"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="drafting-pattern"
          width="220"
          height="220"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(0)"
        >
          {/* Subtle dot grid */}
          <g fill="currentColor" fillOpacity="0.05">
            <circle cx="20" cy="20" r="1" />
            <circle cx="70" cy="40" r="1" />
            <circle cx="120" cy="20" r="1" />
            <circle cx="170" cy="60" r="1" />
            <circle cx="40" cy="90" r="1" />
            <circle cx="100" cy="110" r="1" />
            <circle cx="160" cy="100" r="1" />
            <circle cx="30" cy="160" r="1" />
            <circle cx="90" cy="180" r="1" />
            <circle cx="150" cy="170" r="1" />
            <circle cx="200" cy="140" r="1" />
          </g>

          {/* Compass arc in top-left of tile */}
          <g
            transform="translate(35, 35)"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            strokeOpacity="0.08"
          >
            <path d="M -28 0 A 28 28 0 0 1 0 -28" />
            <path d="M -18 0 A 18 18 0 0 1 0 -18" strokeOpacity="0.05" />
            <line x1="-24" y1="0" x2="-20" y2="0" strokeOpacity="0.12" />
            <line x1="0" y1="-24" x2="0" y2="-20" strokeOpacity="0.12" />
            <line x1="-17" y1="-17" x2="-14.5" y2="-14.5" strokeOpacity="0.08" />
          </g>

          {/* Ruler ticks along left edge of tile */}
          <g stroke="currentColor" strokeWidth="0.6" fill="none">
            <line x1="0" y1="30" x2="10" y2="30" strokeOpacity="0.09" />
            <line x1="0" y1="70" x2="6" y2="70" strokeOpacity="0.06" />
            <line x1="0" y1="110" x2="10" y2="110" strokeOpacity="0.09" />
            <line x1="0" y1="150" x2="6" y2="150" strokeOpacity="0.06" />
            <line x1="0" y1="190" x2="10" y2="190" strokeOpacity="0.09" />
          </g>

          {/* Construction circles near center-right */}
          <g
            transform="translate(155, 145)"
            stroke="currentColor"
            strokeWidth="0.7"
            fill="none"
          >
            <circle cx="0" cy="0" r="22" strokeOpacity="0.05" />
            <circle cx="0" cy="0" r="14" strokeOpacity="0.07" />
            <line x1="-18" y1="0" x2="18" y2="0" strokeOpacity="0.05" />
            <line x1="0" y1="-18" x2="0" y2="18" strokeOpacity="0.05" />
          </g>

          {/* Faint guide lines */}
          <g stroke="currentColor" strokeWidth="0.4" fill="none">
            <line x1="80" y1="0" x2="80" y2="60" strokeOpacity="0.04" />
            <line x1="0" y1="200" x2="50" y2="200" strokeOpacity="0.04" />
          </g>

          {/* Tiny accent dots using theme colors */}
          <circle cx="180" cy="35" r="1.2" fill="var(--primary)" fillOpacity="0.07" />
          <circle cx="55" cy="195" r="1" fill="var(--chroma-indigo)" fillOpacity="0.06" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#drafting-pattern)" />
    </svg>
  );
}
