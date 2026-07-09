"use client";

import { Suspense, useState, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/lib/oauth";
import { ErrorBanner } from "./components/ErrorBanner";
import { StaticBMC } from "./components/StaticBMC";

/* ================================================================
   DELIGHT: Mouse-following ambient glow (candlelight metaphor)
   ================================================================ */
function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;

    const handleMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const tick = () => {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      if (glowRef.current) {
        glowRef.current.style.setProperty("--mg-x", `${cx}px`);
        glowRef.current.style.setProperty("--mg-y", `${cy}px`);
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed inset-0 z-[2]"
      style={{
        background:
          "radial-gradient(600px circle at var(--mg-x) var(--mg-y), rgba(var(--primary-rgb),0.08), transparent 60%)",
      }}
    />
  );
}

/* ================================================================
   DELIGHT: Scroll-triggered reveal wrapper
   ================================================================ */
function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dirClass =
    direction === "up"
      ? "sr-up"
      : direction === "left"
        ? "sr-left"
        : direction === "right"
          ? "sr-right"
          : "sr-scale";

  return (
    <div
      ref={ref}
      className={`${dirClass} ${visible ? "sr-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="currentColor"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="currentColor"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ================================================================
   DELIGHT: TopNav with draw-underline hover & logo reaction
   ================================================================ */
function TopNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/70 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          {/* Logo mark: wax seal stamp — irregular edge, hand-pressed */}
          <div className="relative w-8 h-8 shrink-0 text-primary">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-primary">
              {/* Seal body — imperfect circle like hand-pressed wax */}
              <path
                d="M16 2.2c1.8-.1 3.6.4 5.1 1.2 1.4.7 2.6 1.8 3.6 3.1.9 1.2 1.5 2.6 1.8 4.1.3 1.5.2 3-.2 4.4-.4 1.5-1.1 2.8-2.1 3.9-1 1.2-2.3 2.1-3.7 2.7-1.6.7-3.3 1-5 1-1.7 0-3.4-.4-4.9-1.2-1.3-.7-2.5-1.7-3.4-2.9-.9-1.2-1.5-2.6-1.8-4.1-.3-1.5-.2-3 .2-4.4.4-1.4 1.1-2.7 2-3.8 1-1.2 2.2-2.1 3.6-2.8 1.3-.6 2.7-1 4.2-1.1.2 0 .4 0 .6-.1z"
                fill="currentColor"
                fillOpacity="0.1"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="1"
              />
              {/* Impression ring — stamped into wax */}
              <path
                d="M16 5.8c1.4-.1 2.8.3 4 1 1.1.6 2 1.5 2.7 2.6.6 1 .9 2.1.9 3.3 0 1.2-.3 2.3-.9 3.3-.7 1-1.6 1.8-2.7 2.4-1.2.6-2.6 1-4 1-1.4 0-2.8-.3-4-1-1.1-.6-2-1.4-2.6-2.4-.6-1-.9-2.1-.9-3.3 0-1.2.3-2.3.8-3.3.6-1.1 1.5-2 2.6-2.6 1.2-.7 2.6-1.1 4.1-1z"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="0.75"
                fill="none"
              />
              {/* Serif R initial — like an illuminated manuscript */}
              <text
                x="16"
                y="21.5"
                textAnchor="middle"
                fontSize="13.5"
                fontWeight="400"
                fill="currentColor"
                fillOpacity="0.85"
                style={{
                  fontFamily: "var(--font-display), Georgia, serif",
                  letterSpacing: "-0.02em",
                }}
              >
                R
              </text>
            </svg>
          </div>
          <span className="font-display text-lg tracking-tight text-foreground">
            RocketMap
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground-muted">
          {["Product", "Features", "Pricing"].map((label) => (
            <a
              key={label}
              href="#demo"
              className="nav-link-delve relative hover:text-foreground transition-colors duration-300"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => signInWithGoogle()}
            className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors hidden sm:block"
          >
            Log in
          </button>
          <div className="cta-glow">
            <button
              onClick={() => signInWithGoogle()}
              className="ui-btn ui-btn-primary !h-9 !px-4 text-sm border border-primary/30 hover:border-primary/50 transition-all active:translate-y-[1px] active:shadow-none"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ================================================================
   DELIGHT: How It Works — vertical timeline (avoids card-grid ban)
   ================================================================ */
const WORKS_STEPS = [
  {
    num: "01",
    title: "Map your idea",
    body: "Fill the 9-block canvas. Our AI suggests structure before you even finish typing.",
  },
  {
    num: "02",
    title: "Stress-test assumptions",
    body: "RocketMap cross-references every block for contradictions. If your revenue model contradicts your cost structure, you'll know in seconds.",
  },
  {
    num: "03",
    title: "Leave with a plan",
    body: "Export prioritized validation sprints. Know exactly what to prove next, and how.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full max-w-[1200px] px-6 md:px-8 py-28">
      <ScrollReveal>
        <div className="text-center space-y-4 mb-20">
          <span className="inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-foreground-muted/60">
            The Process
          </span>
          <h2 className="font-display text-3xl sm:text-4xl text-foreground">
            From idea to validated plan
          </h2>
          <p className="text-foreground-muted font-body text-lg max-w-2xl mx-auto leading-relaxed">
            Three stages. No fluff. Every step makes your idea more concrete.
          </p>
        </div>
      </ScrollReveal>

      <div className="relative max-w-3xl mx-auto">
        {/* Timeline connector line */}
        <div className="absolute left-[19px] md:left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-foreground/10 via-foreground/5 to-transparent" />

        <div className="space-y-16">
          {WORKS_STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 120}>
              <div className="flex gap-6 md:gap-8 group">
                {/* Step number + dot */}
                <div className="relative flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border border-border bg-canvas-surface flex items-center justify-center z-10 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.18)] transition-all duration-500">
                    <span className="font-mono text-[10px] md:text-xs font-bold text-foreground-muted group-hover:text-primary-deep transition-colors duration-500">
                      {step.num}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-1.5 md:pt-3 space-y-2">
                  <h3 className="font-display text-xl md:text-2xl text-foreground group-hover:text-primary-deep transition-colors duration-500">
                    {step.title}
                  </h3>
                  <p className="text-foreground-muted font-body leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   DELIGHT: Final CTA — dramatic closing moment
   ================================================================ */
function FinalCTA() {
  return (
    <section className="w-full relative py-32 px-6 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(var(--primary-rgb),0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(var(--primary-rgb),0.08),transparent_60%)]" />
      </div>

      <ScrollReveal className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-foreground leading-[1.1]">
          Stop guessing.
          <br />
          Start proving.
        </h2>
        <p className="text-lg sm:text-xl text-foreground-muted font-body max-w-2xl mx-auto leading-relaxed">
          Join founders who use RocketMap to turn raw ideas into structured, validated businesses.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <div className="cta-glow">
            <button
              onClick={() => signInWithGoogle()}
              className="ui-btn ui-btn-primary !h-12 !px-8 text-base w-full sm:w-auto font-medium shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_0_35px_rgba(var(--primary-rgb),0.4)] transition-all border border-primary/30 hover:border-primary/50 active:translate-y-[1px] active:shadow-none"
            >
              <GoogleIcon />
              <span className="ml-2">Continue with Google</span>
            </button>
          </div>
          <a
            href="#demo"
            className="ui-btn ui-btn-secondary !h-12 !px-8 text-base w-full sm:w-auto active:translate-y-[1px]"
          >
            Explore Demo
          </a>
        </div>

        <p className="text-xs text-foreground-muted font-mono tracking-wide opacity-80 pt-2">
          No credit card required. Free forever plan.
        </p>
      </ScrollReveal>
    </section>
  );
}

/* ================================================================
   DELIGHT: Minimal footer with craft
   ================================================================ */
function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-primary">
            <path
              d="M16 2.2c1.8-.1 3.6.4 5.1 1.2 1.4.7 2.6 1.8 3.6 3.1.9 1.2 1.5 2.6 1.8 4.1.3 1.5.2 3-.2 4.4-.4 1.5-1.1 2.8-2.1 3.9-1 1.2-2.3 2.1-3.7 2.7-1.6.7-3.3 1-5 1-1.7 0-3.4-.4-4.9-1.2-1.3-.7-2.5-1.7-3.4-2.9-.9-1.2-1.5-2.6-1.8-4.1-.3-1.5-.2-3 .2-4.4.4-1.4 1.1-2.7 2-3.8 1-1.2 2.2-2.1 3.6-2.8 1.3-.6 2.7-1 4.2-1.1.2 0 .4 0 .6-.1z"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <path
              d="M16 5.8c1.4-.1 2.8.3 4 1 1.1.6 2 1.5 2.7 2.6.6 1 .9 2.1.9 3.3 0 1.2-.3 2.3-.9 3.3-.7 1-1.6 1.8-2.7 2.4-1.2.6-2.6 1-4 1-1.4 0-2.8-.3-4-1-1.1-.6-2-1.4-2.6-2.4-.6-1-.9-2.1-.9-3.3 0-1.2.3-2.3.8-3.3.6-1.1 1.5-2 2.6-2.6 1.2-.7 2.6-1.1 4.1-1z"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="0.75"
              fill="none"
            />
            <text
              x="16"
              y="21.5"
              textAnchor="middle"
              fontSize="13.5"
              fontWeight="400"
              fill="currentColor"
              fillOpacity="0.85"
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                letterSpacing: "-0.02em",
              }}
            >
              R
            </text>
          </svg>
          <span className="font-display text-sm text-foreground/80">
            RocketMap
          </span>
        </div>

        <div className="flex items-center gap-8 text-sm text-foreground-muted/60">
          <a href="#" className="hover:text-foreground-muted transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground-muted transition-colors">
            Terms
          </a>
        </div>

        <p className="text-xs text-foreground-muted/40 font-mono">
          &copy; {new Date().getFullYear()} RocketMap
        </p>
      </div>
    </footer>
  );
}

/* ================================================================
   Main Landing Content
   ================================================================ */
function LandingContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen relative flex flex-col items-center bg-background text-foreground overflow-hidden">
      {/* Background layers */}
      <div className="landing-glow" />
      <div className="landing-grid absolute inset-0 opacity-40 pointer-events-none" />
      <div className="landing-noise" />
      <MouseGlow />

      <TopNav />

      <main className="flex-1 w-full flex flex-col items-center pt-32 pb-20 z-10">
        <ErrorBanner error={error} />

        {/* Hero Section — DELIGHT: staggered entrance */}
        <div className="max-w-4xl w-full text-center space-y-10 py-10 px-6 sm:px-12">
          <div className="relative space-y-6">
            <div className="landing-title-glow" />
            <h1 className="landing-title stagger-in stagger-2 text-5xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.1] tracking-tight mx-auto max-w-4xl">
              Stress-test your
              <br />
              startup idea in seconds.
            </h1>
            <p className="stagger-in stagger-3 text-lg sm:text-xl md:text-2xl text-foreground-muted font-body max-w-2xl mx-auto leading-relaxed">
              RocketMap is an AI-powered Business Model Canvas validation engine.
              Find contradictions before the market does.
            </p>
          </div>

          <div className="stagger-in stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <div className="cta-glow w-full sm:w-auto">
              <button
                onClick={() => signInWithGoogle()}
                className="ui-btn ui-btn-primary !h-12 !px-8 text-base w-full sm:w-auto font-medium shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_0_35px_rgba(var(--primary-rgb),0.4)] transition-all border border-primary/30 hover:border-primary/50 active:translate-y-[1px] active:shadow-none"
              >
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </button>
            </div>
            <a
              href="#demo"
              className="ui-btn ui-btn-secondary !h-12 !px-8 text-base w-full sm:w-auto active:translate-y-[1px]"
            >
              Explore Demo
            </a>
          </div>

          <p className="stagger-in stagger-5 text-xs text-foreground-muted font-mono tracking-wide opacity-80 pt-2">
            No credit card required. Free forever plan.
          </p>
        </div>

        {/* Demo Section — scroll reveal */}
        <ScrollReveal className="w-full max-w-[1200px] px-4 md:px-8 space-y-16 pt-24 pb-20">
          <div className="text-center space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">
              Interactive Canvas Engine
            </h2>
            <p className="text-foreground-muted font-body text-lg max-w-2xl mx-auto">
              Watch as AI analyzes each block, validates assumptions, and flags critical risks in real-time.
            </p>
          </div>

          <StaticBMC />
        </ScrollReveal>

        {/* How It Works */}
        <HowItWorks />

        {/* Final CTA */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
