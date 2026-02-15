'use client';

import ReactMarkdown from 'react-markdown';
import type { BlockEditProposal } from '@/lib/types/canvas';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageWithPartsProps {
  role: 'user' | 'assistant';
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
  onAcceptEdit?: (proposalId: string, edits: BlockEditProposal[]) => void;
  onRejectEdit?: (proposalId: string) => void;
  acceptedProposals?: Set<string>;
  rejectedProposals?: Set<string>;
}

/**
 * Simple text-only message (backward compatible).
 */
export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-[var(--chroma-indigo)]/15 text-foreground/90 whitespace-pre-wrap'
            : 'rounded-2xl rounded-bl-md bg-white/[0.04] text-foreground/75 border border-white/[0.04] chat-markdown'
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
  role,
  parts,
  onAcceptEdit,
  onRejectEdit,
  acceptedProposals,
  rejectedProposals,
}: ChatMessageWithPartsProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] flex flex-col gap-2">
        {parts.map((part, idx) => {
          // Text parts
          if (part.type === 'text' && part.text) {
            return (
              <div
                key={idx}
                className={`px-3 py-2 text-xs leading-relaxed ${
                  isUser
                    ? 'rounded-2xl rounded-br-md bg-[var(--chroma-indigo)]/15 text-foreground/90 whitespace-pre-wrap'
                    : 'rounded-2xl rounded-bl-md bg-white/[0.04] text-foreground/75 border border-white/[0.04] chat-markdown'
                }`}
              >
                {isUser ? part.text : <ReactMarkdown>{part.text}</ReactMarkdown>}
              </div>
            );
          }

          // Tool invocation parts — check if it's a proposeBlockEdit call
          if (part.type === 'tool-invocation') {
            const ti = part as Record<string, unknown>;

            if (
              typeof ti.toolName !== 'string' ||
              typeof ti.toolInvocationId !== 'string'
            ) {
              return null;
            }

            if (ti.toolName === 'proposeBlockEdit') {
              const result = ti.result as Record<string, unknown> | undefined;
              const args = ti.args as Record<string, unknown> | undefined;
              const edits = (result?.edits ?? args?.edits) as BlockEditProposal[] | undefined;
              if (!edits?.length) return null;

              const proposalId = ti.toolInvocationId as string;
              const isAccepted = acceptedProposals?.has(proposalId) ?? false;
              const isRejected = rejectedProposals?.has(proposalId) ?? false;

              return (
                <BlockEditProposalCard
                  key={idx}
                  edits={edits}
                  proposalId={proposalId}
                  isAccepted={isAccepted}
                  isRejected={isRejected}
                  isPending={ti.state !== 'result'}
                  onAccept={() => onAcceptEdit?.(proposalId, edits)}
                  onReject={() => onRejectEdit?.(proposalId)}
                />
              );
            }

            // Hide other tool invocations (analyzeBlock, checkConsistency)
            return null;
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ─── Block Edit Proposal Card ────────────────────────────────────────────────

function BlockEditProposalCard({
  edits,
  proposalId,
  isAccepted,
  isRejected,
  isPending,
  onAccept,
  onReject,
}: {
  edits: BlockEditProposal[];
  proposalId: string;
  isAccepted: boolean;
  isRejected: boolean;
  isPending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--chroma-amber)]/25 bg-[var(--chroma-amber)]/[0.04] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--chroma-amber)]">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span className="font-display-small text-[11px] uppercase tracking-wider text-[var(--chroma-amber)]">
          Proposed Edit{edits.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Edits */}
      <div className="p-3 flex flex-col gap-3">
        {edits.map((edit, idx) => (
          <div key={idx} className={edits.length > 1 ? 'pb-3 last:pb-0 border-b border-white/5 last:border-0' : ''}>
            {/* Block label */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-display-small text-[11px] text-foreground/80 uppercase tracking-wide">
                {edit.blockType.replace(/_/g, ' ')}
              </span>
              {edit.mode !== 'both' && (
                <span className="text-[9px] font-mono text-foreground-muted/40 uppercase">
                  {edit.mode}
                </span>
              )}
            </div>

            {/* Reason */}
            <p className="text-[11px] text-foreground-muted/70 mb-2 leading-relaxed italic">
              {edit.reason}
            </p>

            {/* Diff */}
            <div className="text-[11px] font-mono leading-relaxed space-y-1">
              {/* Old content */}
              {edit.oldContent && (
                <div className="line-through text-red-400/60 bg-red-500/[0.07] px-2.5 py-1.5 rounded-md whitespace-pre-wrap">
                  {edit.oldContent}
                </div>
              )}
              {!edit.oldContent && (
                <div className="text-foreground-muted/30 bg-white/[0.02] px-2.5 py-1.5 rounded-md italic">
                  (empty)
                </div>
              )}
              {/* New content */}
              <div className="text-green-400/80 bg-green-500/[0.07] px-2.5 py-1.5 rounded-md whitespace-pre-wrap">
                {edit.newContent}
              </div>
            </div>
          </div>
        ))}
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
            Accept
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/15 text-foreground-muted/50 hover:text-red-400/80 text-[11px] font-display-small uppercase tracking-wider transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {isAccepted && (
        <div className="px-3 pb-2.5 text-green-400/70 text-[10px] text-center font-display-small uppercase tracking-wider">
          Changes applied
        </div>
      )}

      {isRejected && (
        <div className="px-3 pb-2.5 text-foreground-muted/40 text-[10px] text-center font-display-small uppercase tracking-wider">
          Changes rejected
        </div>
      )}
    </div>
  );
}
