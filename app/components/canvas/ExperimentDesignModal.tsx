"use client";

import { useState } from "react";
import type { Assumption, ExperimentType } from "@/lib/types/canvas";

interface ExperimentDesignModalProps {
  assumption: Assumption;
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EXPERIMENT_TYPES: { value: ExperimentType; label: string }[] = [
  { value: "survey", label: "Survey" },
  { value: "interview", label: "Interview" },
  { value: "mvp", label: "MVP" },
  { value: "ab_test", label: "A/B Test" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
];

export function ExperimentDesignModal({
  assumption,
  canvasId,
  isOpen,
  onClose,
  onCreated,
}: ExperimentDesignModalProps) {
  const [type, setType] = useState<ExperimentType>("survey");
  const [description, setDescription] = useState(
    assumption.suggestedExperiment ?? "",
  );
  const [successCriteria, setSuccessCriteria] = useState("");
  const [costEstimate, setCostEstimate] = useState("");
  const [durationEstimate, setDurationEstimate] = useState(
    assumption.suggestedExperimentDuration ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!description.trim() || !successCriteria.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/assumptions/${assumption.$id}/experiments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            description: description.trim(),
            successCriteria: successCriteria.trim(),
            costEstimate: costEstimate.trim() || undefined,
            durationEstimate: durationEstimate.trim() || undefined,
          }),
        },
      );
      if (res.ok) {
        onCreated();
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
          <h3 className="font-display-small text-base">Design Experiment</h3>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground text-sm"
          >
            &times;
          </button>
        </div>

        {/* Assumption being tested */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-[11px] text-foreground-muted/60 mb-1">Testing assumption:</p>
          <p className="text-sm leading-relaxed">{assumption.statement}</p>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Experiment Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExperimentType)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:outline-none focus:border-white/20"
          >
            {EXPERIMENT_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="How will you test this assumption?"
            rows={3}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Success Criteria */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Success Criteria</label>
          <textarea
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            placeholder="What result would validate this assumption?"
            rows={2}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Cost + Duration row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-foreground-muted">Cost Estimate</label>
            <input
              type="text"
              value={costEstimate}
              onChange={(e) => setCostEstimate(e.target.value)}
              placeholder="e.g. $500"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-foreground-muted">Duration Estimate</label>
            <input
              type="text"
              value={durationEstimate}
              onChange={(e) => setDurationEstimate(e.target.value)}
              placeholder="e.g. 2 weeks"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
            />
          </div>
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
            onClick={handleSubmit}
            disabled={!description.trim() || !successCriteria.trim() || submitting}
            className="ui-btn ui-btn-sm ui-btn-secondary"
          >
            {submitting ? "Creating..." : "Create Experiment"}
          </button>
        </div>
      </div>
    </div>
  );
}
