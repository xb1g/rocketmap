'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import type { BlockType, BlockEditProposal } from '@/lib/types/canvas';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface BlockChatSectionProps {
  canvasId: string;
  blockType: BlockType;
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

function BlockChatLoader({ canvasId, blockType, onAcceptEdit, onRejectEdit }: BlockChatSectionProps) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    fetch(`/api/canvas/${canvasId}/messages?chatKey=${blockType}`)
      .then((r) => r.json())
      .then((data) => setPersistedMessages(toUIMessages(data.messages ?? [])))
      .catch(() => setPersistedMessages([]));
  }, [canvasId, blockType]);

  if (persistedMessages === null) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
        <span className="text-[11px] text-foreground-muted/40">Loading chat...</span>
      </div>
    );
  }

  return (
    <BlockChat
      canvasId={canvasId}
      blockType={blockType}
      persistedMessages={persistedMessages}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
    />
  );
}

function BlockChat({
  canvasId,
  blockType,
  persistedMessages,
  onAcceptEdit,
  onRejectEdit,
}: BlockChatSectionProps & { persistedMessages: UIMessage[] }) {
  const [input, setInput] = useState('');
  const chatKey = blockType;

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/canvas/${canvasId}/blocks/${blockType}/chat` }),
    [canvasId, blockType],
  );

  const { messages, sendMessage, status } = useChat({
    id: `block-${blockType}`,
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
        placeholder={`Ask about ${blockType.replace(/_/g, ' ')}...`}
      />
    </div>
  );
}

export function BlockChatSection({ canvasId, blockType, onAcceptEdit, onRejectEdit }: BlockChatSectionProps) {
  // Key forces full remount when blockType changes, avoiding stale state
  return (
    <BlockChatLoader
      key={`${canvasId}-${blockType}`}
      canvasId={canvasId}
      blockType={blockType}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
    />
  );
}
