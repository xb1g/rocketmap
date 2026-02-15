"use client";

import { useCallback, useRef } from "react";
import type { MarketValidationData, ValidationItem } from "@/lib/types/canvas";

interface MarketValidationModuleProps {
  data: MarketValidationData | null;
  isGenerating: boolean;
  aiEnabled?: boolean;
  onGenerate: () => void;
  onSave: (data: MarketValidationData) => void;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-emerald-400 bg-emerald-400/10",
  questioned: "text-amber-400 bg-amber-400/10",
  contradicted: "text-red-400 bg-red-400/10",
};

function ValidationItemCard({
  item,
  onChange,
}: {
  item: ValidationItem;
  onChange: (updated: ValidationItem) => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <textarea
          value={item.claim}
          onChange={(e) => onChange({ ...item, claim: e.target.value })}
          className="flex-1 bg-transparent text-xs text-foreground resize-none outline-none"
          rows={1}
          placeholder="Claim..."
        />
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_STYLES[item.status]}`}
        >
          {item.status}
        </span>
      </div>
      <textarea
        value={item.evidence}
        onChange={(e) => onChange({ ...item, evidence: e.target.value })}
        className="w-full bg-transparent text-[11px] text-foreground-muted resize-none outline-none"
        rows={2}
        placeholder="Evidence..."
      />
      <div className="text-[10px] text-foreground-muted/50">
        Source: {item.source || "—"}
      </div>
    </div>
  );
}

export function MarketValidationModule({
  data,
  isGenerating,
  aiEnabled = true,
  onGenerate,
  onSave,
}: MarketValidationModuleProps) {
  const current = data ?? { validations: [], overallAssessment: "" };
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSave = useCallback(
    (updated: MarketValidationData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(updated), 800);
    },
    [onSave],
  );

  const handleItemChange = (index: number, updated: ValidationItem) => {
    const validations = [...current.validations];
    validations[index] = updated;
    debouncedSave({ ...current, validations });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onGenerate}
        disabled={isGenerating || !aiEnabled}
        className={`ui-btn ui-btn-sm ui-btn-block ${
          isGenerating
            ? "ui-btn-secondary glow-ai text-[var(--state-ai)]"
            : !aiEnabled
              ? "ui-btn-ghost text-foreground-muted/40 cursor-not-allowed"
              : "ui-btn-secondary text-foreground-muted hover:text-foreground"
        }`}
      >
        {isGenerating
          ? "Validating estimates..."
          : !aiEnabled
            ? "Fill all blocks to unlock AI"
            : "Validate Estimates with AI"}
      </button>

      {current.validations.length > 0 && (
        <div className="space-y-3">
          {current.validations.map((v, i) => (
            <ValidationItemCard
              key={i}
              item={v}
              onChange={(updated) => handleItemChange(i, updated)}
            />
          ))}
        </div>
      )}

      {current.overallAssessment && (
        <div className="p-3 rounded-lg bg-white/3 space-y-1">
          <span className="text-[10px] text-foreground-muted uppercase tracking-wider">
            Overall Assessment
          </span>
          <textarea
            value={current.overallAssessment}
            onChange={(e) =>
              debouncedSave({ ...current, overallAssessment: e.target.value })
            }
            className="w-full bg-transparent text-xs text-foreground-muted resize-none outline-none"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
