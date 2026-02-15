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
  expandedBlock: BlockType | null;
  onAcceptEdit?: (proposalId: string, edits: BlockEditProposal[]) => void;
  onRejectEdit?: (proposalId: string) => void;
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
  onAcceptEdit,
  onRejectEdit,
}: {
  canvasId: string;
  chatKey: string;
  endpoint: string;
  onAcceptEdit?: (proposalId: string, edits: BlockEditProposal[]) => void;
  onRejectEdit?: (proposalId: string) => void;
}) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    fetch(`/api/canvas/${canvasId}/messages?chatKey=${chatKey}`)
      .then((r) => r.json())
      .then((data) => setPersistedMessages(toUIMessages(data.messages ?? [])))
      .catch(() => setPersistedMessages([]));
  }, [canvasId, chatKey]);

  if (persistedMessages === null) {
    return (
      <div className="chat-bar glass-morphism">
        <div className="flex items-center justify-center px-4 py-3">
          <span className="text-[11px] text-foreground-muted/40">Loading chat...</span>
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
  onAcceptEdit,
  onRejectEdit,
}: {
  canvasId: string;
  chatKey: string;
  endpoint: string;
  persistedMessages: UIMessage[];
  onAcceptEdit?: (proposalId: string, edits: BlockEditProposal[]) => void;
  onRejectEdit?: (proposalId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');

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
    setInput('');
    const messageId = `user-${Date.now()}`;
    saveUserMessage(text, messageId);
    sendMessage({ text });
  };

  const label = chatKey === 'general'
    ? 'AI Chat — General'
    : `AI Chat — ${chatKey.replace(/_/g, ' ')}`;

  return (
    <div className="chat-bar glass-morphism">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs"
      >
        <span className="text-foreground-muted font-medium">{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-foreground-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="flex flex-col h-[300px]">
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
      )}

      {/* Collapsed: just input */}
      {!expanded && (
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder={isLoading ? 'Thinking...' : 'Ask about your business model...'}
        />
      )}
    </div>
  );
}

export function ChatBar({ canvasId, expandedBlock, onAcceptEdit, onRejectEdit }: ChatBarProps) {
  const chatKey = expandedBlock ?? 'general';
  const endpoint = expandedBlock
    ? `/api/canvas/${canvasId}/blocks/${expandedBlock}/chat`
    : `/api/canvas/${canvasId}/chat`;

  // Key forces full remount when chatKey changes, avoiding stale state
  return (
    <ChatBarLoader
      key={`${canvasId}-${chatKey}`}
      canvasId={canvasId}
      chatKey={chatKey}
      endpoint={endpoint}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
    />
  );
}
