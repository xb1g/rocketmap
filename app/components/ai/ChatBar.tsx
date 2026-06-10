'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import type { BlockType, BlockEditProposal } from '@/lib/types/canvas';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatSessionSelector } from './ChatSessionSelector';
import { useChatSessions } from './useChatSessions';

interface ChatBarProps {
  canvasId: string;
  chatBlock: BlockType | null;
  minimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  pendingMessage?: string | null;
  onPendingMessageSent?: () => void;
}

function toUIMessages(msgs: { id: string; role: string; content: string; createdAt: string }[]): UIMessage[] {
  return msgs.map((m) => {
    if (m.role === 'assistant') {
      try {
        const parsed = JSON.parse(m.content);
        if (parsed.parts && Array.isArray(parsed.parts)) {
          const uiParts = parsed.parts.map((p: Record<string, unknown>) => {
            if (p.type === 'text') return { type: 'text' as const, text: p.text as string };
            if (p.type === 'tool-result') {
              return {
                type: 'dynamic-tool',
                toolName: p.toolName,
                toolCallId: p.toolCallId,
                state: 'output-available',
                input: p.args ?? p.result ?? {},
                output: p.result ?? p.args ?? {},
              };
            }
            return p;
          });
          return {
            id: m.id,
            role: m.role as UIMessage['role'],
            parts: uiParts,
            createdAt: new Date(m.createdAt),
          };
        }
      } catch {
        // Not JSON — fall through to plain text
      }
    }
    return {
      id: m.id,
      role: m.role as UIMessage['role'],
      parts: [{ type: 'text' as const, text: m.content }],
      createdAt: new Date(m.createdAt),
    };
  });
}

function ChatBarLoader({
  canvasId,
  chatKey,
  sessionKey,
  endpoint,
  minimized,
  onMinimizedChange,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  sessions,
  activeSessionKey,
  onSelectSession,
  onNewSession,
  sessionsLoaded,
  pendingMessage,
  onPendingMessageSent,
}: {
  canvasId: string;
  chatKey: string;
  sessionKey: string;
  endpoint: string;
  minimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  sessions: { sessionKey: string; label: string; createdAt: string; messageCount: number }[];
  activeSessionKey: string;
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
  sessionsLoaded: boolean;
  pendingMessage?: string | null;
  onPendingMessageSent?: () => void;
}) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    fetch(`/api/canvas/${canvasId}/messages?chatKey=${encodeURIComponent(sessionKey)}`)
      .then((r) => r.json())
      .then((data) => setPersistedMessages(toUIMessages(data.messages ?? [])))
      .catch(() => setPersistedMessages([]));
  }, [canvasId, sessionKey]);

  if (persistedMessages === null) {
    return (
      <aside className="chat-dock glass-morphism">
        <div className="chat-dock-header">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted/60">AI Copilot</div>
            <div className="text-xs font-body text-foreground-muted truncate">Loading conversation...</div>
          </div>
          <button
            onClick={() => onMinimizedChange?.(true)}
            className="ui-btn ui-btn-xs ui-btn-ghost"
            type="button"
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-4">
          <span className="text-[11px] text-foreground-muted/40">Loading chat...</span>
        </div>
      </aside>
    );
  }

  return (
    <ChatBarInner
      canvasId={canvasId}
      chatKey={chatKey}
      sessionKey={sessionKey}
      endpoint={endpoint}
      persistedMessages={persistedMessages}
      minimized={minimized}
      onMinimizedChange={onMinimizedChange}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
      onRevertEdit={onRevertEdit}
      sessions={sessions}
      activeSessionKey={activeSessionKey}
      onSelectSession={onSelectSession}
      onNewSession={onNewSession}
      sessionsLoaded={sessionsLoaded}
      pendingMessage={pendingMessage}
      onPendingMessageSent={onPendingMessageSent}
    />
  );
}

