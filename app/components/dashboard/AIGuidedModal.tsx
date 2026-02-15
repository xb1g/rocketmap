'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Dialog } from '@radix-ui/themes';
import { ChatMessages } from '../ai/ChatMessages';
import { ChatInput } from '../ai/ChatInput';

interface AIGuidedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreationState = 'chatting' | 'creating' | 'done' | 'error';

const CREATION_STEPS = [
  'Setting up your canvas...',
  'Filling in business model blocks...',
  'Almost there...',
];

export function AIGuidedModal({ open, onOpenChange }: AIGuidedModalProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [creationState, setCreationState] = useState<CreationState>('chatting');
  const [canvasTitle, setCanvasTitle] = useState('');
  const [creationStep, setCreationStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const creatingRef = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/canvas/guided-create' }),
    [],
  );

  const { messages, sendMessage, stop, status } = useChat({
    id: 'guided-create',
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Watch for generateCanvas tool completion
  useEffect(() => {
    if (creatingRef.current) return;

    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      for (const part of m.parts ?? []) {
        const p = part as Record<string, unknown>;
        const isToolPart =
          p.type === 'dynamic-tool' ||
          (typeof p.type === 'string' && (p.type as string).startsWith('tool-'));
        if (!isToolPart || p.toolName !== 'generateCanvas') continue;

        // Accept both 'output-available' (execution done) and 'call' (has full input)
        const data =
          p.state === 'output-available'
            ? ((p.output ?? p.input) as Record<string, string> | undefined)
            : p.state === 'call'
              ? (p.input as Record<string, string> | undefined)
              : undefined;

        if (data && data.title && data.customer_segments) {
          creatingRef.current = true;
          handleCreateCanvas(data);
          return;
        }
      }
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate creation steps
  useEffect(() => {
    if (creationState !== 'creating') return;
    const interval = setInterval(() => {
      setCreationStep((s) => Math.min(s + 1, CREATION_STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [creationState]);

  const handleCreateCanvas = useCallback(async (data: Record<string, string>) => {
    const title = data.title || 'Untitled Canvas';
    setCanvasTitle(title);
    setCreationState('creating');
    setCreationStep(0);

    try {
      const { title: t, ...blocks } = data;
      const res = await fetch('/api/canvas/create-with-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t || title, blocks }),
      });
      if (!res.ok) throw new Error('Failed to create canvas');
      const { slug } = await res.json();

      // Show success briefly, then navigate
      setCreationState('done');
      setTimeout(() => {
        onOpenChange(false);
        router.push(`/canvas/${slug}`);
      }, 800);
    } catch (err) {
      console.error('Canvas creation failed:', err);
      setCreationState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create canvas');
      creatingRef.current = false;
    }
  }, [router, onOpenChange]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
  };

  const hasMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant').length > 0;

  const handleOpenChange = (next: boolean) => {
    // Don't close during creation or done transition
    if (!next && (creationState === 'creating' || creationState === 'done')) return;
    // Prevent accidental close (overlay click / Escape) when chat has started
    if (!next && hasMessages && creationState === 'chatting') return;
    onOpenChange(next);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content
        style={{
          maxWidth: '560px',
          height: '70vh',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header — only show during chatting */}
        {creationState === 'chatting' && (
          <div style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--gray-a4)',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <Dialog.Title size="4" style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
                AI-Guided Canvas
              </Dialog.Title>
              <Dialog.Description size="1" style={{ color: 'var(--foreground-muted)', marginTop: '4px' }}>
                Describe your startup idea and AI will build your canvas
              </Dialog.Description>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-foreground-muted/40 hover:text-foreground-muted/80 hover:bg-white/5 transition-all mt-0.5"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Visually-hidden title for accessibility when header is hidden */}
        {creationState !== 'chatting' && (
          <Dialog.Title size="1" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            Creating canvas
          </Dialog.Title>
        )}

        {creationState === 'creating' || creationState === 'done' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
            {/* Animated icon */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: creationState === 'done'
                    ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(52, 211, 153, 0.05))'
                    : 'linear-gradient(135deg, var(--chroma-indigo), var(--chroma-violet))',
                  opacity: creationState === 'done' ? 1 : 0.15,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {creationState === 'done' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--chroma-indigo)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <p className="text-base font-display-small" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {creationState === 'done' ? 'Canvas ready!' : canvasTitle || 'Building your canvas'}
              </p>
              <p className="text-xs text-foreground-muted mt-1.5">
                {creationState === 'done'
                  ? 'Redirecting to your canvas...'
                  : CREATION_STEPS[creationStep]}
              </p>
            </div>

            {/* Progress dots */}
            {creationState === 'creating' && (
              <div className="flex gap-1.5">
                {CREATION_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      background: i <= creationStep ? 'var(--chroma-indigo)' : 'var(--gray-a5)',
                      transform: i === creationStep ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : creationState === 'error' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(248, 113, 113)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-red-400 mb-1">Something went wrong</p>
              <p className="text-xs text-foreground-muted">{errorMessage}</p>
            </div>
            <button
              className="px-4 py-2 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-foreground-muted hover:text-foreground transition-colors"
              onClick={() => {
                setCreationState('chatting');
                setErrorMessage('');
              }}
            >
              Back to chat
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {messages.filter((m) => m.role === 'user' || m.role === 'assistant').length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--chroma-indigo)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-sm text-foreground-muted leading-relaxed">
                  Tell me about your startup idea — what problem are you solving and for whom?
                </span>
              </div>
            ) : (
              <ChatMessages messages={messages} isLoading={isLoading} />
            )}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onStop={stop}
              isLoading={isLoading}
              placeholder="Describe your startup idea..."
            />
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
