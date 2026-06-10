"use client";

import { useState, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { AssumptionStatus, ViabilityData } from "@/lib/types/canvas";
import { hasInvalidatedCriticalAssumptions } from "@/lib/utils/viability";

interface ViabilityScoreProps {
  canvasId: string;
  allBlocksFilled: boolean;
  initialData: ViabilityData | null;
  isOutdated?: boolean;
  readOnly?: boolean;
  onExplainClick: () => void;
  onDataChange?: (data: ViabilityData) => void;
  onNavigateToAssumption?: (assumptionId: string) => void;
}

type ViabilityStatus =
  | "not_calculated"
  | "calculating"
  | "calculated"
  | "outdated"
  | "error";

function getBadgeState(data: ViabilityData): "calm" | "healthy" | "warning" {
  if (hasInvalidatedCriticalAssumptions(data.unlockSteps)) return "warning";
  if (data.score >= 75) return "healthy";
  return "calm";
}

function getStatusIcon(status: AssumptionStatus): string {
  switch (status) {
    case "validated":
      return "\u2713";
    case "refuted":
    case "inconclusive":
      return "\u2717";
    case "testing":
      return "\u25D0";
    default:
      return "\u25CB";
  }
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
}

export function ViabilityScore({
  canvasId,
  allBlocksFilled,
  initialData,
  isOutdated = false,
  readOnly = false,
  onExplainClick,
  onDataChange,
  onNavigateToAssumption,
}: ViabilityScoreProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status: ViabilityStatus = isCalculating
    ? "calculating"
    : error
      ? "error"
      : !initialData
        ? "not_calculated"
        : isOutdated
          ? "outdated"
          : "calculated";

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const res = await fetch(`/api/canvas/${canvasId}/viability`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to calculate viability");
      }

      const { viability } = await res.json();
      onDataChange?.(viability);
    } catch (err) {
      console.error("Viability calculation error:", err);
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setIsCalculating(false);
    }
  }, [canvasId, onDataChange]);

  const handleRefresh = useCallback(() => {
    handleCalculate();
  }, [handleCalculate]);

  if (!allBlocksFilled || readOnly) return null;

  if (status === "not_calculated" || status === "error") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCalculate}
          className="ui-btn ui-btn-sm ui-btn-primary flex items-center gap-1.5"
        >
          Calculate Evidence
        </button>
        {error && (
          <span className="text-xs text-[#f43f5e]" title={error}>
            Error
          </span>
        )}
      </div>
    );
  }

  if (status === "calculating") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="animate-spin inline-block w-3 h-3 border border-foreground-muted border-t-transparent rounded-full" />
          <span className="text-xs text-foreground-muted uppercase tracking-wider">
            Analyzing...
          </span>
        </div>
      </div>
    );
  }

  if (!initialData) return null;

  const badgeState = getBadgeState(initialData);
  const potentialScore = initialData.potentialScore ?? initialData.score;
  const hasPotential = potentialScore > initialData.score;
  const timeAgo = getTimeAgo(initialData.calculatedAt);
  const unlockSteps = initialData.unlockSteps ?? [];
  const factorsUp = initialData.factorsUp ?? [];
  const factorsDown = initialData.factorsDown ?? [];
  const pendingSteps = unlockSteps.filter((s) => s.status === "untested" || s.status === "testing");

  return (
    <Popover.Root>
      <div className="flex items-center gap-2">
        <Popover.Trigger asChild>
          <button
            className={`viability-potential-badge viability-potential-badge--${badgeState} ${
              status === "outdated" ? "opacity-80" : ""
            }`}
          >
            <span className="viability-potential-current">{initialData.score}</span>
            {hasPotential && (
              <>
                <span className="viability-potential-arrow">→</span>
                <span className="viability-potential-ceiling">{potentialScore}</span>
              </>
            )}
            <span className="viability-potential-track" aria-hidden>
              <span
                className="viability-potential-fill"
                style={{ width: `${initialData.score}%` }}
              />
              {hasPotential && (
                <span
                  className="viability-potential-ghost"
                  style={{
                    left: `${initialData.score}%`,
                    width: `${potentialScore - initialData.score}%`,
                  }}
                />
              )}
            </span>
          </button>
        </Popover.Trigger>

        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted">
          Evidence
        </span>

        {status === "outdated" && (
          <span className="px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-mono uppercase tracking-wider rounded border border-[#f59e0b]/30">
            Outdated
          </span>
        )}

        <button
          onClick={handleRefresh}
          className={`ui-btn ui-btn-xs ui-btn-ghost ${
            status === "outdated" ? "animate-pulse" : ""
          }`}
          title="Refresh evidence score"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>

        <button
          onClick={onExplainClick}
          className="ui-btn ui-btn-xs ui-btn-ghost"
          title="Explain evidence score"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>

      <Popover.Portal>
        <Popover.Content
          className="glass-morphism border border-white/15 rounded-xl p-0 w-[380px] shadow-2xl z-50 overflow-hidden"
          sideOffset={8}
          align="end"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
            <div className="shrink-0 font-mono text-lg font-bold text-foreground">
              {initialData.score}
              {hasPotential && (
                <span className="text-sm font-normal text-foreground-muted">
                  {" "}
                  → {potentialScore}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground">Evidence</div>
              <div className="text-[10px] text-foreground-muted/70 mt-0.5">
                Assumptions {initialData.breakdown.assumptions}% · Market{" "}
                {initialData.breakdown.market}% · Need {initialData.breakdown.unmetNeed}%
              </div>
            </div>
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {(initialData.verdict || initialData.reasoning) && (
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-[11px] text-foreground/75 leading-relaxed">
                  {initialData.verdict || initialData.reasoning}
                </p>
              </div>
            )}

            {(factorsUp.length > 0 || factorsDown.length > 0) && (
              <div className="px-4 py-3 border-b border-white/5 space-y-1.5">
                {factorsUp.map((f, i) => (
                  <div key={`up-${i}`} className="flex items-start gap-2">
                    <span className="text-[#10b981] text-[11px] mt-px shrink-0">
                      ✦
                    </span>
                    <span className="text-[11px] text-foreground/70 leading-relaxed">
                      {f}
                    </span>
                  </div>
                ))}
                {factorsDown.map((f, i) => (
                  <div key={`down-${i}`} className="flex items-start gap-2">
                    <span className="text-[#f43f5e] text-[11px] mt-px shrink-0">
                      ✗
                    </span>
                    <span className="text-[11px] text-foreground/70 leading-relaxed">
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {initialData.ceiling && (
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-foreground-muted/50 font-semibold mr-2">
                  Ceiling
                </span>
                <span className="text-[11px] text-foreground/60 leading-relaxed">
                  {initialData.ceiling}
                </span>
              </div>
            )}

            <div className="px-4 py-3 border-b border-white/5">
              <div className="text-xs font-semibold text-foreground mb-2">
                Unlock path
                {pendingSteps.length > 0 && (
                  <span className="text-foreground-muted font-normal">
                    {" "}
                    ({pendingSteps.length} remaining)
                  </span>
                )}
              </div>
              {unlockSteps.length === 0 ? (
                <p className="text-xs text-foreground-muted">
                  Calculate evidence to see which assumption tests unlock potential.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {unlockSteps.map((step) => {
                    const isDone = step.status === "validated";
                    const isFailed =
                      step.status === "refuted" || step.status === "inconclusive";
                    return (
                      <button
                        key={step.assumptionId}
                        type="button"
                        onClick={() => onNavigateToAssumption?.(step.assumptionId)}
                        className="w-full text-left rounded-md border border-white/8 bg-white/[0.02] px-2.5 py-2 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={
                              isDone
                                ? "text-[#10b981]"
                                : isFailed
                                  ? "text-[#f43f5e]"
                                  : "text-foreground-muted"
                            }
                          >
                            {getStatusIcon(step.status)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-foreground line-clamp-2">
                                {step.assumption}
                              </span>
                              <span
                                className={`shrink-0 font-mono text-[10px] ${
                                  isDone ? "text-[#10b981]" : "text-[var(--state-ai)]"
                                }`}
                              >
                                {isDone ? "done" : `+${step.upliftPoints}%`}
                              </span>
                            </div>
                            {step.suggestedTest && !isDone && (
                              <p className="text-[10px] text-foreground-muted mt-0.5 line-clamp-2">
                                {step.suggestedTest}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {initialData.whatAbout && (
              <div className="px-4 py-3">
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-foreground-muted/50 font-semibold mb-1.5">
                    What about
                  </div>
                  <p className="text-[11px] text-foreground/80 leading-relaxed mb-2">
                    {initialData.whatAbout}
                  </p>
                  <button
                    type="button"
                    onClick={onExplainClick}
                    className="text-[10px] text-[var(--chroma-indigo)] hover:underline flex items-center gap-1"
                  >
                    Discuss this
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-white/8 flex items-center justify-between">
            <span className="text-[10px] text-foreground-muted/40">
              {timeAgo}
            </span>
            <button onClick={onExplainClick} className="ui-btn ui-btn-xs ui-btn-primary">
              Ask AI →
            </button>
          </div>

          <Popover.Arrow className="fill-white/10" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
