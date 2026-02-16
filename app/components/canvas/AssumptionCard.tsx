"use client";

import type { Assumption } from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "./constants";

interface AssumptionCardProps {
  assumption: Assumption;
  onDesignTest?: () => void;
  onUpdateProgress?: () => void;
  onViewEvidence?: () => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  market: { bg: "bg-blue-500/15", text: "text-blue-400" },
  product: { bg: "bg-purple-500/15", text: "text-purple-400" },
  ops: { bg: "bg-amber-500/15", text: "text-amber-400" },
  legal: { bg: "bg-red-500/15", text: "text-red-400" },
};

function getRiskColor(level: string): string {
  if (level === "high") return "var(--state-critical)";
  if (level === "medium") return "var(--state-warning)";
  return "var(--state-healthy)";
}

function getBlockLabel(blockType: string): string {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  return def?.bmcLabel ?? blockType.replace(/_/g, " ");
}

export function AssumptionCard({
  assumption,
  onDesignTest,
  onUpdateProgress,
  onViewEvidence,
}: AssumptionCardProps) {
  const catStyle = CATEGORY_STYLES[assumption.category] ?? {
    bg: "bg-white/10",
    text: "text-foreground-muted",
  };
  const riskColor = getRiskColor(assumption.riskLevel);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
      {/* Risk indicator + statement */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: riskColor }}
        />
        <p className="flex-1 text-sm leading-relaxed">{assumption.statement}</p>
      </div>

      {/* Block pills */}
      {assumption.blockTypes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-4.5">
          {assumption.blockTypes.map((bt) => (
            <span
              key={bt}
              className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-foreground-muted"
            >
              {getBlockLabel(bt)}
            </span>
          ))}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}
          >
            {assumption.category}
          </span>
        </div>
      )}

      {/* Confidence bar */}
      {assumption.confidenceScore > 0 && (
        <div className="pl-4.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${assumption.confidenceScore}%`,
                  background: riskColor,
                }}
              />
            </div>
            <span className="text-[10px] text-foreground-muted">
              {assumption.confidenceScore}%
            </span>
          </div>
        </div>
      )}

      {/* Suggested experiment hint */}
      {assumption.status === "untested" && assumption.suggestedExperiment && (
        <p className="pl-4.5 text-[11px] text-foreground-muted/70 italic leading-relaxed line-clamp-2">
          Suggested: {assumption.suggestedExperiment}
        </p>
      )}

      {/* Action buttons */}
      <div className="pl-4.5 flex items-center gap-2">
        {assumption.status === "untested" && onDesignTest && (
          <button
            onClick={onDesignTest}
            className="ui-btn ui-btn-xs ui-btn-ghost text-[var(--state-ai)]"
          >
            Design Test
          </button>
        )}
        {assumption.status === "testing" && onUpdateProgress && (
          <button
            onClick={onUpdateProgress}
            className="ui-btn ui-btn-xs ui-btn-ghost text-[var(--state-warning)]"
          >
            Update Progress
          </button>
        )}
        {(assumption.status === "validated" || assumption.status === "refuted") &&
          onViewEvidence && (
            <button
              onClick={onViewEvidence}
              className="ui-btn ui-btn-xs ui-btn-ghost text-foreground-muted"
            >
              View Evidence
            </button>
          )}
      </div>
    </div>
  );
}
