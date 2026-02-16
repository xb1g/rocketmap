"use client";

import { useState, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { ViabilityData } from "@/lib/types/canvas";

interface ViabilityScoreProps {
  canvasId: string;
  allBlocksFilled: boolean;
  initialData: ViabilityData | null;
  readOnly?: boolean;
  onExplainClick: () => void;
  onDataChange?: (data: ViabilityData) => void;
}

type ViabilityStatus =
  | "not_calculated"
  | "calculating"
  | "calculated"
  | "outdated"
  | "error";

const CLAUDE_MASCOT = ` \u25D0\u2589\u2589\u2589\u2589\u25D1
\u2599\u2589\u2589\u2589\u2589\u2589\u259D
  \u2598\u2598 \u259D\u259D`;

function getScoreColor(score: number) {
  if (score < 50)
    return {
      bg: "bg-[#f43f5e]",
      text: "text-white",
      glow: "glow-critical",
      label: "Not Viable",
    };
  if (score < 75)
    return {
      bg: "bg-[#f59e0b]",
      text: "text-white",
      glow: "glow-warning",
      label: "Medium",
    };
  return {
    bg: "bg-[#10b981]",
    text: "text-white",
    glow: "glow-healthy",
    label: "High Viability",
  };
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
  readOnly = false,
  onExplainClick,
  onDataChange,
}: ViabilityScoreProps) {
  const [data, setData] = useState<ViabilityData | null>(initialData);
  const [status, setStatus] = useState<ViabilityStatus>(
    initialData ? "calculated" : "not_calculated"
  );
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(async () => {
    setStatus("calculating");
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
      setData(viability);
      setStatus("calculated");
      onDataChange?.(viability);
    } catch (err) {
      console.error("Viability calculation error:", err);
      setError(err instanceof Error ? err.message : "Calculation failed");
      setStatus("error");
    }
  }, [canvasId, onDataChange]);

  const handleRefresh = useCallback(() => {
    handleCalculate();
  }, [handleCalculate]);

  // Don't render if blocks not filled or in read-only mode
  if (!allBlocksFilled || readOnly) return null;

  // State: Not Calculated
  if (status === "not_calculated" || status === "error") {
    return (
      <div className="flex items-center gap-2">
        <pre className="font-mono text-[10px] leading-tight opacity-60 select-none">
          {CLAUDE_MASCOT}
        </pre>
        <button
          onClick={handleCalculate}
          className="ui-btn ui-btn-sm ui-btn-primary flex items-center gap-1.5"
        >
          Calculate Viability
        </button>
        {error && (
          <span className="text-xs text-[#f43f5e]" title={error}>
            Error
          </span>
        )}
      </div>
    );
  }

  // State: Calculating
  if (status === "calculating") {
    return (
      <div className="flex items-center gap-2">
        <pre className="font-mono text-[10px] leading-tight opacity-60 select-none">
          {CLAUDE_MASCOT}
        </pre>
        <div className="flex items-center gap-1.5">
          <span className="animate-spin inline-block w-3 h-3 border border-foreground-muted border-t-transparent rounded-full" />
          <span className="text-xs text-foreground-muted uppercase tracking-wider">
            Analyzing...
          </span>
        </div>
      </div>
    );
  }

  // State: Calculated or Outdated
  if (!data) return null;

  const colors = getScoreColor(data.score);
  const timeAgo = getTimeAgo(data.calculatedAt);

  return (
    <Popover.Root>
      <div className="flex items-center gap-2">
        <pre className="font-mono text-[10px] leading-tight opacity-60 select-none">
          {CLAUDE_MASCOT}
        </pre>

        <Popover.Trigger asChild>
          <button
            className={`${colors.bg} ${colors.text} ${colors.glow} px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-all hover:scale-105 cursor-pointer`}
          >
            {data.score}%
          </button>
        </Popover.Trigger>

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
          title="Refresh viability score"
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
          title="Explain viability score"
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
          className="glass-morphism backdrop-blur-2xl bg-[#0f0f23]/95 border border-white/20 rounded-lg p-4 max-w-md shadow-2xl z-50"
          sideOffset={8}
          align="end"
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <pre className="font-mono text-[8px] leading-tight opacity-40 select-none">
                {CLAUDE_MASCOT}
              </pre>
              <div>
                <div className="font-display-small text-sm uppercase tracking-wider text-foreground">
                  Viability Score: {data.score}%
                </div>
                <div className="text-[10px] text-foreground-muted">
                  {colors.label}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div>
              <div className="text-xs font-semibold text-foreground mb-2">
                Breakdown:
              </div>
              <div className="space-y-1 text-xs text-foreground-muted">
                <div className="flex justify-between">
                  <span>Assumptions:</span>
                  <span className="font-mono">{data.breakdown.assumptions}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Market:</span>
                  <span className="font-mono">{data.breakdown.market}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Unmet Need:</span>
                  <span className="font-mono">{data.breakdown.unmetNeed}%</span>
                </div>
              </div>
            </div>

            {/* Validated Assumptions */}
            {data.validatedAssumptions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-foreground mb-2">
                  Assumptions ({data.validatedAssumptions.length}):
                </div>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {data.validatedAssumptions.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-foreground-muted"
                    >
                      <span
                        className={
                          item.status === "validated"
                            ? "text-[#10b981]"
                            : item.status === "invalidated"
                              ? "text-[#f43f5e]"
                              : "text-foreground-muted"
                        }
                      >
                        {item.status === "validated"
                          ? "\u2713"
                          : item.status === "invalidated"
                            ? "\u2717"
                            : "\u25CB"}
                      </span>
                      <span className="flex-1 line-clamp-2">
                        {item.assumption}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div>
              <div className="text-xs font-semibold text-foreground mb-2">
                Reasoning:
              </div>
              <div className="text-xs text-foreground-muted leading-relaxed max-h-40 overflow-y-auto">
                {data.reasoning}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-foreground-muted">
                Last calculated: {timeAgo}
              </span>
              <button
                onClick={onExplainClick}
                className="ui-btn ui-btn-xs ui-btn-primary"
              >
                Explain Why
              </button>
            </div>
          </div>

          <Popover.Arrow className="fill-white/10" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