function ChatBarInner({
  canvasId,
  chatKey,
  sessionKey,
  endpoint,
  persistedMessages,
  minimized,
  onMinimizedChange,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  sessions,
  activeSessionKey,
  onSelectSession,
  onNewSession,
  sessionsLoaded,
  pendingMessage,
  onPendingMessageSent,
}: {
  canvasId: string;
  chatKey: string;
  sessionKey: string;
  endpoint: string;
  persistedMessages: UIMessage[];
  minimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  sessions: { sessionKey: string; label: string; createdAt: string; messageCount: number }[];
  activeSessionKey: string;
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
  sessionsLoaded: boolean;
  pendingMessage?: string | null;
  onPendingMessageSent?: () => void;
}) {
  const [internalMinimized, setInternalMinimized] = useState(false);
  const [input, setInput] = useState('');

  const isMinimized = minimized ?? internalMinimized;

  const setMinimized = useCallback(
    (next: boolean) => {
      if (minimized === undefined) {
        setInternalMinimized(next);
      }
      onMinimizedChange?.(next);
    },
    [minimized, onMinimizedChange],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: endpoint,
      body: { chatKey: sessionKey },
    }),
    [endpoint, sessionKey],
  );

  const { messages, sendMessage, stop, regenerate, status } = useChat({
    id: sessionKey,
    transport,
    messages: persistedMessages,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleEditMessage = useCallback(
    (messageId: string, newText: string) => {
      sendMessage({ text: newText, messageId });
    },
    [sendMessage],
  );

  const handleRegenerate = useCallback(() => {
    regenerate();
  }, [regenerate]);

  const saveUserMessage = useCallback(
    (text: string, messageId: string) => {
      fetch(`/api/canvas/${canvasId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatKey: sessionKey, role: 'user', content: text, messageId }),
      }).catch((err) => console.error('[chat-persist] Failed to save user message:', err));
    },
    [canvasId, sessionKey],
  );

  useEffect(() => {
    if (!pendingMessage || isLoading) return;
    const messageId = `user-${Date.now()}`;
    saveUserMessage(pendingMessage, messageId);
    sendMessage({ text: pendingMessage });
    const id = setTimeout(() => {
      setMinimized(false);
      onPendingMessageSent?.();
    }, 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  const onSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    const messageId = `user-${Date.now()}`;
    saveUserMessage(text, messageId);
    sendMessage({ text });
  };

  const label = chatKey === 'general'
    ? 'Canvas Scope'
    : chatKey.replace(/_/g, ' ');

  if (isMinimized) {
    return (
      <div className="chat-minimized">
        <button
          onClick={() => setMinimized(false)}
          className="chat-minimized-btn"
          type="button"
          title="AI Copilot — Click to restore"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className="chat-dock glass-morphism">
      <div className="chat-dock-header">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted/55">AI Copilot</div>
          <div className="text-xs font-body text-foreground-muted truncate">{label}</div>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="ui-btn ui-btn-xs ui-btn-ghost"
          type="button"
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {sessionsLoaded && (
        <ChatSessionSelector
          sessions={sessions}
          activeSessionKey={activeSessionKey}
          onSelect={onSelectSession}
          onNewChat={onNewSession}
          scopePrefix={chatKey}
        />
      )}

      <div className="chat-dock-body">
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          status={status}
          onAcceptEdit={onAcceptEdit}
          onRejectEdit={onRejectEdit}
          onRevertEdit={onRevertEdit}
          onEditMessage={handleEditMessage}
          onRegenerate={handleRegenerate}
        />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          onStop={stop}
          isLoading={isLoading}
        />
      </div>
    </aside>
  );
}

export function ChatBar({ canvasId, chatBlock, minimized, onMinimizedChange, onAcceptEdit, onRejectEdit, onRevertEdit, pendingMessage, onPendingMessageSent }: ChatBarProps) {
  const chatKey = chatBlock ?? 'general';
  const endpoint = chatBlock
    ? `/api/canvas/${canvasId}/blocks/${chatBlock}/chat`
    : `/api/canvas/${canvasId}/chat`;

  const {
    sessions,
    activeSessionKey,
    setActiveSessionKey,
    createNewSession,
    sessionsLoaded,
  } = useChatSessions({ canvasId, scopePrefix: chatKey });

  return (
    <ChatBarLoader
      key={`${canvasId}-${activeSessionKey}`}
      canvasId={canvasId}
      chatKey={chatKey}
      sessionKey={activeSessionKey}
      endpoint={endpoint}
      minimized={minimized}
      onMinimizedChange={onMinimizedChange}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
      onRevertEdit={onRevertEdit}
      sessions={sessions}
      activeSessionKey={activeSessionKey}
      onSelectSession={setActiveSessionKey}
      onNewSession={createNewSession}
      sessionsLoaded={sessionsLoaded}
      pendingMessage={pendingMessage}
      onPendingMessageSent={onPendingMessageSent}
    />
  );
}
