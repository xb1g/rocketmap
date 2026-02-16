"use client";

import { useState } from "react";
import type { BlockType, AssumptionRiskLevel } from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "./constants";

interface ManualAssumptionModalProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const RISK_LEVELS: { value: AssumptionRiskLevel; label: string; color: string }[] = [
  { value: "high", label: "High", color: "var(--state-critical)" },
  { value: "medium", label: "Medium", color: "var(--state-warning)" },
  { value: "low", label: "Low", color: "var(--state-healthy)" },
];

const CATEGORIES = ["market", "product", "ops", "legal"] as const;

export function ManualAssumptionModal({
  canvasId,
  isOpen,
  onClose,
  onCreated,
}: ManualAssumptionModalProps) {
  const [statement, setStatement] = useState("");
  const [riskLevel, setRiskLevel] = useState<AssumptionRiskLevel>("medium");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("market");
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleBlock = (bt: BlockType) => {
    setBlockTypes((prev) =>
      prev.includes(bt) ? prev.filter((b) => b !== bt) : [...prev, bt],
    );
  };

  const handleSubmit = async () => {
    if (!statement.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/canvas/${canvasId}/assumptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: statement.trim(),
          riskLevel,
          category,
          blockTypes,
          source: "user",
        }),
      });
      if (res.ok) {
        setStatement("");
        setRiskLevel("medium");
        setCategory("market");
        setBlockTypes([]);
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
          <h3 className="font-display-small text-base">New Assumption</h3>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground text-sm"
          >
            &times;
          </button>
        </div>

        {/* Statement */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Statement</label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="e.g. Customers are willing to pay $50/mo for this solution"
            rows={3}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-foreground-muted/40 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Risk Level */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Risk Level</label>
          <div className="flex gap-2">
            {RISK_LEVELS.map((rl) => (
              <button
                key={rl.value}
                onClick={() => setRiskLevel(rl.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  riskLevel === rl.value
                    ? "border-2"
                    : "border border-white/[0.08] text-foreground-muted hover:text-foreground"
                }`}
                style={
                  riskLevel === rl.value
                    ? {
                        borderColor: rl.color,
                        color: rl.color,
                        background: `color-mix(in srgb, ${rl.color} 10%, transparent)`,
                      }
                    : undefined
                }
              >
                {rl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:outline-none focus:border-white/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Related Blocks */}
        <div className="space-y-1.5">
          <label className="text-xs text-foreground-muted">Related Blocks</label>
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_DEFINITIONS.map((def) => (
              <button
                key={def.type}
                onClick={() => toggleBlock(def.type)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  blockTypes.includes(def.type)
                    ? "bg-white/15 text-foreground"
                    : "bg-white/5 text-foreground-muted hover:bg-white/10"
                }`}
              >
                {def.bmcLabel}
              </button>
            ))}
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
            disabled={!statement.trim() || submitting}
            className="ui-btn ui-btn-sm ui-btn-secondary"
          >
            {submitting ? "Creating..." : "Create Assumption"}
          </button>
        </div>
      </div>
    </div>
  );
}
