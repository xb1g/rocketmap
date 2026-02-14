'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
  messages: UIMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visible = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  if (visible.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-foreground-muted">
        Ask a question about your business model
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 p-3">
      {visible.map((m) => {
        const textPart = m.parts?.find((p) => p.type === 'text');
        const content = textPart && 'text' in textPart ? textPart.text : '';
        if (!content) return null;
        return (
          <ChatMessage
            key={m.id}
            role={m.role as 'user' | 'assistant'}
            content={content}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
