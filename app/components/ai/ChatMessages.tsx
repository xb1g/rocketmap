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
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground-muted/30">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="text-[11px] text-foreground-muted/40 leading-relaxed">
          Ask anything about this block
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 p-3 scroll-smooth">
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
