"use client";

interface BlockFocusEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function BlockFocusEditor({
  value,
  placeholder,
  onChange,
}: BlockFocusEditorProps) {
  return (
    <div className="px-4 py-3">
      <textarea
        className="w-full bg-white/3 border border-white/10 rounded-lg p-3 font-body text-[13px] outline-none focus:border-(--chroma-indigo)/50 focus:bg-white/5 transition-all resize-none min-h-40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  );
}
