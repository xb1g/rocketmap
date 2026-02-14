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
        className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
          isUser
            ? 'bg-[var(--chroma-indigo)]/20 text-foreground'
            : 'bg-white/5 text-foreground/80'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
