'use client';

import { useCallback, useRef } from 'react';
import type { PersonasData, Persona, CustomerSegment } from '@/lib/types/canvas';

interface PersonaModuleProps {
  data: PersonasData | null;
  segments: CustomerSegment[];
  isGenerating: boolean;
  aiEnabled?: boolean;
  onGenerate: () => void;
  onSave: (data: PersonasData) => void;
}

function PersonaCard({
  persona,
  segments,
  onChange,
  onRemove,
}: {
  persona: Persona;
  segments: CustomerSegment[];
  onChange: (updated: Persona) => void;
  onRemove: () => void;
}) {
  const segment = segments.find((s) => s.id === persona.segmentId);
  const initials = persona.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 rounded-lg bg-white/3 border border-white/5 space-y-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              value={persona.name}
              onChange={(e) => onChange({ ...persona, name: e.target.value })}
              className="bg-transparent text-sm font-medium text-foreground outline-none flex-1"
              placeholder="Name"
            />
            <button onClick={onRemove} className="text-foreground-muted/40 hover:text-red-400 text-xs">×</button>
          </div>
          <div className="flex gap-2 mt-0.5">
            <input
              value={String(persona.age)}
              onChange={(e) => onChange({ ...persona, age: Number(e.target.value) || 0 })}
              className="bg-transparent text-xs text-foreground-muted outline-none w-8"
              placeholder="Age"
            />
            <span className="text-foreground-muted/30">·</span>
            <input
              value={persona.occupation}
              onChange={(e) => onChange({ ...persona, occupation: e.target.value })}
              className="bg-transparent text-xs text-foreground-muted outline-none flex-1"
              placeholder="Occupation"
            />
          </div>
          {segment && (
            <span className="text-[10px] text-foreground-muted/50 mt-0.5 block">
              Segment: {segment.name}
            </span>
          )}
        </div>
      </div>

      {/* Quote */}
      {persona.quote && (
        <div className="text-xs italic text-foreground-muted/60 border-l-2 border-white/10 pl-3">
          &ldquo;{persona.quote}&rdquo;
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[9px] text-foreground-muted/60 uppercase tracking-wider">Goals</span>
          {persona.goals.map((g, i) => (
            <div key={i} className="text-xs text-foreground-muted">• {g}</div>
          ))}
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-foreground-muted/60 uppercase tracking-wider">Frustrations</span>
          {persona.frustrations.map((f, i) => (
            <div key={i} className="text-xs text-foreground-muted">• {f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PersonaModule({ data, segments, isGenerating, aiEnabled = true, onGenerate, onSave }: PersonaModuleProps) {
  const current = data ?? { personas: [] };
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSave = useCallback(
    (updated: PersonasData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onSave(updated), 800);
    },
    [onSave],
  );

  const handlePersonaChange = (index: number, updated: Persona) => {
    const personas = [...current.personas];
    personas[index] = updated;
    debouncedSave({ personas });
  };

  const handleRemove = (index: number) => {
    const personas = current.personas.filter((_, i) => i !== index);
    onSave({ personas });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onGenerate}
        disabled={isGenerating || !aiEnabled}
        className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
          isGenerating
            ? 'glow-ai text-[var(--state-ai)] border border-[var(--state-ai)]/20'
            : !aiEnabled
              ? 'glass-morphism text-foreground-muted/40 cursor-not-allowed'
              : 'glass-morphism hover:bg-white/10 text-foreground-muted hover:text-foreground'
        }`}
      >
        {isGenerating ? 'Generating personas...' : !aiEnabled ? 'Fill all blocks to unlock AI' : 'Generate Personas with AI'}
      </button>

      {current.personas.length > 0 && (
        <div className="space-y-3">
          {current.personas.map((p, i) => (
            <PersonaCard
              key={p.id}
              persona={p}
              segments={segments}
              onChange={(updated) => handlePersonaChange(i, updated)}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
