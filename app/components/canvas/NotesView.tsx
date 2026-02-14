'use client';

interface NotesViewProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesView({ value, onChange }: NotesViewProps) {
  return (
    <div className="flex-1 min-h-0 p-2">
      <textarea
        className="w-full h-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm outline-none focus:border-[var(--chroma-indigo)]/30 resize-none font-body leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Freeform notes about your business model..."
        spellCheck={false}
      />
    </div>
  );
}
