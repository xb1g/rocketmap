'use client';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-[var(--chroma-indigo)]/15 text-foreground/90'
            : 'rounded-2xl rounded-bl-md bg-white/[0.04] text-foreground/75 border border-white/[0.04]'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
