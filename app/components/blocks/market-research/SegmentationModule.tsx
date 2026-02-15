'use client';

import { useCallback, useRef } from 'react';
import type { SegmentationData, CustomerSegment } from '@/lib/types/canvas';

interface SegmentationModuleProps {
  data: SegmentationData | null;
  isGenerating: boolean;
  aiEnabled?: boolean;
  onGenerate: () => void;
  onSave: (data: SegmentationData) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  low: 'text-foreground-muted bg-white/5',
};

function SegmentCard({
  segment,
  onChange,
  onRemove,
}: {
  segment: CustomerSegment;
  onChange: (updated: CustomerSegment) => void;
  onRemove: () => void;
}) {
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
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[segment.priority]}`}>
            {segment.priority}
          </span>
          <button onClick={onRemove} className="text-foreground-muted/40 hover:text-red-400 text-xs">×</button>
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
        {(['demographics', 'psychographics', 'behavioral', 'geographic'] as const).map((dim) => (
          <div key={dim} className="space-y-0.5">
            <label className="text-[9px] text-foreground-muted/60 uppercase tracking-wider">{dim}</label>
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
        <span>Est. size: {segment.estimatedSize || '—'}</span>
      </div>
    </div>
  );
}

export function SegmentationModule({ data, isGenerating, aiEnabled = true, onGenerate, onSave }: SegmentationModuleProps) {
  const current = data ?? { segments: [] };
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSave = useCallback(
    (updated: SegmentationData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(updated), 800);
    },
    [onSave],
  );

  const handleSegmentChange = (index: number, updated: CustomerSegment) => {
    const segments = [...current.segments];
    segments[index] = updated;
    debouncedSave({ segments });
  };

  const handleRemove = (index: number) => {
    const segments = current.segments.filter((_, i) => i !== index);
    onSave({ segments });
  };

  const handleAdd = () => {
    const segments = [
      ...current.segments,
      {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        demographics: '',
        psychographics: '',
        behavioral: '',
        geographic: '',
        estimatedSize: '',
        priority: 'medium' as const,
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

      {current.segments.length > 0 && (
        <div className="space-y-3">
          {current.segments.map((seg, i) => (
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
