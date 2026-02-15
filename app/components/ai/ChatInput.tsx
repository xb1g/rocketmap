'use client';

import { useRef, useEffect, useCallback } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ value, onChange, onSubmit, onStop, isLoading, placeholder }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="shrink-0 px-3 pb-3 pt-1.5">
      <div className="flex items-end gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-[var(--chroma-indigo)]/20 transition-colors">
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed placeholder:text-foreground-muted/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Ask about your business model...'}
          rows={1}
        />
        {isLoading && onStop ? (
          <button
            onClick={onStop}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-foreground-muted/50 hover:text-red-400/80 hover:bg-red-500/10 transition-all"
            aria-label="Stop generation"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => { if (value.trim() && !isLoading) onSubmit(); }}
            disabled={!value.trim() || isLoading}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-foreground-muted/40 hover:text-foreground hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            aria-label="Send message"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
