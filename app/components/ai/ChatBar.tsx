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
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
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
                args: p.args ?? {},
                output: p.result,
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
  docked,
  onDockedChange,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  sessions,
  activeSessionKey,
  onSelectSession,
  onNewSession,
  sessionsLoaded,
}: {
  canvasId: string;
  chatKey: string;
  sessionKey: string;
  endpoint: string;
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  sessions: { sessionKey: string; label: string; createdAt: string; messageCount: number }[];
  activeSessionKey: string;
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
  sessionsLoaded: boolean;
}) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    fetch(`/api/canvas/${canvasId}/messages?chatKey=${encodeURIComponent(sessionKey)}`)
      .then((r) => r.json())
      .then((data) => setPersistedMessages(toUIMessages(data.messages ?? [])))
      .catch(() => setPersistedMessages([]));
  }, [canvasId, sessionKey]);

  if (persistedMessages === null) {
    if (docked) {
      return (
        <aside className="chat-dock glass-morphism">
          <div className="chat-dock-header">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-foreground-muted/60">AI Copilot</div>
              <div className="text-xs text-foreground-muted truncate">Loading conversation...</div>
            </div>
            <button
              onClick={() => onDockedChange?.(false)}
              className="ui-btn ui-btn-xs ui-btn-ghost"
              type="button"
            >
              Collapse
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-4">
            <span className="text-[11px] text-foreground-muted/40">Loading chat...</span>
          </div>
        </aside>
      );
    }

    return (
      <div className="chat-float-wrap">
        <div className="chat-float-card glass-morphism">
          <button
            onClick={() => onDockedChange?.(true)}
            className="chat-float-header"
            type="button"
          >
            <span className="text-[11px] font-medium text-foreground-muted">AI Copilot</span>
            <span className="text-[10px] text-foreground-muted/50">Open sidebar</span>
          </button>
          <div className="px-4 pb-4 text-[11px] text-foreground-muted/40">Loading chat...</div>
        </div>
      </div>
    );
  }

  return (
    <ChatBarInner
      canvasId={canvasId}
      chatKey={chatKey}
      sessionKey={sessionKey}
      endpoint={endpoint}
      persistedMessages={persistedMessages}
      docked={docked}
      onDockedChange={onDockedChange}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
      onRevertEdit={onRevertEdit}
      sessions={sessions}
      activeSessionKey={activeSessionKey}
      onSelectSession={onSelectSession}
      onNewSession={onNewSession}
      sessionsLoaded={sessionsLoaded}
    />
  );
}

function ChatBarInner({
  canvasId,
  chatKey,
  sessionKey,
  endpoint,
  persistedMessages,
  docked,
  onDockedChange,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  sessions,
  activeSessionKey,
  onSelectSession,
  onNewSession,
  sessionsLoaded,
}: {
  canvasId: string;
  chatKey: string;
  sessionKey: string;
  endpoint: string;
  persistedMessages: UIMessage[];
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  sessions: { sessionKey: string; label: string; createdAt: string; messageCount: number }[];
  activeSessionKey: string;
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
  sessionsLoaded: boolean;
}) {
  const [internalDocked, setInternalDocked] = useState(false);
  const [input, setInput] = useState('');

  const isDocked = docked ?? internalDocked;

  const setDocked = useCallback(
    (next: boolean) => {
      if (docked === undefined) {
        setInternalDocked(next);
      }
      onDockedChange?.(next);
    },
    [docked, onDockedChange],
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

  const onSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!isDocked) {
      setDocked(true);
    }
    setInput('');
    const messageId = `user-${Date.now()}`;
    saveUserMessage(text, messageId);
    sendMessage({ text });
  };

  const label = chatKey === 'general'
    ? 'Canvas Scope'
    : chatKey.replace(/_/g, ' ');

  if (!isDocked) {
    return (
      <div className="chat-float-wrap">
        <div className="chat-float-card glass-morphism">
          <div
            onClick={() => setDocked(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setDocked(true);
              }
            }}
            className="chat-float-header"
            role="button"
            tabIndex={0}
          >
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-medium text-foreground-muted">AI Copilot</div>
              <div className="text-[10px] text-foreground-muted/50 truncate">{label}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewSession();
                  setDocked(true);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded border transition-colors"
                style={{
                  borderColor: 'var(--chroma-indigo, #6366f1)',
                  color: 'var(--chroma-indigo, #6366f1)',
                }}
                title="New chat session"
              >
                +
              </button>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground-muted/70"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={onSubmit}
            onStop={stop}
            isLoading={isLoading}
            placeholder={isLoading ? 'Thinking...' : 'Ask AI and press enter...'}
          />
        </div>
      </div>
    );
  }

  return (
    <aside className="chat-dock glass-morphism">
      <div className="chat-dock-header">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-foreground-muted/55">AI Copilot</div>
          <div className="text-xs text-foreground-muted truncate">{label}</div>
        </div>
        <button
          onClick={() => setDocked(false)}
          className="ui-btn ui-btn-xs ui-btn-ghost"
          type="button"
        >
          Collapse
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

export function ChatBar({ canvasId, chatBlock, docked, onDockedChange, onAcceptEdit, onRejectEdit, onRevertEdit }: ChatBarProps) {
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
      docked={docked}
      onDockedChange={onDockedChange}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
      onRevertEdit={onRevertEdit}
      sessions={sessions}
      activeSessionKey={activeSessionKey}
      onSelectSession={setActiveSessionKey}
      onNewSession={createNewSession}
      sessionsLoaded={sessionsLoaded}
    />
  );
}
