'use client';

interface NotesViewProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesView({ value, onChange }: NotesViewProps) {
  return (
    <div className="flex-1 min-h-0 p-2">
      <textarea
        className="input-soft w-full h-full p-4 text-sm resize-none font-body leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Freeform notes about your business model..."
        spellCheck={false}
      />
    </div>
  );
}
