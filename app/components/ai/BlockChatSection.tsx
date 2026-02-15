'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import type { BlockType, BlockEditProposal, BlockItemProposal, SegmentProposal } from '@/lib/types/canvas';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatSessionSelector } from './ChatSessionSelector';
import { useChatSessions } from './useChatSessions';

interface BlockChatSectionProps {
  canvasId: string;
  blockType: BlockType;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  onAcceptSegment?: (segKey: string, segment: SegmentProposal) => void;
  onAcceptItem?: (itemKey: string, item: BlockItemProposal) => void;
}

function toUIMessages(msgs: { id: string; role: string; content: string; createdAt: string }[]): UIMessage[] {
  return msgs.map((m) => {
    // Assistant messages may contain JSON with tool result parts
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

function BlockChatLoader({
  canvasId,
  blockType,
  sessionKey,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  onAcceptSegment,
  onAcceptItem,
}: BlockChatSectionProps & { sessionKey: string }) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    fetch(`/api/canvas/${canvasId}/messages?chatKey=${encodeURIComponent(sessionKey)}`)
      .then((r) => r.json())
      .then((data) => setPersistedMessages(toUIMessages(data.messages ?? [])))
      .catch(() => setPersistedMessages([]));
  }, [canvasId, sessionKey]);

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
      sessionKey={sessionKey}
      persistedMessages={persistedMessages}
      onAcceptEdit={onAcceptEdit}
      onRejectEdit={onRejectEdit}
      onRevertEdit={onRevertEdit}
      onAcceptSegment={onAcceptSegment}
      onAcceptItem={onAcceptItem}
    />
  );
}

function BlockChat({
  canvasId,
  blockType,
  sessionKey,
  persistedMessages,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  onAcceptSegment,
  onAcceptItem,
}: BlockChatSectionProps & { sessionKey: string; persistedMessages: UIMessage[] }) {
  const [input, setInput] = useState('');

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/canvas/${canvasId}/blocks/${blockType}/chat` }),
    [canvasId, blockType],
  );

  const { messages, sendMessage, stop, regenerate, status } = useChat({
    id: `block-${sessionKey}`,
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
    setInput('');
    const messageId = `user-${Date.now()}`;
    saveUserMessage(text, messageId);
    sendMessage({ text });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        status={status}
        onAcceptEdit={onAcceptEdit}
        onRejectEdit={onRejectEdit}
        onRevertEdit={onRevertEdit}
        onAcceptSegment={onAcceptSegment}
        onAcceptItem={onAcceptItem}
        onEditMessage={handleEditMessage}
        onRegenerate={handleRegenerate}
      />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={onSubmit}
        onStop={stop}
        isLoading={isLoading}
        placeholder={`Ask about ${blockType.replace(/_/g, ' ')}...`}
      />
    </div>
  );
}

export function BlockChatSection({ canvasId, blockType, onAcceptEdit, onRejectEdit, onRevertEdit, onAcceptSegment, onAcceptItem }: BlockChatSectionProps) {
  const {
    sessions,
    activeSessionKey,
    setActiveSessionKey,
    createNewSession,
    sessionsLoaded,
  } = useChatSessions({ canvasId, scopePrefix: blockType });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {sessionsLoaded && (
        <ChatSessionSelector
          sessions={sessions}
          activeSessionKey={activeSessionKey}
          onSelect={setActiveSessionKey}
          onNewChat={createNewSession}
          scopePrefix={blockType}
        />
      )}
      <BlockChatLoader
        key={`${canvasId}-${activeSessionKey}`}
        canvasId={canvasId}
        blockType={blockType}
        sessionKey={activeSessionKey}
        onAcceptEdit={onAcceptEdit}
        onRejectEdit={onRejectEdit}
        onRevertEdit={onRevertEdit}
        onAcceptSegment={onAcceptSegment}
        onAcceptItem={onAcceptItem}
      />
    </div>
  );
}
