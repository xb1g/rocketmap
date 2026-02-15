'use client';

import type { ChatSession } from '@/lib/ai/chat-persistence';

interface ChatSessionSelectorProps {
  sessions: ChatSession[];
  activeSessionKey: string;
  onSelect: (key: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
  scopePrefix: string;
}

export function ChatSessionSelector({
  sessions,
  activeSessionKey,
  onSelect,
  onNewChat,
  isLoading,
  scopePrefix,
}: ChatSessionSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto scrollbar-none shrink-0" style={{ minHeight: 32 }}>
      <button
        type="button"
        onClick={onNewChat}
        disabled={isLoading}
        className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors"
        style={{
          borderColor: 'var(--chroma-indigo, #6366f1)',
          color: 'var(--chroma-indigo, #6366f1)',
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        + New
      </button>

      {sessions.length === 0 && (
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            background: 'var(--chroma-indigo, #6366f1)',
            color: '#fff',
          }}
        >
          Default
        </span>
      )}

      {sessions.map((s) => {
        const isActive = s.sessionKey === activeSessionKey;
        const label = s.sessionKey === scopePrefix ? 'Default' : s.label;
        return (
          <button
            key={s.sessionKey}
            type="button"
            onClick={() => onSelect(s.sessionKey)}
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-medium truncate max-w-[140px] transition-colors"
            style={{
              background: isActive ? 'var(--chroma-indigo, #6366f1)' : 'transparent',
              color: isActive ? '#fff' : 'var(--foreground-muted, #999)',
              border: isActive ? '1px solid var(--chroma-indigo, #6366f1)' : '1px solid var(--foreground-muted, #444)',
            }}
            title={label}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
