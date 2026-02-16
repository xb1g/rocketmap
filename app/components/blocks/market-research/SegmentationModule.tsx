"use client";

import { useCallback, useMemo, useRef } from "react";
import type { SegmentationData, CustomerSegment } from "@/lib/types/canvas";

interface SegmentationModuleProps {
  data: SegmentationData | null;
  isGenerating: boolean;
  aiEnabled?: boolean;
  onGenerate: () => void;
  onSave: (data: SegmentationData) => void;
}

type PriorityLevel = "high" | "medium" | "low";

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  high: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  low: "text-foreground-muted bg-white/5",
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function normalizePriority(
  value: unknown,
): {
  priority: PriorityLevel;
  priorityText: string;
} {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "high" || normalized === "medium" || normalized === "low") {
      return { priority: normalized, priorityText: normalized };
    }
  }

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (Number.isFinite(numeric)) {
    if (numeric >= 70) return { priority: "high", priorityText: "high" };
    if (numeric >= 40) return { priority: "medium", priorityText: "medium" };
    return { priority: "low", priorityText: "low" };
  }

  return { priority: "medium", priorityText: "medium" };
}

function normalizeSegment(raw: unknown, fallbackIndex = 0): CustomerSegment {
  if (raw && typeof raw === "object") {
    const source = raw as Record<string, unknown>;
    const normalizedId = typeof source.id === "string" && source.id.length > 0 ? source.id : source.$id;
    const id =
      typeof normalizedId === "string" && normalizedId.length > 0
        ? normalizedId
        : String(source.id ?? fallbackIndex + 1);
    const prioritySource = normalizePriority(
      source.priority ??
        source.priorityScore ??
        source["priority_score"] ??
        source["priorityScore"],
    );
    return {
      id,
      name: typeof source.name === "string" ? source.name : "",
      description:
        typeof source.description === "string" ? source.description : "",
      demographics:
        typeof source.demographics === "string" ? source.demographics : "",
      psychographics:
        typeof source.psychographics === "string" ? source.psychographics : "",
      behavioral:
        typeof source.behavioral === "string" ? source.behavioral : "",
      geographic:
        typeof source.geographic === "string" ? source.geographic : "",
      estimatedSize:
        typeof source.estimatedSize === "string" ? source.estimatedSize : "",
      priority: prioritySource.priority,
    };
  }
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    demographics: "",
    psychographics: "",
    behavioral: "",
    geographic: "",
    estimatedSize: "",
    priority: "medium",
  };
}

function normalizeSegments(rawSegments: unknown): CustomerSegment[] {
  if (!Array.isArray(rawSegments)) return [];
  return rawSegments.map((segment, index) => normalizeSegment(segment, index));
}

function SegmentCard({
  segment,
  onChange,
  onRemove,
}: {
  segment: CustomerSegment;
  onChange: (updated: CustomerSegment) => void;
  onRemove: () => void;
}) {
  const priorityLabel = PRIORITY_LABELS[segment.priority];
  return (
    <div className="p-4 rounded-lg bg-white/3 border border-white/5 space-y-3">
      <div className="flex items-start justify-between">
        <input
          value={segment.name}
          onChange={(e) => onChange({ ...segment, name: e.target.value })}
          className="bg-transparent text-sm font-medium text-foreground outline-none flex-1"
          placeholder="Segment name"
        />
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[segment.priority]}`}
          >
            {priorityLabel}
          </span>
          <button
            onClick={onRemove}
            className="text-foreground-muted/40 hover:text-red-400 text-xs"
          >
            ×
          </button>
        </div>
      </div>
      <textarea
        value={segment.description}
        onChange={(e) => onChange({ ...segment, description: e.target.value })}
        className="w-full bg-transparent text-xs text-foreground-muted resize-none outline-none"
        rows={2}
        placeholder="Description..."
      />
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            "demographics",
            "psychographics",
            "behavioral",
            "geographic",
          ] as const
        ).map((dim) => (
          <div key={dim} className="space-y-0.5">
            <label className="text-[9px] text-foreground-muted/60 uppercase tracking-wider">
              {dim}
            </label>
            <input
              value={segment[dim]}
              onChange={(e) => onChange({ ...segment, [dim]: e.target.value })}
              className="w-full bg-white/3 rounded px-2 py-1 text-xs text-foreground-muted outline-none"
              placeholder={dim}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-foreground-muted/60">
        <span>Est. size: {segment.estimatedSize || "—"}</span>
      </div>
    </div>
  );
}

export function SegmentationModule({
  data,
  isGenerating,
  aiEnabled = true,
  onGenerate,
  onSave,
}: SegmentationModuleProps) {
  const normalizedSegments = useMemo(
    () => normalizeSegments(data?.segments),
    [data?.segments],
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSave = useCallback(
    (updated: SegmentationData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(updated), 800);
    },
    [onSave],
  );

  const handleSegmentChange = (index: number, updated: CustomerSegment) => {
    const segments = [...normalizedSegments];
    segments[index] = updated;
    debouncedSave({ segments });
  };

  const handleRemove = (index: number) => {
    const segments = normalizedSegments.filter((_, i) => i !== index);
    onSave({ segments });
  };

  const handleAdd = () => {
    const segments = [
      ...normalizedSegments,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        demographics: "",
        psychographics: "",
        behavioral: "",
        geographic: "",
        estimatedSize: "",
        priority: "medium" as const,
      },
    ];
    onSave({ segments });
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
          ? "Generating segments..."
          : !aiEnabled
            ? "Fill all blocks to unlock AI"
            : "Generate Segments with AI"}
      </button>

      {normalizedSegments.length > 0 && (
        <div className="space-y-3">
          {normalizedSegments.map((seg, i) => (
            <SegmentCard
              key={seg.id}
              segment={seg}
              onChange={(updated) => handleSegmentChange(i, updated)}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleAdd}
        className="ui-btn ui-btn-xs ui-btn-block ui-btn-ghost text-foreground-muted hover:text-foreground border-dashed"
      >
        + Add segment manually
      </button>
    </div>
  );
}
