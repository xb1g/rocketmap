'use client';

interface BlockFocusEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function BlockFocusEditor({ value, placeholder, onChange }: BlockFocusEditorProps) {
  return (
    <div className="px-4 py-3">
      <textarea
        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-[var(--chroma-indigo)]/30 resize-none min-h-[160px] leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  );
}
