'use client';

import { useState, useRef, useEffect } from 'react';

interface InlineEditableTitleProps {
  value: string;
  onSave: (value: string) => void;
}

export function InlineEditableTitle({ value, onSave }: InlineEditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="text-sm font-medium bg-transparent border-b border-white/20 outline-none px-0.5 py-0 max-w-[240px]"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm font-medium truncate max-w-[240px] hover:text-[var(--chroma-indigo)] transition-colors cursor-text text-left"
      title="Click to edit title"
    >
      {value}
    </button>
  );
}
