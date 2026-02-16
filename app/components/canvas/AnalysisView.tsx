"use client";

import { useState, useEffect } from "react";
import type { BlockData, BlockType, CanvasMode } from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "./constants";
import { ConsistencyReport, type ConsistencyData } from "./ConsistencyReport";
import { BlockTooltip } from "./BlockTooltip";

interface RiskSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  untested: number;
  validated: number;
  refuted: number;
}

interface AnalysisViewProps {
  blocks: Map<BlockType, BlockData>;
  mode: CanvasMode;
  canvasId: string;
  consistencyData: ConsistencyData | null;
  isCheckingConsistency: boolean;
  onRunConsistencyCheck: () => void;
}

function BlockSummary({ block, mode }: { block: BlockData; mode: CanvasMode }) {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === block.blockType);
  const label =
    mode === "lean" && def?.leanLabel
      ? def.leanLabel
      : def?.bmcLabel ?? block.blockType;
  const hasAnalysis = !!block.aiAnalysis;

  return (
    <div className="p-3 rounded-lg bg-white/5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {def ? (
          <BlockTooltip definition={def} mode={mode}>
            <span className="text-xs font-medium cursor-help hover:text-foreground transition-colors">
              {label}
            </span>
          </BlockTooltip>
        ) : (
          <span className="text-xs font-medium">{label}</span>
        )}
        <div className="flex items-center gap-2">
          {hasAnalysis && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  block.confidenceScore >= 0.7
                    ? "var(--state-healthy)"
                    : block.confidenceScore >= 0.4
                      ? "var(--state-warning)"
                      : "var(--state-critical)",
              }}
            />
          )}
          <span className="text-[10px] text-foreground-muted">
            {hasAnalysis
              ? `${Math.round(block.confidenceScore * 100)}%`
              : "Not analyzed"}
          </span>
        </div>
      </div>
      {hasAnalysis && block.aiAnalysis && (
        <div className="flex gap-3 text-[10px] text-foreground-muted">
          <span>{block.aiAnalysis.assumptions.length} assumptions</span>
          <span className="text-[var(--state-critical)]">
            {block.aiAnalysis.risks.length} risks
          </span>
          <span>{block.aiAnalysis.questions.length} questions</span>
        </div>
      )}
    </div>
  );
}

function RiskOverview({ canvasId }: { canvasId: string }) {
  const [summary, setSummary] = useState<RiskSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/canvas/${canvasId}/assumptions`);
        if (!res.ok || cancelled) return;
        const data: Array<{ riskLevel: string; status: string }> = await res.json();
        if (cancelled) return;
        const s: RiskSummary = {
          total: data.length,
          high: data.filter((a) => a.riskLevel === "high").length,
          medium: data.filter((a) => a.riskLevel === "medium").length,
          low: data.filter((a) => a.riskLevel === "low").length,
          untested: data.filter((a) => a.status === "untested").length,
          validated: data.filter((a) => a.status === "validated").length,
          refuted: data.filter((a) => a.status === "refuted").length,
        };
        setSummary(s);
      } catch {
        /* silent */
      }
    }
    load();
    return () => { cancelled = true; };
  }, [canvasId]);

  if (!summary || summary.total === 0) return null;

  const riskScore = summary.total > 0
    ? Math.round(((summary.high * 3 + summary.medium * 1.5) / (summary.total * 3)) * 100)
    : 0;

  const riskColor =
    riskScore >= 60 ? "var(--state-critical)" :
    riskScore >= 30 ? "var(--state-warning)" :
    "var(--state-healthy)";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
        Risk Overview
      </span>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
        {/* Risk score bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground-muted">Risk Score</span>
          <span
            className="text-sm font-mono font-medium"
            style={{ color: riskColor }}
          >
            {riskScore}/100
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${riskScore}%`,
              background: riskColor,
            }}
          />
        </div>

        {/* Risk level breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-white/3">
            <div className="text-lg font-mono font-medium" style={{ color: "var(--state-critical)" }}>
              {summary.high}
            </div>
            <div className="text-[10px] text-foreground-muted/60 uppercase tracking-wider">High</div>
          </div>
          <div className="text-center p-2 rounded bg-white/3">
            <div className="text-lg font-mono font-medium" style={{ color: "var(--state-warning)" }}>
              {summary.medium}
            </div>
            <div className="text-[10px] text-foreground-muted/60 uppercase tracking-wider">Medium</div>
          </div>
          <div className="text-center p-2 rounded bg-white/3">
            <div className="text-lg font-mono font-medium" style={{ color: "var(--state-healthy)" }}>
              {summary.low}
            </div>
            <div className="text-[10px] text-foreground-muted/60 uppercase tracking-wider">Low</div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="flex items-center gap-3 text-[10px] text-foreground-muted pt-1 border-t border-white/5">
          <span>{summary.untested} untested</span>
          <span className="text-[var(--state-healthy)]">{summary.validated} validated</span>
          <span className="text-[var(--state-critical)]">{summary.refuted} refuted</span>
        </div>
      </div>
    </div>
  );
}

export function AnalysisView({
  blocks,
  mode,
  canvasId,
  consistencyData,
  isCheckingConsistency,
  onRunConsistencyCheck,
}: AnalysisViewProps) {
  const analyzedCount = Array.from(blocks.values()).filter(
    (b) => b.aiAnalysis,
  ).length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-6">
      {/* Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Canvas Analysis</h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            {analyzedCount}/9 blocks analyzed
          </p>
        </div>
        <button
          onClick={onRunConsistencyCheck}
          disabled={isCheckingConsistency || analyzedCount < 2}
          className={`ui-btn ui-btn-sm ${
            isCheckingConsistency
              ? "ui-btn-secondary glow-ai text-[var(--state-ai)]"
              : analyzedCount < 2
                ? "ui-btn-ghost text-foreground-muted cursor-not-allowed"
                : "ui-btn-secondary text-foreground-muted hover:text-foreground"
          }`}
          title={
            analyzedCount < 2 ? "Analyze at least 2 blocks first" : undefined
          }
        >
          {isCheckingConsistency ? "Checking..." : "Run Consistency Check"}
        </button>
      </div>

      {/* Block summaries */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
          Block Summaries
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {BLOCK_DEFINITIONS.map((def) => {
            const block = blocks.get(def.type);
            if (!block) return null;
            return <BlockSummary key={def.type} block={block} mode={mode} />;
          })}
        </div>
      </div>

      {/* Risk Overview */}
      <RiskOverview canvasId={canvasId} />

      {/* Consistency Report */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium mb-2 block">
          Cross-Block Analysis
        </span>
        <ConsistencyReport
          data={consistencyData}
          isLoading={isCheckingConsistency}
        />
      </div>
    </div>
  );
}
