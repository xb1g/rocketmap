"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { BlockEditProposal, BlockItemProposal, SegmentProposal } from "@/lib/types/canvas";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageWithPartsProps {
  messageId: string;
  role: "user" | "assistant";
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
  onAcceptEdit?: (proposalId: string, edit: BlockEditProposal) => void;
  onRejectEdit?: (proposalId: string, editIndex: number) => void;
  onRevertEdit?: (proposalId: string, editIndex: number) => void;
  onAcceptSegment?: (segKey: string, segment: SegmentProposal) => void;
  onRejectSegment?: (segKey: string) => void;
  onAcceptItem?: (itemKey: string, item: BlockItemProposal) => void;
  onRejectItem?: (itemKey: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onRegenerate?: () => void;
  acceptedEdits?: Set<string>;
  rejectedEdits?: Set<string>;
  acceptedSegments?: Set<string>;
  rejectedSegments?: Set<string>;
  acceptedItems?: Set<string>;
  rejectedItems?: Set<string>;
  canvasSlug?: string;
}

/**
 * Check if a message part is a tool call.
 * AI SDK v6 sends tool parts as either:
 * - `type: 'dynamic-tool'` (server-only tools, which is our case)
 * - `type: 'tool-<toolName>'` (client-registered tools)
 */
function isToolPart(part: { type: string; [key: string]: unknown }): boolean {
  return (
    part.type === "dynamic-tool" ||
    part.type === "tool-invocation" ||
    (part.type.startsWith("tool-") && part.type !== "tool")
  );
}

/** Extract tool name from a tool part */
function getToolName(part: { type: string; [key: string]: unknown }): string {
  if (part.type === "dynamic-tool") return (part.toolName as string) ?? "";
  if (part.type === "tool-invocation") {
    const inv = part.toolInvocation as { toolName?: string } | undefined;
    return inv?.toolName ?? "";
  }
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return "";
}

/** Check if a tool part is still pending (not yet completed) */
function isToolPending(part: { type: string; [key: string]: unknown }): boolean {
  if (part.type === "tool-invocation") {
    const inv = part.toolInvocation as { state?: string } | undefined;
    return inv?.state !== "result";
  }
  return part.state !== "output-available";
}

/**
 * Simple text-only message (backward compatible).
 */
