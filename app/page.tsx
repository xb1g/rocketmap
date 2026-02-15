"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/lib/oauth";
import { ErrorBanner } from "./components/ErrorBanner";
import styles from "./landing-github.module.css";

type BmcTone =
  | "indigo"
  | "cyan"
  | "amber"
  | "pink"
  | "blue"
  | "fuchsia"
  | "emerald";

type BmcBlock = {
  label: string;
  example: string;
  row: string;
  col: string;
  tone: BmcTone;
};

const BMC_BLOCKS: BmcBlock[] = [
  {
    label: "Key Partners",
    example: "Host networks, payment rails, insurance partners",
    row: "1 / 3",
    col: "1 / 3",
    tone: "emerald",
  },
  {
    label: "Key Activities",
    example: "Discovery, onboarding, dynamic pricing",
    row: "1 / 2",
    col: "3 / 5",
    tone: "cyan",
  },
  {
    label: "Key Resources",
    example: "Trust graph, reputation system",
    row: "2 / 3",
    col: "3 / 5",
    tone: "amber",
  },
  {
    label: "Value Propositions",
    example: "Verified stays with trusted hosts",
    row: "1 / 3",
    col: "5 / 7",
    tone: "indigo",
  },
  {
    label: "Customer Relations",
    example: "24/7 support, incident handling",
    row: "1 / 2",
    col: "7 / 9",
    tone: "pink",
  },
  {
    label: "Channels",
    example: "App and web marketplace",
    row: "2 / 3",
    col: "7 / 9",
    tone: "blue",
  },
  {
    label: "Customer Segments",
    example: "Travelers, hosts, corporate bookers",
    row: "1 / 3",
    col: "9 / 11",
    tone: "fuchsia",
  },
  {
    label: "Cost Structure",
    example: "Cloud, moderation, trust systems",
    row: "3 / 4",
    col: "1 / 6",
    tone: "amber",
  },
  {
    label: "Revenue Streams",
    example: "Service fees, commissions",
    row: "3 / 4",
    col: "6 / 11",
    tone: "emerald",
  },
];

const TONE_CLASS: Record<BmcTone, string> = {
  indigo: styles.toneIndigo,
  cyan: styles.toneCyan,
  amber: styles.toneAmber,
  pink: styles.tonePink,
  blue: styles.toneBlue,
  fuchsia: styles.toneFuchsia,
  emerald: styles.toneEmerald,
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function CrossValidateIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="4" width="10" height="10" rx="2" />
      <rect x="18" y="4" width="10" height="10" rx="2" />
      <rect x="18" y="18" width="10" height="10" rx="2" />
      <rect x="4" y="18" width="10" height="10" rx="2" />
      <line x1="14" y1="9" x2="18" y2="9" />
      <line x1="23" y1="14" x2="23" y2="18" />
      <line x1="14" y1="23" x2="18" y2="23" />
      <line x1="9" y1="14" x2="9" y2="18" />
    </svg>
  );
}

function AssumptionIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M28 20v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5" />
      <polyline points="10 13 16 19 22 13" />
      <line x1="16" y1="19" x2="16" y2="4" />
    </svg>
  );
}

function RiskIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M16 3l12 6v9c0 7-4.5 13-12 16-7.5-3-12-9-12-16V9l12-6z" />
      <path d="M16 11v5" />
      <path d="M16 21h.01" />
    </svg>
  );
}

function LandingContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleSignIn = () => {
    signInWithGoogle();
  };

  return (
    <>
      <ErrorBanner error={error} />

      {/* Grid pattern background */}
      <div className={styles.gridPattern} />

      {/* Radial glow effects */}
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <main className={styles.main}>
        {/* Asymmetric Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContainer}>
            {/* Left side: Content (60%) */}
            <div className={`${styles.heroContent} ${styles.fadeUp}`}>
              <div className={styles.badge}>
                <span className={styles.badgeDot} />
                AI Analysis Engine
              </div>

              <h1 className={styles.heroTitle}>
                Your startup idea,
                <br />
                <span className={styles.gradientText}>stress-tested by AI</span>
              </h1>

              <p className={styles.heroSubtitle}>
                AI-powered validation for Business Model Canvas. Detect
                contradictions, extract assumptions, identify fragility—before
                launch.
              </p>

              <div className={styles.ctaGroup}>
                <button onClick={handleSignIn} className={styles.btnPrimary}>
                  <GoogleIcon />
                  <span>Start validating</span>
                  <ArrowRightIcon />
                </button>
                <button className={styles.btnSecondary}>
                  <PlayIcon />
                  <span>See it work</span>
                </button>
              </div>

              {/* Trust indicators */}
              <div className={styles.trustBadges}>
                <span className={styles.trustItem}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                  No credit card required
                </span>
                <span className={styles.trustItem}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                  Free forever plan
                </span>
              </div>
            </div>

            {/* Right side: Floating BMC visual (40%) */}
            <div
              className={`${styles.heroVisual} ${styles.fadeUp} ${styles.delay1}`}
            >
              <div className={styles.floatingCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>
                    Business Model Canvas
                  </span>
                  <span className={styles.cardBadge}>
                    <span className={styles.pulsingDot} />
                    Analyzing
                  </span>
                </div>
                <div className={styles.miniGrid}>
                  {BMC_BLOCKS.slice(0, 4).map((block) => (
                    <div
                      key={block.label}
                      className={`${styles.miniBlock} ${TONE_CLASS[block.tone]}`}
                    >
                      <span className={styles.miniLabel}>{block.label}</span>
                      <div className={styles.miniSpark} />
                    </div>
                  ))}
                </div>
                <div className={styles.scanLine} />
              </div>
            </div>
          </div>
        </section>

        {/* Alternating Features Section */}
        {/* Feature 1: Left text, Right visual */}
        <section className={`${styles.featureSection} ${styles.layoutLeft}`}>
          <div className={`${styles.featureContent} ${styles.fadeLeft}`}>
            <div className={styles.featureIcon}>
              <CrossValidateIcon />
            </div>
            <h2 className={styles.featureTitle}>
              Every block
              <br />
              cross-validated
            </h2>
            <p className={styles.featureDescription}>
              AI analyzes relationships across all 9 canvas blocks. If your
              channels don&apos;t reach your segments, or revenue doesn&apos;t cover
              costs—we catch it.
            </p>
            <ul className={styles.featureList}>
              <li>Detects logical inconsistencies</li>
              <li>Validates cross-block dependencies</li>
              <li>Flags missing connections</li>
            </ul>
          </div>
          <div className={`${styles.featureVisual} ${styles.fadeRight}`}>
            <div className={styles.visualCard}>
              <div className={styles.visualHeader}>
                <span className={styles.monoLabel}>
                  consistency_check.run()
                </span>
              </div>
              <div className={styles.visualContent}>
                {[
                  "Customer Segments ↔ Channels",
                  "Value Props ↔ Revenue",
                  "Resources ↔ Activities",
                ].map((item, i) => (
                  <div
                    key={item}
                    className={styles.validationRow}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <span className={styles.checkIcon}>✓</span>
                    <span className={styles.validationText}>{item}</span>
                    <span className={styles.validationScore}>
                      {["92%", "87%", "94%"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature 2: Left visual, Right text */}
        <section className={`${styles.featureSection} ${styles.layoutRight}`}>
          <div className={`${styles.featureVisual} ${styles.fadeLeft}`}>
            <div className={styles.visualCard}>
              <div className={styles.visualHeader}>
                <span className={styles.monoLabel}>assumptions.extract()</span>
              </div>
              <div className={styles.visualContent}>
                {[
                  { text: "Users want peer hosting", risk: "High" },
                  { text: "Trust badges drive bookings", risk: "Med" },
                  { text: "Hosts accept 15% fee", risk: "High" },
                ].map((item, i) => (
                  <div
                    key={item.text}
                    className={styles.assumptionRow}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <span className={styles.assumptionText}>{item.text}</span>
                    <span
                      className={`${styles.riskBadge} ${item.risk === "High" ? styles.riskHigh : styles.riskMed}`}
                    >
                      {item.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`${styles.featureContent} ${styles.fadeRight}`}>
            <div className={styles.featureIcon}>
              <AssumptionIcon />
            </div>
            <h2 className={styles.featureTitle}>
              Hidden assumptions,
              <br />
              surfaced
            </h2>
            <p className={styles.featureDescription}>
              Your strategy runs on assumptions. We extract them, structure test
              plans, and flag the riskiest ones for validation.
            </p>
            <ul className={styles.featureList}>
              <li>AI identifies implicit assumptions</li>
              <li>Risk scoring for each assumption</li>
              <li>Structured validation tests</li>
            </ul>
          </div>
        </section>

        {/* Feature 3: Left text, Right visual */}
        <section className={`${styles.featureSection} ${styles.layoutLeft}`}>
          <div className={`${styles.featureContent} ${styles.fadeLeft}`}>
            <div className={styles.featureIcon}>
              <RiskIcon />
            </div>
            <h2 className={styles.featureTitle}>
              Stress-test before
              <br />
              the market does
            </h2>
            <p className={styles.featureDescription}>
              Shock scenarios reveal fragility. What breaks if your CAC doubles?
              Your supplier disappears? We show you before reality does.
            </p>
            <ul className={styles.featureList}>
              <li>Simulates market shock scenarios</li>
              <li>Identifies fragile components</li>
              <li>Provides mitigation strategies</li>
            </ul>
          </div>
          <div className={`${styles.featureVisual} ${styles.fadeRight}`}>
            <div className={styles.visualCard}>
              <div className={styles.visualHeader}>
                <span className={styles.monoLabel}>stress_test.simulate()</span>
              </div>
              <div className={styles.visualContent}>
                {[
                  { scenario: "CAC +100%", impact: "87" },
                  { scenario: "Churn +50%", impact: "74" },
                  { scenario: "Supplier exit", impact: "92" },
                ].map((item, i) => (
                  <div
                    key={item.scenario}
                    className={styles.stressRow}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <span className={styles.stressScenario}>
                      {item.scenario}
                    </span>
                    <div className={styles.stressBar}>
                      <div
                        className={styles.stressBarFill}
                        style={{ width: `${item.impact}%` }}
                      />
                    </div>
                    <span className={styles.stressImpact}>{item.impact}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Full BMC Grid Section */}
        <section className={styles.bmcSection}>
          <div className={styles.bmcHeader}>
            <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>
              Your entire model, validated
            </h2>
            <p
              className={`${styles.sectionSubtitle} ${styles.fadeUp} ${styles.delay1}`}
            >
              Interactive Business Model Canvas with AI analysis at every layer
            </p>
          </div>

          <div
            className={`${styles.bmcContainer} ${styles.fadeUp} ${styles.delay2}`}
          >
            <div className={styles.bmcShell}>
              {/* BMC Grid */}
              <div className={styles.bmcGrid}>
                {BMC_BLOCKS.map((block, index) => (
                  <div
                    key={block.label}
                    className={`${styles.bmcBlock} ${TONE_CLASS[block.tone]}`}
                    style={{
                      gridRow: block.row,
                      gridColumn: block.col,
                    }}
                  >
                    <span className={styles.lineNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.blockLabel}>{block.label}</span>
                    <span className={styles.blockExample}>{block.example}</span>
                    <div className={styles.blockMetrics}>
                      <span className={styles.metricItem}>
                        confidence:{" "}
                        {[87, 92, 78, 95, 84, 89, 91, 76, 88][index]}%
                      </span>
                      <span className={styles.metricItem}>
                        risks: {[2, 1, 3, 0, 2, 1, 2, 4, 1][index]}
                      </span>
                    </div>
                    <span className={styles.blockSpark} />
                  </div>
                ))}
              </div>

              {/* Scan line animation */}
              <div className={styles.scanLine} />
            </div>
          </div>
        </section>

        {/* How It Works Timeline */}
        <section className={styles.howSection}>
          <div className={styles.howHeader}>
            <h2 className={`${styles.sectionTitle} ${styles.fadeUp}`}>
              How it works
            </h2>
            <p
              className={`${styles.sectionSubtitle} ${styles.fadeUp} ${styles.delay1}`}
            >
              Three steps to a validated business model
            </p>
          </div>

          <div
            className={`${styles.timelineContainer} ${styles.fadeUp} ${styles.delay2}`}
          >
            <div className={styles.timelineLine} />
            {[
              {
                number: "01",
                title: "Map",
                description:
                  "Build your Business Model Canvas with AI-assisted content generation",
              },
              {
                number: "02",
                title: "Analyze",
                description:
                  "AI validates coherence, surfaces assumptions, identifies risk areas",
              },
              {
                number: "03",
                title: "Refine",
                description:
                  "Strengthen weak points and stress-test against shock scenarios",
              },
            ].map((step, i) => (
              <div
                key={step.number}
                className={styles.timelineStep}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className={styles.stepNumber}>{step.number}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={styles.finalCtaSection}>
          <div className={`${styles.finalCtaContainer} ${styles.fadeUp}`}>
            <h2 className={styles.finalCtaTitle}>
              Start validating
              <br />
              your startup today
            </h2>
            <p className={styles.finalCtaSubtitle}>
              Join founders who stress-test their ideas before launch
            </p>
            <button onClick={handleSignIn} className={styles.btnPrimary}>
              <GoogleIcon />
              <span>Start for free</span>
              <ArrowRightIcon />
            </button>
          </div>
        </section>
      </main>
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
