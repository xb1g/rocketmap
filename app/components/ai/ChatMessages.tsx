"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import type { BlockEditProposal, BlockItemProposal, SegmentProposal } from "@/lib/types/canvas";
import { ChatMessageWithParts } from "./ChatMessage";

type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
  status?: ChatStatus;
  /** Slug of a canvas created via generateCanvas tool — shows link in the tool card */
  canvasSlug?: string;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  onAcceptSegment?: (segKey: string, segment: SegmentProposal) => void;
  onAcceptItem?: (itemKey: string, item: BlockItemProposal) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onRegenerate?: () => void;
}

/** Check if a part is a tool part (dynamic or static) */
function isToolLikePart(p: Record<string, unknown>): boolean {
  return (
    p.type === "dynamic-tool" ||
    (typeof p.type === "string" && (p.type as string).startsWith("tool-"))
  );
}

export function ChatMessages({
  messages,
  isLoading,
  status,
  canvasSlug,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  onAcceptSegment,
  onAcceptItem,
  onEditMessage,
  onRegenerate,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [acceptedEdits, setAcceptedEdits] = useState<Set<string>>(new Set());
  const [rejectedEdits, setRejectedEdits] = useState<Set<string>>(new Set());
  const [acceptedSegments, setAcceptedSegments] = useState<Set<string>>(new Set());
  const [rejectedSegments, setRejectedSegments] = useState<Set<string>>(new Set());
  const [acceptedItems, setAcceptedItems] = useState<Set<string>>(new Set());
  const [rejectedItems, setRejectedItems] = useState<Set<string>>(new Set());

  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "near bottom" if within 80px of the bottom
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const visible = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  const handleAccept = (proposalId: string, edit: BlockEditProposal) => {
    // Find the edit index by scanning the message parts
    for (const m of visible) {
      for (const p of m.parts ?? []) {
        const part = p as Record<string, unknown>;
        if (!isToolLikePart(part)) continue;
        if ((part.toolCallId as string) !== proposalId) continue;
        const output = part.output as Record<string, unknown> | undefined;
        const input = part.input as Record<string, unknown> | undefined;
        const edits = (output?.edits ?? input?.edits) as
          | BlockEditProposal[]
          | undefined;
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

  const handleAcceptSegment = (segKey: string, segment: SegmentProposal) => {
    setAcceptedSegments((prev) => new Set(prev).add(segKey));
    onAcceptSegment?.(segKey, segment);
  };

  const handleRejectSegment = (segKey: string) => {
    setRejectedSegments((prev) => new Set(prev).add(segKey));
  };

  const handleAcceptItem = (itemKey: string, item: BlockItemProposal) => {
    setAcceptedItems((prev) => new Set(prev).add(itemKey));
    onAcceptItem?.(itemKey, item);
  };

  const handleRejectItem = (itemKey: string) => {
    setRejectedItems((prev) => new Set(prev).add(itemKey));
  };

  if (visible.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="w-8 h-8 rounded-full bg-white/3 border border-white/5 flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground-muted/30"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="text-[11px] text-foreground-muted/40 leading-relaxed">
          Ask anything about this block
        </span>
      </div>
    );
  }

  const lastAssistantIdx = visible.reduce(
    (acc, m, i) => (m.role === "assistant" ? i : acc),
    -1,
  );

  return (
    <div
      ref={scrollRef}
      onScroll={checkNearBottom}
      className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 p-3 scroll-smooth"
    >
      {visible.map((m, i) => (
        <ChatMessageWithParts
          key={m.id}
          messageId={m.id}
          role={m.role as "user" | "assistant"}
          parts={
            m.parts as Array<{
              type: string;
              text?: string;
              [key: string]: unknown;
            }>
          }
          onAcceptEdit={m.role === "assistant" ? handleAccept : undefined}
          onRejectEdit={m.role === "assistant" ? handleReject : undefined}
          onRevertEdit={m.role === "assistant" ? onRevertEdit : undefined}
          onAcceptSegment={m.role === "assistant" ? handleAcceptSegment : undefined}
          onRejectSegment={m.role === "assistant" ? handleRejectSegment : undefined}
          onAcceptItem={m.role === "assistant" ? handleAcceptItem : undefined}
          onRejectItem={m.role === "assistant" ? handleRejectItem : undefined}
          onEditMessage={m.role === "user" ? onEditMessage : undefined}
          onRegenerate={
            m.role === "assistant" && i === lastAssistantIdx && !isLoading
              ? onRegenerate
              : undefined
          }
          acceptedEdits={acceptedEdits}
          rejectedEdits={rejectedEdits}
          acceptedSegments={acceptedSegments}
          rejectedSegments={rejectedSegments}
          acceptedItems={acceptedItems}
          rejectedItems={rejectedItems}
          canvasSlug={canvasSlug}
        />
      ))}
      {isLoading && <AIStatusIndicator messages={visible} status={status} />}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── AI Status Indicator ─────────────────────────────────────────────────────

/** Derive what the AI is currently doing from messages + status */
function getAIActivity(
  messages: UIMessage[],
  status?: ChatStatus,
): { label: string; icon: 'thinking' | 'tool' | 'writing' } {
  // Check the last assistant message for in-progress tool invocations
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (lastAssistant) {
    for (const part of lastAssistant.parts ?? []) {
      const p = part as Record<string, unknown>;

      // Extract tool name + state from either part format
      let toolName = '';
      let toolState = '';
      if (p.type === 'tool-invocation') {
        const inv = p.toolInvocation as { toolName?: string; state?: string } | undefined;
        toolName = inv?.toolName ?? '';
        toolState = inv?.state ?? '';
      } else if (p.type === 'dynamic-tool' || (typeof p.type === 'string' && (p.type as string).startsWith('tool-'))) {
        toolName = p.type === 'dynamic-tool' ? (p.toolName as string ?? '') : (p.type as string).slice(5);
        toolState = (p.state as string) ?? '';
      } else {
        continue;
      }

      // Tool is being called but hasn't returned yet
      const isPending = p.type === 'tool-invocation'
        ? (toolState !== 'result')
        : (toolState !== 'output-available');
      if (!isPending) continue;

      if (toolName === 'generateCanvas') return { label: 'Building your canvas...', icon: 'tool' };
      if (toolName === 'analyzeBlock') return { label: 'Analyzing block...', icon: 'tool' };
      if (toolName === 'proposeBlockEdit') return { label: 'Drafting changes...', icon: 'tool' };
      if (toolName === 'checkConsistency') return { label: 'Checking consistency...', icon: 'tool' };
      if (toolName === 'createSegments') return { label: 'Creating segments...', icon: 'tool' };
      if (toolName === 'createBlockItems') return { label: 'Creating items...', icon: 'tool' };
      return { label: 'Using tools...', icon: 'tool' };
    }
    // If the last assistant message has text content, AI is actively writing
    const hasText = (lastAssistant.parts ?? []).some(
      (p) => (p as Record<string, unknown>).type === 'text' && (p as Record<string, unknown>).text,
    );
    if (hasText && status === 'streaming') {
      // Text is visible and streaming — no extra indicator needed
      return { label: '', icon: 'writing' };
    }
  }

  // Request sent but no response yet
  if (status === 'submitted') return { label: 'Thinking...', icon: 'thinking' };

  // Streaming started but no visible text yet
  return { label: 'Thinking...', icon: 'thinking' };
}

function AIStatusIndicator({
  messages,
  status,
}: {
  messages: UIMessage[];
  status?: ChatStatus;
}) {
  const activity = getAIActivity(messages, status);
  // Don't show indicator if text is actively streaming (it's already visible)
  if (!activity.label) return null;

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl rounded-bl-md bg-white/4 border border-white/4">
        {activity.icon === 'thinking' && <ThinkingDots />}
        {activity.icon === 'tool' && <ToolSpinner />}
        <span className="text-[11px] text-foreground-muted/60">{activity.label}</span>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-0.5">
      <span className="w-1 h-1 rounded-full bg-foreground-muted/40 animate-[thinking-dot_1.4s_ease-in-out_infinite]" />
      <span className="w-1 h-1 rounded-full bg-foreground-muted/40 animate-[thinking-dot_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1 h-1 rounded-full bg-foreground-muted/40 animate-[thinking-dot_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}

function ToolSpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--chroma-indigo)"
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
