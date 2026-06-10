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
      <div
        className="flex items-end gap-2 px-3 py-2 transition-all"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(240,246,252,0.16)',
          borderRadius: '12px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 18px rgba(0,0,0,0.22)',
        }}
      >
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent text-xs font-body outline-none resize-none leading-relaxed placeholder:text-foreground-muted/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Ask about your business model...'}
          rows={1}
        />
        {isLoading && onStop ? (
          <button
            onClick={onStop}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-[10px] text-foreground-muted/50 hover:text-state-critical/80 hover:bg-state-critical/10 transition-all"
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
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-[10px] text-foreground-muted/40 hover:text-foreground hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
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
