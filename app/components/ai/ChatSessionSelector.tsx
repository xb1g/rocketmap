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
        className="ui-btn ui-btn-xs ui-btn-ghost"
        style={{ opacity: isLoading ? 0.5 : 1 }}
        title="New chat session"
      >
        + New
      </button>

      {sessions.length === 0 && (
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-medium flex items-center gap-1.5"
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: 'var(--chroma-indigo)',
          }}
        >
          <span className="w-1 h-1 rounded-full bg-chroma-indigo animate-pulse" />
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
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-medium truncate max-w-[140px] transition-colors flex items-center gap-1.5"
            style={{
              background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: isActive ? 'var(--chroma-indigo)' : 'var(--foreground-muted)',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(161, 161, 161, 0.2)',
            }}
            title={label}
          >
            {isActive && <span className="w-1 h-1 rounded-full bg-chroma-indigo animate-pulse" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
