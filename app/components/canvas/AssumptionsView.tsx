"use client";

import { useState, useRef, useCallback } from "react";
import { BLOCK_DEFINITIONS } from "./constants";

export interface AssumptionItem {
  $id: string;
  statement: string;
  category: "market" | "product" | "ops" | "legal";
  severityScore: number;
  status: string;
  blockTypes: string[];
}

interface AssumptionsViewProps {
  canvasId: string;
  initialAssumptions: AssumptionItem[];
}

type AnalysisStep = "idle" | "loading" | "analyzing" | "saving" | "done" | "error";

const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: "loading", label: "Loading canvas" },
  { key: "analyzing", label: "AI analyzing blocks" },
  { key: "saving", label: "Saving assumptions" },
  { key: "done", label: "Complete" },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  market: { bg: "bg-blue-500/15", text: "text-blue-400" },
  product: { bg: "bg-purple-500/15", text: "text-purple-400" },
  ops: { bg: "bg-amber-500/15", text: "text-amber-400" },
  legal: { bg: "bg-red-500/15", text: "text-red-400" },
};

function getSeverityColor(score: number): string {
  if (score >= 7) return "var(--state-critical)";
  if (score >= 4) return "var(--state-warning)";
  return "var(--state-healthy)";
}

function getBlockLabel(blockType: string): string {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  return def?.bmcLabel ?? blockType.replace(/_/g, " ");
}

function StepIndicator({
  currentStep,
  savingCount,
}: {
  currentStep: AnalysisStep;
  savingCount: number;
}) {
  const stepOrder: AnalysisStep[] = ["loading", "analyzing", "saving", "done"];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
      {STEPS.map((s, i) => {
        const isActive = s.key === currentStep;
        const isDone = currentIdx > i || currentStep === "done";
        const isPending = currentIdx < i && currentStep !== "done";
        const label =
          s.key === "saving" && savingCount > 0
            ? `Saving ${savingCount} assumptions`
            : s.key === "done" && savingCount > 0
              ? `Found ${savingCount} assumptions`
              : s.label;

        return (
          <div key={s.key} className="flex items-center gap-2.5">
            {/* Icon */}
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {isDone ? (
                <svg
                  className="w-4 h-4 text-[var(--state-healthy)]"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8.5L6.5 12L13 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : isActive ? (
                <div className="w-3 h-3 rounded-full border-2 border-[var(--state-ai)] border-t-transparent animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-white/20" />
              )}
            </div>
            <span
              className={`text-sm ${
                isDone
                  ? "text-foreground-muted"
                  : isActive
                    ? "text-[var(--state-ai)] font-medium"
                    : isPending
                      ? "text-foreground-muted/50"
                      : ""
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ThinkingPanel({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M4 2L8 6L4 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          AI Reasoning
        </span>
        <span className="text-[10px] text-foreground-muted/60">
          {text.length > 0
            ? `${Math.ceil(text.split(/\s+/).length)} words`
            : ""}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 max-h-64 overflow-y-auto">
          <pre className="text-xs text-foreground-muted whitespace-pre-wrap font-mono leading-relaxed">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}

export function AssumptionsView({
  canvasId,
  initialAssumptions,
}: AssumptionsViewProps) {
  const [assumptions, setAssumptions] =
    useState<AssumptionItem[]>(initialAssumptions);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [thinking, setThinking] = useState("");
  const [savingCount, setSavingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (step !== "idle" && step !== "done" && step !== "error") return;

    setStep("loading");
    setThinking("");
    setSavingCount(0);
    setError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/assumptions/analyze`,
        { method: "POST", signal: abort.signal },
      );

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Server error (${res.status})`);
        setStep("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case "step":
                setStep(event.step as AnalysisStep);
                if (event.count != null) setSavingCount(event.count);
                break;
              case "thinking":
                setThinking((prev) => prev + event.text);
                break;
              case "done":
                if (Array.isArray(event.assumptions)) {
                  setAssumptions((prev) => [...prev, ...event.assumptions]);
                  setSavingCount(event.assumptions.length);
                }
                setStep("done");
                break;
              case "error":
                setError(event.error);
                setStep("error");
                break;
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Connection lost");
        setStep("error");
      }
    }
  }, [canvasId, step]);

  const isRunning = step !== "idle" && step !== "done" && step !== "error";

  // Sort by severity (highest first)
  const sorted = [...assumptions].sort(
    (a, b) => b.severityScore - a.severityScore,
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display-small text-lg">Assumptions</h2>
            {assumptions.length > 0 && (
              <p className="text-xs text-foreground-muted mt-0.5">
                {assumptions.length} assumption
                {assumptions.length !== 1 ? "s" : ""} tracked
              </p>
            )}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isRunning}
            className={`ui-btn ui-btn-sm ${
              isRunning
                ? "ui-btn-secondary glow-ai text-[var(--state-ai)]"
                : "ui-btn-secondary text-foreground-muted hover:text-foreground"
            }`}
          >
            {isRunning ? "Analyzing..." : "Extract Assumptions"}
          </button>
        </div>

        {sorted.length === 0 && step === "idle" && (
          <p className="text-sm text-foreground-muted">
            AI scans all blocks to surface hidden assumptions your business model
            depends on.
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Step progress */}
        {step !== "idle" && (
          <StepIndicator currentStep={step} savingCount={savingCount} />
        )}

        {/* AI reasoning (collapsible) */}
        {(isRunning || step === "done") && thinking && (
          <ThinkingPanel text={thinking} />
        )}

        {/* Empty state */}
        {sorted.length === 0 && step === "idle" && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-foreground-muted text-sm">
              No assumptions yet. Click &ldquo;Extract Assumptions&rdquo; to
              scan your canvas for hidden assumptions.
            </p>
          </div>
        )}

        {/* Assumption cards */}
        {sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((a) => {
              const catStyle = CATEGORY_STYLES[a.category] ?? {
                bg: "bg-white/10",
                text: "text-foreground-muted",
              };
              return (
                <div
                  key={a.$id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 text-sm leading-relaxed">
                      {a.statement}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}
                      >
                        {a.category}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          color: getSeverityColor(a.severityScore),
                          background: `color-mix(in srgb, ${getSeverityColor(a.severityScore)} 15%, transparent)`,
                        }}
                      >
                        {a.severityScore.toFixed(0)}/10
                      </span>
                    </div>
                  </div>
                  {a.blockTypes.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.blockTypes.map((bt) => (
                        <span
                          key={bt}
                          className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-foreground-muted"
                        >
                          {getBlockLabel(bt)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
