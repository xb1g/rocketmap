'use client';

import { useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ value, onChange, onSubmit, isLoading, placeholder }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-white/5">
      <textarea
        ref={inputRef}
        className="flex-1 bg-transparent text-xs outline-none resize-none max-h-[80px] leading-relaxed placeholder:text-foreground-muted/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Ask about your business model...'}
        rows={1}
      />
      <button
        onClick={() => { if (value.trim() && !isLoading) onSubmit(); }}
        disabled={!value.trim() || isLoading}
        className="text-foreground-muted hover:text-foreground disabled:opacity-30 transition-colors p-1 shrink-0"
        aria-label="Send message"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