export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? "rounded-2xl rounded-br-md bg-(--chroma-indigo)/15 text-foreground/90 whitespace-pre-wrap"
            : "rounded-2xl rounded-bl-md bg-white/4 text-foreground/75 border border-white/4 chat-markdown"
        }`}
      >
        {isUser ? content : <ReactMarkdown>{content}</ReactMarkdown>}
      </div>
    </div>
  );
}

/**
 * Multi-part message that can render text + block edit proposals.
 */
export function ChatMessageWithParts({
  messageId,
  role,
  parts,
  onAcceptEdit,
  onRejectEdit,
  onRevertEdit,
  onAcceptSegment,
  onRejectSegment,
  onAcceptItem,
  onRejectItem,
  onEditMessage,
  onRegenerate,
  acceptedEdits,
  rejectedEdits,
  acceptedSegments,
  rejectedSegments,
  acceptedItems,
  rejectedItems,
  canvasSlug,
}: ChatMessageWithPartsProps) {
  const isUser = role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [hovered, setHovered] = useState(false);

  const startEdit = () => {
    const textPart = parts.find((p) => p.type === "text" && p.text);
    setEditText(textPart?.text ?? "");
    setIsEditing(true);
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setIsEditing(false);
    onEditMessage?.(messageId, trimmed);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`group/msg flex ${isUser ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="max-w-[85%] flex flex-col gap-2">
        {parts.map((part, idx) => {
          // Text parts
          if (part.type === "text" && part.text) {
            // User message editing
            if (isUser && isEditing) {
              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitEdit();
                      }
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="px-3 py-2 text-xs leading-relaxed rounded-2xl rounded-br-md bg-(--chroma-indigo)/15 text-foreground/90 whitespace-pre-wrap border border-(--chroma-indigo)/30 outline-none resize-y min-h-[40px] font-sans"
                    rows={Math.max(1, editText.split("\n").length)}
                    autoFocus
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-0.5 text-[10px] rounded-md text-foreground-muted/50 hover:text-foreground-muted/80 hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitEdit}
                      disabled={!editText.trim()}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-(--chroma-indigo)/20 text-(--chroma-indigo) hover:bg-(--chroma-indigo)/30 disabled:opacity-30 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="relative">
                <div
                  className={`px-3 py-2 text-xs leading-relaxed ${
                    isUser
                      ? "rounded-2xl rounded-br-md bg-(--chroma-indigo)/15 text-foreground/90 whitespace-pre-wrap"
                      : "rounded-2xl rounded-bl-md bg-white/4 text-foreground/75 border border-white/4 chat-markdown"
                  }`}
                >
                  {isUser ? (
                    part.text
                  ) : (
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                  )}
                </div>
                {/* Edit button for user messages */}
                {isUser && onEditMessage && hovered && !isEditing && (
                  <button
                    onClick={startEdit}
                    className="absolute -left-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-foreground-muted/30 hover:text-foreground-muted/70 hover:bg-white/5 transition-all"
                    aria-label="Edit message"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          }

          // Tool parts (dynamic-tool or tool-<name>)
          if (isToolPart(part)) {
            const toolName = getToolName(part);

            if (toolName === "proposeBlockEdit") {
              const output = part.output as Record<string, unknown> | undefined;
              const input = part.input as Record<string, unknown> | undefined;
              // Tool output can be { edits: [...] } or the raw array depending on SDK version
              let rawEdits = output?.edits ?? input?.edits;
              // Fallback: maybe output/input IS the array directly
              if (!rawEdits && Array.isArray(output)) rawEdits = output;
              if (!rawEdits && Array.isArray(input)) rawEdits = input;

              if (process.env.NODE_ENV === "development") {
                console.log("[ChatMessage] proposeBlockEdit part:", {
                  type: part.type,
                  state: part.state,
                  toolCallId: part.toolCallId,
                  output: JSON.stringify(output)?.slice(0, 200),
                  input: JSON.stringify(input)?.slice(0, 200),
                  rawEdits: JSON.stringify(rawEdits)?.slice(0, 200),
                });
              }

              const edits = (
                Array.isArray(rawEdits) ? rawEdits : []
              ) as BlockEditProposal[];
              if (!edits.length || !edits[0]?.blockType) return null;

              const proposalId = part.toolCallId as string;
              const isPending = part.state !== "output-available";

              return (
                <div key={idx} className="flex flex-col gap-2">
                  {edits.map((edit, editIdx) => {
                    const editKey = `${proposalId}-${editIdx}`;
                    const isAccepted = acceptedEdits?.has(editKey) ?? false;
                    const isRejected = rejectedEdits?.has(editKey) ?? false;

                    return (
                      <SingleEditCard
                        key={editKey}
                        edit={edit}
                        isPending={isPending}
                        isAccepted={isAccepted}
                        isRejected={isRejected}
                        onAccept={() => onAcceptEdit?.(proposalId, edit)}
                        onReject={() => onRejectEdit?.(proposalId, editIdx)}
                        onRevert={
                          isAccepted && onRevertEdit
                            ? () => onRevertEdit(proposalId, editIdx)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              );
            }

            if (toolName === "createSegments") {
              const output = part.output as Record<string, unknown> | undefined;
              const input = part.input as Record<string, unknown> | undefined;
              let rawSegments = output?.segments ?? input?.segments;
              if (!rawSegments && Array.isArray(output)) rawSegments = output;
              if (!rawSegments && Array.isArray(input)) rawSegments = input;

              const proposedSegments = (
                Array.isArray(rawSegments) ? rawSegments : []
              ) as SegmentProposal[];
              if (!proposedSegments.length || !proposedSegments[0]?.name) return null;

              const proposalId = part.toolCallId as string;
              const isPending = part.state !== "output-available";

              return (
                <div key={idx} className="flex flex-col gap-2">
                  {proposedSegments.map((seg, segIdx) => {
                    const segKey = `${proposalId}-seg-${segIdx}`;
                    const isAccepted = acceptedSegments?.has(segKey) ?? false;
                    const isRejected = rejectedSegments?.has(segKey) ?? false;

                    return (
                      <SegmentProposalCard
                        key={segKey}
                        segment={seg}
                        isPending={isPending}
                        isAccepted={isAccepted}
                        isRejected={isRejected}
                        onAccept={() => onAcceptSegment?.(segKey, seg)}
                        onReject={() => onRejectSegment?.(segKey)}
                      />
                    );
                  })}
                </div>
              );
            }

            if (toolName === "createBlockItems") {
              const output = part.output as Record<string, unknown> | undefined;
              const input = part.input as Record<string, unknown> | undefined;
              let rawItems = output?.items ?? input?.items;
              if (!rawItems && Array.isArray(output)) rawItems = output;
              if (!rawItems && Array.isArray(input)) rawItems = input;

              const proposedItems = (
                Array.isArray(rawItems) ? rawItems : []
              ) as BlockItemProposal[];
              if (!proposedItems.length || !proposedItems[0]?.name) return null;

              const proposalId = part.toolCallId as string;
              const isPending = part.state !== "output-available";

              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  {proposedItems.map((item, itemIdx) => {
                    const itemKey = `${proposalId}-item-${itemIdx}`;
                    const isAccepted = acceptedItems?.has(itemKey) ?? false;
                    const isRejected = rejectedItems?.has(itemKey) ?? false;

                    return (
                      <ItemProposalCard
                        key={itemKey}
                        item={item}
                        isPending={isPending}
                        isAccepted={isAccepted}
                        isRejected={isRejected}
                        onAccept={() => onAcceptItem?.(itemKey, item)}
                        onReject={() => onRejectItem?.(itemKey)}
                      />
                    );
                  })}
                </div>
              );
            }

            // Show generateCanvas as a visible status card
            if (toolName === "generateCanvas") {
              return (
                <GenerateCanvasCard key={idx} part={part} canvasSlug={canvasSlug} />
              );
            }

            // Hide other tool invocations (analyzeBlock, checkConsistency)
            return null;
          }

          // Skip known non-renderable parts silently
          if (
            part.type === "step-start" ||
            part.type === "source-url" ||
            part.type === "source-document" ||
            part.type === "reasoning" ||
            part.type === "file"
          ) {
            return null;
          }

          // Debug: log truly unknown part types
          if (process.env.NODE_ENV === "development" && part.type !== "text") {
            console.log("[ChatMessage] Unknown part type:", part.type, part);
          }
          return null;
        })}

        {/* Regenerate button for last assistant message */}
        {!isUser && onRegenerate && (
          <div className="flex items-center gap-1 -mb-0.5">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-md text-foreground-muted/30 hover:text-foreground-muted/70 hover:bg-white/5 transition-all"
              aria-label="Regenerate response"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <polyline points="23 20 23 14 17 14" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single Edit Card (per-edit accept/reject/edit) ─────────────────────────

function SingleEditCard({
  edit,
  isPending,
  isAccepted,
  isRejected,
  onAccept,
  onReject,
  onRevert,
}: {
  edit: BlockEditProposal;
  isPending: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRevert?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(edit.newContent);

  const handleAcceptEdited = () => {
    // Mutate the edit's newContent before accepting
    edit.newContent = editedContent;
    setIsEditing(false);
    onAccept();
  };

  const handleCancelEdit = () => {
    setEditedContent(edit.newContent);
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border border-(--chroma-amber)/25 bg-(--chroma-amber)/4 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-(--chroma-amber)"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span className="font-display-small text-[11px] uppercase tracking-wider text-(--chroma-amber)">
          {edit?.blockType?.replace(/_/g, " ")}
        </span>
        {edit.mode !== "both" && (
          <span className="text-[9px] font-mono text-foreground-muted/40 uppercase">
            {edit.mode}
          </span>
        )}
      </div>

      {/* Reason */}
      <div className="px-3 pt-2.5">
        <p className="text-[11px] text-foreground-muted/70 leading-relaxed italic">
          {edit.reason}
        </p>
      </div>

      {/* Diff */}
      <div className="p-3 text-[11px] font-mono leading-relaxed space-y-1">
        {/* Old content */}
        {edit.oldContent ? (
          <div className="line-through text-red-400/60 bg-red-500/7 px-2.5 py-1.5 rounded-md whitespace-pre-wrap">
            {edit.oldContent}
          </div>
        ) : (
          <div className="text-foreground-muted/30 bg-white/2 px-2.5 py-1.5 rounded-md italic">
            (empty)
          </div>
        )}

        {/* New content — editable or static */}
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full text-green-400/80 bg-green-500/7 px-2.5 py-1.5 rounded-md whitespace-pre-wrap border border-green-500/20 focus:border-green-500/40 outline-none resize-y min-h-[60px] font-mono text-[11px] leading-relaxed"
            rows={Math.max(3, editedContent.split("\n").length)}
          />
        ) : (
          <div className="text-green-400/80 bg-green-500/7 px-2.5 py-1.5 rounded-md whitespace-pre-wrap">
            {edit.newContent}
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-3 pb-3">
          <div className="text-[10px] text-foreground-muted/40 text-center">
            Generating...
          </div>
        </div>
      )}

      {!isPending && !isAccepted && !isRejected && !isEditing && (
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={onAccept}
            className="flex-1 px-3 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400/90 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 text-foreground-muted/60 hover:text-foreground-muted/80 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/4 hover:bg-red-500/15 text-foreground-muted/50 hover:text-red-400/80 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {!isPending && !isAccepted && !isRejected && isEditing && (
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={handleAcceptEdited}
            className="flex-1 px-3 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400/90 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Accept Edit
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-3 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 text-foreground-muted/50 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isAccepted && (
        <div className="px-3 pb-2.5 flex items-center justify-center gap-2">
          <span className="text-green-400/70 text-[10px] font-display-small uppercase tracking-wider">
            Changes applied
          </span>
          {onRevert && (
            <button
              onClick={onRevert}
              className="text-[10px] text-foreground-muted/30 hover:text-foreground-muted/70 underline underline-offset-2 transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {isRejected && (
        <div className="px-3 pb-2.5 text-foreground-muted/40 text-[10px] text-center font-display-small uppercase tracking-wider line-through">
          Changes rejected
        </div>
      )}
    </div>
  );
}

// ─── Segment Proposal Card ──────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-red-500/15", text: "text-red-400/90" },
  medium: { bg: "bg-(--chroma-amber)/15", text: "text-(--chroma-amber)" },
  low: { bg: "bg-blue-500/15", text: "text-blue-400/90" },
};

function SegmentProposalCard({
  segment,
  isPending,
  isAccepted,
  isRejected,
  onAccept,
  onReject,
}: {
  segment: SegmentProposal;
  isPending: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const badge = PRIORITY_BADGE[segment.priority] ?? PRIORITY_BADGE.medium;

  return (
    <div className="rounded-xl border border-(--chroma-indigo)/25 bg-(--chroma-indigo)/4 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-(--chroma-indigo)"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="font-display-small text-[11px] uppercase tracking-wider text-(--chroma-indigo) flex-1">
          {segment.name}
        </span>
        <span
          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
        >
          {segment.priority}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5">
        <p className="text-[11px] text-foreground/70 leading-relaxed">
          {segment.description}
        </p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-foreground-muted/50">
          {segment.demographics && (
            <div>
              <span className="text-foreground-muted/30 uppercase tracking-wider">Demo:</span>{" "}
              {segment.demographics}
            </div>
          )}
          {segment.psychographics && (
            <div>
              <span className="text-foreground-muted/30 uppercase tracking-wider">Psycho:</span>{" "}
              {segment.psychographics}
            </div>
          )}
          {segment.behavioral && (
            <div>
              <span className="text-foreground-muted/30 uppercase tracking-wider">Behavior:</span>{" "}
              {segment.behavioral}
            </div>
          )}
          {segment.geographic && (
            <div>
              <span className="text-foreground-muted/30 uppercase tracking-wider">Geo:</span>{" "}
              {segment.geographic}
            </div>
          )}
        </div>

        {segment.estimatedSize && (
          <div className="text-[10px] text-foreground-muted/60">
            <span className="text-foreground-muted/30 uppercase tracking-wider">Est. size:</span>{" "}
            {segment.estimatedSize}
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-3 pb-3">
          <div className="text-[10px] text-foreground-muted/40 text-center">
            Generating...
          </div>
        </div>
      )}

      {!isPending && !isAccepted && !isRejected && (
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={onAccept}
            className="flex-1 px-3 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400/90 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Create
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/4 hover:bg-red-500/15 text-foreground-muted/50 hover:text-red-400/80 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {isAccepted && (
        <div className="px-3 pb-2.5 text-center">
          <span className="text-green-400/70 text-[10px] font-display-small uppercase tracking-wider">
            Segment created
          </span>
        </div>
      )}

      {isRejected && (
        <div className="px-3 pb-2.5 text-foreground-muted/40 text-[10px] text-center font-display-small uppercase tracking-wider line-through">
          Skipped
        </div>
      )}
    </div>
  );
}

// ─── Block Item Proposal Card ───────────────────────────────────────────────

function ItemProposalCard({
  item,
  isPending,
  isAccepted,
  isRejected,
  onAccept,
  onReject,
}: {
  item: BlockItemProposal;
  isPending: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] overflow-hidden">
      <div className="px-3 py-2 flex items-start gap-2">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground-muted/50 shrink-0 mt-0.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-foreground/80">
            {item.name}
          </span>
          {item.description && (
            <p className="text-[10px] text-foreground-muted/50 leading-relaxed mt-0.5">
              {item.description}
            </p>
          )}
        </div>

        {/* Inline actions */}
        {isPending && (
          <span className="text-[9px] text-foreground-muted/30 shrink-0">...</span>
        )}

        {!isPending && !isAccepted && !isRejected && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onAccept}
              className="px-2 py-0.5 rounded-md bg-green-500/12 hover:bg-green-500/22 text-green-400/80 text-[10px] font-display-small uppercase tracking-wider transition-colors"
            >
              Add
            </button>
            <button
              onClick={onReject}
              className="px-2 py-0.5 rounded-md bg-white/4 hover:bg-red-500/12 text-foreground-muted/40 hover:text-red-400/70 text-[10px] font-display-small uppercase tracking-wider transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {isAccepted && (
          <span className="text-green-400/60 text-[9px] font-display-small uppercase tracking-wider shrink-0">
            Added
          </span>
        )}

        {isRejected && (
          <span className="text-foreground-muted/30 text-[9px] font-display-small uppercase tracking-wider line-through shrink-0">
            Skipped
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Generate Canvas Card ────────────────────────────────────────────────────

function GenerateCanvasCard({
  part,
  canvasSlug: canvasSlugProp,
}: {
  part: { type: string; [key: string]: unknown };
  canvasSlug?: string;
}) {
  const isPending = isToolPending(part);
  const isDev = process.env.NODE_ENV === "development";

  // Extract data from the tool invocation
  const inv = part.type === "tool-invocation"
    ? (part.toolInvocation as { args?: Record<string, string>; result?: Record<string, string>; toolCallId?: string } | undefined)
    : undefined;
  const args = inv?.args ?? (part.input as Record<string, string> | undefined);
  const result = inv?.result ?? (part.output as Record<string, string> | undefined);
  const title = result?.title ?? args?.title;
  const toolCallId = inv?.toolCallId ?? (part.toolCallId as string | undefined);

  // Server-side tool returns { slug, canvasId, title } in result
  const canvasSlug = result?.slug ?? canvasSlugProp;

  // Count filled blocks from args
  const blockKeys = [
    "key_partnerships", "key_activities", "key_resources",
    "value_propositions", "customer_relationships", "channels",
    "customer_segments", "cost_structure", "revenue_streams",
  ];
  const filledBlocks = args
    ? blockKeys.filter((k) => args[k] && args[k].length > 10).length
    : 0;

  return (
    <div className="rounded-xl border border-(--chroma-indigo)/20 bg-(--chroma-indigo)/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {isPending ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--chroma-indigo)"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-spin shrink-0"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(52, 211, 153)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-foreground-muted/70">
            {isPending ? "Building your canvas..." : "Canvas generated"}
          </span>
          {title && (
            <span className="text-[11px] text-foreground/80 ml-1.5 font-medium">
              &mdash; {title}
            </span>
          )}
        </div>
      </div>

      {/* Block summary (when complete) */}
      {!isPending && filledBlocks > 0 && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="flex gap-0.5">
            {blockKeys.map((k) => (
              <div
                key={k}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: args?.[k] && args[k].length > 10
                    ? "rgb(52, 211, 153)"
                    : "var(--gray-a5)",
                }}
                title={k.replace(/_/g, " ")}
              />
            ))}
          </div>
          <span className="text-[10px] text-foreground-muted/50">
            {filledBlocks}/9 blocks filled
          </span>
        </div>
      )}

      {/* Canvas link */}
      {!isPending && canvasSlug && (
        <div className="px-3 pb-2">
          <a
            href={`/canvas/${canvasSlug}`}
            className="inline-flex items-center gap-1.5 text-[11px] text-(--chroma-indigo) hover:text-(--chroma-indigo)/80 transition-colors"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open canvas
          </a>
        </div>
      )}

      {/* Dev debug info */}
      {isDev && !isPending && (
        <div className="px-3 pb-2 space-y-0.5">
          {toolCallId && (
            <p className="text-[9px] font-mono text-foreground-muted/30 truncate">
              toolCallId: {toolCallId}
            </p>
          )}
          {canvasSlug && (
            <p className="text-[9px] font-mono text-foreground-muted/30 truncate">
              slug: {canvasSlug}
            </p>
          )}
          {args && (
            <details className="text-[9px] font-mono text-foreground-muted/30">
              <summary className="cursor-pointer hover:text-foreground-muted/50 transition-colors">
                tool args ({Object.keys(args).length} fields)
              </summary>
              <pre className="mt-1 p-2 rounded-md bg-black/20 overflow-x-auto max-h-40 overflow-y-auto text-[8px] leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
