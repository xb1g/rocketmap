"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Assumption } from "@/lib/types/canvas";
import { AssumptionCard } from "./AssumptionCard";
import { ManualAssumptionModal } from "./ManualAssumptionModal";
import { ExperimentDesignModal } from "./ExperimentDesignModal";
import { EvidenceCollectionModal } from "./EvidenceCollectionModal";

interface AssumptionsViewProps {
  canvasId: string;
}

type AnalysisStep = "idle" | "loading" | "analyzing" | "saving" | "done" | "error";

const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: "loading", label: "Loading canvas" },
  { key: "analyzing", label: "AI analyzing blocks" },
  { key: "saving", label: "Saving assumptions" },
  { key: "done", label: "Complete" },
];

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  filter: (a: Assumption) => boolean;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: "high-untested",
    label: "High Risk Untested",
    color: "var(--state-critical)",
    filter: (a) => a.status === "untested" && a.riskLevel === "high",
  },
  {
    id: "medium-untested",
    label: "Medium Risk Untested",
    color: "var(--state-warning)",
    filter: (a) => a.status === "untested" && a.riskLevel === "medium",
  },
  {
    id: "low-untested",
    label: "Low Risk Untested",
    color: "var(--state-healthy)",
    filter: (a) => a.status === "untested" && a.riskLevel === "low",
  },
  {
    id: "testing",
    label: "Testing",
    color: "var(--state-ai)",
    filter: (a) => a.status === "testing",
  },
  {
    id: "validated",
    label: "Validated",
    color: "var(--state-healthy)",
    filter: (a) => a.status === "validated",
  },
  {
    id: "refuted",
    label: "Refuted",
    color: "var(--state-critical)",
    filter: (a) => a.status === "refuted",
  },
];

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

export function AssumptionsView({ canvasId }: AssumptionsViewProps) {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [thinking, setThinking] = useState("");
  const [savingCount, setSavingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | undefined>(undefined);

  // Modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedAssumption, setSelectedAssumption] = useState<Assumption | null>(null);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const fetchAssumptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/canvas/${canvasId}/assumptions`);
      if (res.ok) {
        const data = await res.json();
        setAssumptions(data.assumptions ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    fetchAssumptions();
  }, [fetchAssumptions]);

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
                  setSavingCount(event.assumptions.length);
                }
                setStep("done");
                // Refetch from API to get full Assumption objects
                fetchAssumptions();
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
  }, [canvasId, step, fetchAssumptions]);

  const isRunning = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display-small text-lg">Assumptions</h2>
          {assumptions.length > 0 && (
            <p className="text-xs text-foreground-muted mt-0.5">
              {assumptions.length} assumption
              {assumptions.length !== 1 ? "s" : ""} tracked
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="ui-btn ui-btn-sm ui-btn-ghost text-foreground-muted hover:text-foreground"
          >
            + New Assumption
          </button>
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
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Step progress */}
      {step !== "idle" && (
        <div className="mb-4">
          <StepIndicator currentStep={step} savingCount={savingCount} />
        </div>
      )}

      {/* AI reasoning */}
      {(isRunning || step === "done") && thinking && (
        <div className="mb-4">
          <ThinkingPanel text={thinking} />
        </div>
      )}

      {/* Empty state */}
      {!loading && assumptions.length === 0 && step === "idle" && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-foreground-muted text-sm">
            No assumptions yet. Click &ldquo;Extract Assumptions&rdquo; to
            scan your canvas, or add one manually.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-8 text-center text-sm text-foreground-muted">
          Loading assumptions...
        </div>
      )}

      {/* Kanban board */}
      {!loading && assumptions.length > 0 && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-h-0">
            {COLUMNS.map((col) => {
              const items = assumptions.filter(col.filter);
              return (
                <div
                  key={col.id}
                  className="w-64 shrink-0 flex flex-col min-h-0"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="text-xs font-medium text-foreground-muted">
                      {col.label}
                    </span>
                    <span
                      className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        color: col.color,
                        background: `color-mix(in srgb, ${col.color} 15%, transparent)`,
                      }}
                    >
                      {items.length}
                    </span>
                  </div>

                  {/* Column cards */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {items.map((a) => (
                      <AssumptionCard
                        key={a.$id}
                        assumption={a}
                        onDesignTest={() => {
                          setSelectedAssumption(a);
                          setShowExperimentModal(true);
                        }}
                        onUpdateProgress={() => {
                          setSelectedAssumption(a);
                          setShowEvidenceModal(true);
                        }}
                        onViewEvidence={() => {
                          setSelectedAssumption(a);
                          setShowEvidenceModal(true);
                        }}
                      />
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
                        <p className="text-[11px] text-foreground-muted/50">
                          No items
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ManualAssumptionModal
        canvasId={canvasId}
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onCreated={fetchAssumptions}
      />

      {selectedAssumption && (
        <>
          <ExperimentDesignModal
            assumption={selectedAssumption}
            canvasId={canvasId}
            isOpen={showExperimentModal}
            onClose={() => {
              setShowExperimentModal(false);
              setSelectedAssumption(null);
            }}
            onCreated={fetchAssumptions}
          />
          <EvidenceCollectionModal
            assumption={selectedAssumption}
            canvasId={canvasId}
            isOpen={showEvidenceModal}
            onClose={() => {
              setShowEvidenceModal(false);
              setSelectedAssumption(null);
            }}
            onUpdated={fetchAssumptions}
          />
        </>
      )}
    </div>
  );
}
