'use client';

import { useState, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { BlockType } from '@/lib/types/canvas';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface BlockChatSectionProps {
  canvasId: string;
  blockType: BlockType;
}

export function BlockChatSection({ canvasId, blockType }: BlockChatSectionProps) {
  const [input, setInput] = useState('');

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/canvas/${canvasId}/blocks/${blockType}/chat` }),
    [canvasId, blockType],
  );

  const { messages, sendMessage, status } = useChat({
    id: `block-${blockType}`,
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const onSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-[200px]">
      <ChatMessages messages={messages} />
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
