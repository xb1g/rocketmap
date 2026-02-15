'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import type { BlockType, BlockEditProposal } from '@/lib/types/canvas';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ChatBarProps {
  canvasId: string;
  chatBlock: BlockType | null;
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
}

function toUIMessages(msgs: { id: string; role: string; content: string; createdAt: string }[]): UIMessage[] {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role as UIMessage['role'],
    parts: [{ type: 'text' as const, text: m.content }],
    createdAt: new Date(m.createdAt),
  }));
}

function ChatBarLoader({
  canvasId,
  chatKey,
  endpoint,
  docked,
  onDockedChange,
  onAcceptEdit,
  onRejectEdit,
}: {
  canvasId: string;
  chatKey: string;
  endpoint: string;
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
}) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    fetch(`/api/canvas/${canvasId}/messages?chatKey=${chatKey}`)
      .then((r) => r.json())
      .then((data) => setPersistedMessages(toUIMessages(data.messages ?? [])))
      .catch(() => setPersistedMessages([]));
  }, [canvasId, chatKey]);

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
      endpoint={endpoint}
      persistedMessages={persistedMessages}
      docked={docked}
      onDockedChange={onDockedChange}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
    />
  );
}

function ChatBarInner({
  canvasId,
  chatKey,
  endpoint,
  persistedMessages,
  docked,
  onDockedChange,
  onAcceptEdit,
  onRejectEdit,
}: {
  canvasId: string;
  chatKey: string;
  endpoint: string;
  persistedMessages: UIMessage[];
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
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
    () => new DefaultChatTransport({ api: endpoint }),
    [endpoint],
  );

  const { messages, sendMessage, status } = useChat({
    id: chatKey,
    transport,
    messages: persistedMessages,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const saveUserMessage = useCallback(
    (text: string, messageId: string) => {
      fetch(`/api/canvas/${canvasId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatKey, role: 'user', content: text, messageId }),
      }).catch((err) => console.error('[chat-persist] Failed to save user message:', err));
    },
    [canvasId, chatKey],
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
          <button
            onClick={() => setDocked(true)}
            className="chat-float-header"
            type="button"
          >
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-medium text-foreground-muted">AI Copilot</div>
              <div className="text-[10px] text-foreground-muted/50 truncate">{label}</div>
            </div>
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
          </button>
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={onSubmit}
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

      <div className="chat-dock-body">
        <ChatMessages
          messages={messages}
          onAcceptEdit={onAcceptEdit}
          onRejectEdit={onRejectEdit}
        />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </aside>
  );
}

export function ChatBar({ canvasId, chatBlock, docked, onDockedChange, onAcceptEdit, onRejectEdit }: ChatBarProps) {
  const chatKey = chatBlock ?? 'general';
  const endpoint = chatBlock
    ? `/api/canvas/${canvasId}/blocks/${chatBlock}/chat`
    : `/api/canvas/${canvasId}/chat`;

  // Key forces full remount when chatKey changes, avoiding stale state
  return (
    <ChatBarLoader
      key={`${canvasId}-${chatKey}`}
      canvasId={canvasId}
      chatKey={chatKey}
      endpoint={endpoint}
      docked={docked}
      onDockedChange={onDockedChange}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
    />
  );
}
