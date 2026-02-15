'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { UIMessage } from 'ai';
import type { BlockEditProposal } from '@/lib/types/canvas';
import { ChatMessageWithParts } from './ChatMessage';

interface ChatMessagesProps {
  messages: UIMessage[];
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
}

/** Check if a part is a tool part (dynamic or static) */
function isToolLikePart(p: Record<string, unknown>): boolean {
  return p.type === 'dynamic-tool'
    || (typeof p.type === 'string' && (p.type as string).startsWith('tool-'));
}

export function ChatMessages({ messages, onAcceptEdit, onRejectEdit }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [acceptedEdits, setAcceptedEdits] = useState<Set<string>>(new Set());
  const [rejectedEdits, setRejectedEdits] = useState<Set<string>>(new Set());

  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "near bottom" if within 80px of the bottom
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const visible = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  const handleAccept = (proposalId: string, edit: BlockEditProposal) => {
    // Find the edit index by scanning the message parts
    for (const m of visible) {
      for (const p of m.parts ?? []) {
        const part = p as Record<string, unknown>;
        if (!isToolLikePart(part)) continue;
        if ((part.toolCallId as string) !== proposalId) continue;
        const output = part.output as Record<string, unknown> | undefined;
        const input = part.input as Record<string, unknown> | undefined;
        const edits = (output?.edits ?? input?.edits) as BlockEditProposal[] | undefined;
        const editIdx = edits?.indexOf(edit) ?? 0;
        const editKey = `${proposalId}-${Math.max(0, editIdx)}`;
        setAcceptedEdits((prev) => new Set(prev).add(editKey));
        onAcceptEdit?.(proposalId, edit);
        return;
      }
    }
    // Fallback: accept without index tracking
    setAcceptedEdits((prev) => new Set(prev).add(`${proposalId}-0`));
    onAcceptEdit?.(proposalId, edit);
  };

  const handleReject = (proposalId: string, editIndex: number) => {
    const editKey = `${proposalId}-${editIndex}`;
    setRejectedEdits((prev) => new Set(prev).add(editKey));
    onRejectEdit?.(proposalId, editIndex);
  };

  if (visible.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="w-8 h-8 rounded-full bg-white/3 border border-white/5 flex items-center justify-center">
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
    <div ref={scrollRef} onScroll={checkNearBottom} className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 p-3 scroll-smooth">
      {visible.map((m) => (
        <ChatMessageWithParts
          key={m.id}
          role={m.role as 'user' | 'assistant'}
          parts={m.parts as Array<{ type: string; text?: string; [key: string]: unknown }>}
          onAcceptEdit={m.role === 'assistant' ? handleAccept : undefined}
          onRejectEdit={m.role === 'assistant' ? handleReject : undefined}
          acceptedEdits={acceptedEdits}
          rejectedEdits={rejectedEdits}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
