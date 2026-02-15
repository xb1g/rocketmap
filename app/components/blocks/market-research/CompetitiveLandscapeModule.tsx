'use client';

import { useCallback, useRef } from 'react';
import type { CompetitiveLandscapeData, Competitor } from '@/lib/types/canvas';

interface CompetitiveLandscapeModuleProps {
  data: CompetitiveLandscapeData | null;
  isGenerating: boolean;
  aiEnabled?: boolean;
  onGenerate: () => void;
  onSave: (data: CompetitiveLandscapeData) => void;
}

const THREAT_STYLES: Record<string, string> = {
  high: 'text-red-400 bg-red-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  low: 'text-emerald-400 bg-emerald-400/10',
};

function CompetitorCard({
  competitor,
  onChange,
  onRemove,
}: {
  competitor: Competitor;
  onChange: (updated: Competitor) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-white/3 border border-white/5 space-y-3">
      <div className="flex items-start justify-between">
        <input
          value={competitor.name}
          onChange={(e) => onChange({ ...competitor, name: e.target.value })}
          className="bg-transparent text-sm font-medium text-foreground outline-none flex-1"
          placeholder="Competitor name"
        />
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${THREAT_STYLES[competitor.threatLevel]}`}>
            {competitor.threatLevel} threat
          </span>
          <button onClick={onRemove} className="text-foreground-muted/40 hover:text-red-400 text-xs">×</button>
        </div>
      </div>

      <textarea
        value={competitor.positioning}
        onChange={(e) => onChange({ ...competitor, positioning: e.target.value })}
        className="w-full bg-transparent text-xs text-foreground-muted resize-none outline-none"
        rows={2}
        placeholder="Market positioning..."
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[9px] text-foreground-muted/60 uppercase tracking-wider">Strengths</span>
          {competitor.strengths.map((s, i) => (
            <div key={i} className="text-xs text-emerald-400/80">+ {s}</div>
          ))}
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-foreground-muted/60 uppercase tracking-wider">Weaknesses</span>
          {competitor.weaknesses.map((w, i) => (
            <div key={i} className="text-xs text-red-400/80">- {w}</div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-foreground-muted/50">
        Market share: {competitor.marketShareEstimate || '—'}
      </div>
    </div>
  );
}

export function CompetitiveLandscapeModule({ data, isGenerating, aiEnabled = true, onGenerate, onSave }: CompetitiveLandscapeModuleProps) {
  const current = data ?? { competitors: [] };
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSave = useCallback(
    (updated: CompetitiveLandscapeData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(updated), 800);
    },
    [onSave],
  );

  const handleCompetitorChange = (index: number, updated: Competitor) => {
    const competitors = [...current.competitors];
    competitors[index] = updated;
    debouncedSave({ competitors });
  };

  const handleRemove = (index: number) => {
    const competitors = current.competitors.filter((_, i) => i !== index);
    onSave({ competitors });
  };

  const handleAdd = () => {
    const competitors = [
      ...current.competitors,
      {
        id: crypto.randomUUID(),
        name: '',
        positioning: '',
        strengths: [],
        weaknesses: [],
        marketShareEstimate: '',
        threatLevel: 'medium' as const,
      },
    ];
    onSave({ competitors });
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
          ? "Analyzing competitors..."
          : !aiEnabled
            ? "Fill all blocks to unlock AI"
            : "Analyze Competitors with AI"}
      </button>

      {current.competitors.length > 0 && (
        <div className="space-y-3">
          {current.competitors.map((c, i) => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              onChange={(updated) => handleCompetitorChange(i, updated)}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleAdd}
        className="ui-btn ui-btn-xs ui-btn-block ui-btn-ghost text-foreground-muted hover:text-foreground border-dashed"
      >
        + Add competitor manually
      </button>
    </div>
  );
}
