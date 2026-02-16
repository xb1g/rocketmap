"use client";

import { useState, useEffect } from "react";
import type { Assumption, Experiment, ExperimentResult } from "@/lib/types/canvas";

interface EvidenceCollectionModalProps {
  assumption: Assumption;
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const RESULT_OPTIONS: { value: ExperimentResult; label: string; color: string }[] = [
  { value: "supports", label: "Supports", color: "var(--state-healthy)" },
  { value: "contradicts", label: "Contradicts", color: "var(--state-critical)" },
  { value: "mixed", label: "Mixed", color: "var(--state-warning)" },
  { value: "inconclusive", label: "Inconclusive", color: "var(--state-ai)" },
];

export function EvidenceCollectionModal({
  assumption,
  canvasId,
  isOpen,
  onClose,
  onUpdated,
}: EvidenceCollectionModalProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [evidence, setEvidence] = useState("");
  const [result, setResult] = useState<ExperimentResult>("supports");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(
      `/api/canvas/${canvasId}/assumptions/${assumption.$id}/experiments`,
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const exps = Array.isArray(data) ? data : [];
        setExperiments(exps);
        if (exps.length > 0) setSelectedExperiment(exps[0]);
      })
      .catch(() => setExperiments([]))
      .finally(() => setLoading(false));
  }, [isOpen, canvasId, assumption.$id]);

  if (!isOpen) return null;

  const handleComplete = async () => {
    if (!selectedExperiment || !evidence.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/assumptions/${assumption.$id}/experiments/${selectedExperiment.$id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            result,
            evidence: evidence.trim(),
            sourceUrl: sourceUrl.trim() || undefined,
          }),
        },
      );
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg mx-4 rounded-xl border border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display-small text-base">Collect Evidence</h3>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground text-sm"
          >
            &times;
          </button>
        </div>

        {/* Assumption context */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-[11px] text-foreground-muted/60 mb-1">Assumption:</p>
          <p className="text-sm leading-relaxed">{assumption.statement}</p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-foreground-muted">
            Loading experiments...
          </div>
        ) : experiments.length === 0 ? (
          <div className="py-8 text-center text-sm text-foreground-muted">
            No experiments found. Design a test first.
          </div>
        ) : (
          <>
            {/* Experiment selector (if multiple) */}
            {experiments.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs text-foreground-muted">Experiment</label>
                <select
                  value={selectedExperiment?.$id ?? ""}
                  onChange={(e) => {
                    const exp = experiments.find((x) => x.$id === e.target.value);
                    if (exp) setSelectedExperiment(exp);
                  }}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:outline-none focus:border-white/20"
                >
                  {experiments.map((exp) => (
                    <option key={exp.$id} value={exp.$id}>
                      {exp.type}: {exp.description.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected experiment details */}
            {selectedExperiment && (
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-1">
                <p className="text-[11px] text-foreground-muted/60">
                  {selectedExperiment.type.toUpperCase()}
                </p>
                <p className="text-sm">{selectedExperiment.description}</p>
                <p className="text-[11px] text-foreground-muted">
                  Success criteria: {selectedExperiment.successCriteria}
                </p>
              </div>
            )}

            {/* Evidence textarea */}
            <div className="space-y-1.5">
              <label className="text-xs text-foreground-muted">Evidence</label>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="What did you find? Describe the evidence..."
                rows={3}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Result radio */}
            <div className="space-y-1.5">
              <label className="text-xs text-foreground-muted">Result</label>
              <div className="flex flex-wrap gap-2">
                {RESULT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setResult(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      result === opt.value
                        ? "border-2"
                        : "border border-white/[0.08] text-foreground-muted hover:text-foreground"
                    }`}
                    style={
                      result === opt.value
                        ? {
                            borderColor: opt.color,
                            color: opt.color,
                            background: `color-mix(in srgb, ${opt.color} 10%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-foreground-muted">Source URL (optional)</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="ui-btn ui-btn-sm ui-btn-ghost text-foreground-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={!evidence.trim() || !selectedExperiment || submitting}
                className="ui-btn ui-btn-sm ui-btn-secondary"
              >
                {submitting ? "Saving..." : "Mark Complete"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
