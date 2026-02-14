'use client';

import { useState, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { BlockType } from '@/lib/types/canvas';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ChatBarProps {
  canvasId: string;
  expandedBlock: BlockType | null;
}

export function ChatBar({ canvasId, expandedBlock }: ChatBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');

  const endpoint = expandedBlock
    ? `/api/canvas/${canvasId}/blocks/${expandedBlock}/chat`
    : `/api/canvas/${canvasId}/chat`;

  const chatKey = expandedBlock ?? 'general';

  const transport = useMemo(
    () => new DefaultChatTransport({ api: endpoint }),
    [endpoint],
  );

  const { messages, sendMessage, status } = useChat({
    id: chatKey,
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const onSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
  };

  const label = expandedBlock
    ? `AI Chat — ${expandedBlock.replace(/_/g, ' ')}`
    : 'AI Chat — General';

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
          <ChatMessages messages={messages} />
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
