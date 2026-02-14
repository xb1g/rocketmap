'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/oauth';
import { ErrorBanner } from './components/ErrorBanner';

/*
 * Standard BMC layout on a 10-col × 3-row grid.
 * Top 2 rows are taller (main blocks), bottom row is shorter (finances).
 * Columns: KP(2) | KA/KR(2) | VP(2) | CR/CH(2) | CS(2)
 */
const BMC_BLOCKS = [
  { label: 'Key Partners',       abbr: 'KP', row: '1 / 3', col: '1 / 3' },
  { label: 'Key Activities',     abbr: 'KA', row: '1 / 2', col: '3 / 5' },
  { label: 'Key Resources',      abbr: 'KR', row: '2 / 3', col: '3 / 5' },
  { label: 'Value Propositions', abbr: 'VP', row: '1 / 3', col: '5 / 7' },
  { label: 'Customer Relations', abbr: 'CR', row: '1 / 2', col: '7 / 9' },
  { label: 'Channels',           abbr: 'CH', row: '2 / 3', col: '7 / 9' },
  { label: 'Customer Segments',  abbr: 'CS', row: '1 / 3', col: '9 / 11' },
  { label: 'Cost Structure',     abbr: 'C$', row: '3 / 4', col: '1 / 6' },
  { label: 'Revenue Streams',    abbr: 'R$', row: '3 / 4', col: '6 / 11' },
];

/*
 * SVG connection lines showing cross-block relationships.
 * Each path goes from one block's edge to another, drawn at percentage
 * coordinates so they scale with the container.
 */
function ConnectionLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      fill="none"
    >
      <defs>
        <linearGradient id="conn-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(99,102,241,0)" />
          <stop offset="50%" stopColor="rgba(99,102,241,0.18)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </linearGradient>
        <linearGradient id="conn-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(6,182,212,0)" />
          <stop offset="50%" stopColor="rgba(6,182,212,0.14)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0)" />
        </linearGradient>
        <linearGradient id="conn-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(236,72,153,0)" />
          <stop offset="50%" stopColor="rgba(236,72,153,0.12)" />
          <stop offset="100%" stopColor="rgba(236,72,153,0)" />
        </linearGradient>
        <linearGradient id="conn-vert" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(99,102,241,0)" />
          <stop offset="50%" stopColor="rgba(99,102,241,0.12)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </linearGradient>
      </defs>

      {/* KA → VP  (Key Activities feeds Value Propositions) */}
      <line x1="40" y1="18" x2="50" y2="33" stroke="url(#conn-indigo)" strokeWidth="0.3" />

      {/* VP → CR  (Value Props reach customers through Relations) */}
      <line x1="60" y1="25" x2="70" y2="18" stroke="url(#conn-cyan)" strokeWidth="0.3" />

      {/* CR → CS  (Customer Relations connect to Customer Segments) */}
      <line x1="80" y1="18" x2="90" y2="25" stroke="url(#conn-indigo)" strokeWidth="0.3" />

      {/* KP → KA  (Partners enable Activities) */}
      <line x1="20" y1="25" x2="30" y2="18" stroke="url(#conn-cyan)" strokeWidth="0.3" />

      {/* KR → VP  (Resources power Value Propositions) */}
      <line x1="40" y1="50" x2="50" y2="40" stroke="url(#conn-pink)" strokeWidth="0.3" />

      {/* CH → CS  (Channels reach Customer Segments) */}
      <line x1="80" y1="50" x2="90" y2="40" stroke="url(#conn-pink)" strokeWidth="0.3" />

      {/* VP → C$  (Value Propositions drive Cost Structure) */}
      <line x1="45" y1="62" x2="30" y2="78" stroke="url(#conn-vert)" strokeWidth="0.3" />

      {/* VP → R$  (Value Propositions generate Revenue) */}
      <line x1="55" y1="62" x2="70" y2="78" stroke="url(#conn-vert)" strokeWidth="0.3" />

      {/* Connection dots at intersections */}
      <circle cx="50" cy="33" r="0.5" fill="rgba(99,102,241,0.25)" />
      <circle cx="70" cy="18" r="0.5" fill="rgba(6,182,212,0.2)" />
      <circle cx="30" cy="18" r="0.5" fill="rgba(6,182,212,0.2)" />
      <circle cx="45" cy="62" r="0.5" fill="rgba(99,102,241,0.2)" />
      <circle cx="55" cy="62" r="0.5" fill="rgba(99,102,241,0.2)" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function LandingContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleSignIn = () => {
    signInWithGoogle();
  };

  return (
    <>
      <ErrorBanner error={error} />

      {/* Atmosphere layers */}
      <div className="landing-glow" />
      <div className="landing-noise" />

      <div className="relative z-10 min-h-screen landing-grid flex flex-col items-center justify-center px-6 overflow-hidden">

        {/* Hero section */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

          {/* Status tag */}
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="tag-pill font-mono">
              <span className="tag-pill-dot" />
              AI-Powered Validation Engine
            </span>
          </div>

          {/* Title */}
          <div className="relative mt-8 mb-6 fade-up" style={{ animationDelay: '0.25s' }}>
            <div className="landing-title-glow" />
            <h1 className="landing-title font-display text-7xl sm:text-8xl md:text-9xl font-light tracking-tight leading-none select-none">
              RocketMap
            </h1>
          </div>

          {/* Tagline */}
          <p
            className="fade-up font-body text-base sm:text-lg text-[#7a7a8a] max-w-md leading-relaxed tracking-wide"
            style={{ animationDelay: '0.4s' }}
          >
            Stress-test your startup before the market does.
            <br />
            <span className="text-[#9595a8]">A playable business model engine.</span>
          </p>

          {/* CTA */}
          <div className="fade-up mt-10" style={{ animationDelay: '0.55s' }}>
            <button
              onClick={handleSignIn}
              className="cta-glow group relative inline-flex items-center gap-3 px-7 py-3.5 rounded-xl
                         bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm
                         text-sm font-body font-medium tracking-wide text-white/80
                         hover:bg-white/[0.1] hover:border-white/[0.14] hover:text-white
                         transition-all duration-300 cursor-pointer"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                className="ml-1 opacity-40 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-300"
              >
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Divider */}
        <hr
          className="landing-rule fade-up w-full max-w-2xl mt-20 mb-14"
          style={{ animationDelay: '0.65s' }}
        />

        {/* BMC Preview Grid */}
        <div
          className="fade-up relative w-full max-w-2xl"
          style={{ animationDelay: '0.75s' }}
        >
          {/* Section label */}
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#555566]">
              Business Model Canvas
            </span>
            <div className="flex-1 h-px bg-white/[0.04]" />
            <span className="font-mono text-[10px] text-[#444455]">9 blocks</span>
          </div>

          {/* Grid — 10 columns, proper BMC proportions */}
          <div
            className="relative grid gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(10, 1fr)',
              gridTemplateRows: '64px 64px 48px',
            }}
          >
            {/* Connection lines between blocks */}
            <ConnectionLines />

            {/* Scanline effect */}
            <div className="bmc-scanline" />

            {BMC_BLOCKS.map((block, i) => (
              <div
                key={block.label}
                className="bmc-block px-3 py-2.5 fade-up flex flex-col justify-between"
                style={{
                  gridRow: block.row,
                  gridColumn: block.col,
                  animationDelay: `${0.85 + i * 0.06}s`,
                }}
              >
                <span className="relative z-10 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-white/25 leading-tight">
                  {block.label}
                </span>
                <span className="relative z-10 font-mono text-[8px] text-white/10 self-end">
                  {block.abbr}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom caption */}
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="font-mono text-[10px] text-[#444455]">
              AI cross-validates every block
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]/30" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className="fade-up mt-20 mb-8 text-center"
          style={{ animationDelay: '1.4s' }}
        >
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/15">
            Not a template filler — a judgment amplifier
          </p>
        </footer>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
