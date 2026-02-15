'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Dialog } from '@radix-ui/themes';
import { ChatMessages } from '../ai/ChatMessages';
import { ChatInput } from '../ai/ChatInput';

interface AIGuidedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreationState = 'chatting' | 'creating' | 'done' | 'error';
type ViewState = 'browse' | 'chat';

const CREATION_STEPS = [
  'Setting up your canvas...',
  'Filling in business model blocks...',
  'Almost there...',
];

const STORAGE_KEY = 'rocketmap-guided-sessions';

interface GuidedSession {
  id: string;
  preview: string;
  createdAt: number;
  status: 'active' | 'completed';
  canvasSlug?: string;
  messages: UIMessage[];
}

function loadSessions(): GuidedSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: GuidedSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage full or unavailable
  }
}

export function AIGuidedModal({ open, onOpenChange }: AIGuidedModalProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [creationState, setCreationState] = useState<CreationState>('chatting');
  const [canvasTitle, setCanvasTitle] = useState('');
  const [creationStep, setCreationStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const creatingRef = useRef(false);

  // Session management
  const [sessions, setSessions] = useState<GuidedSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>('chat');
  const initializedRef = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/canvas/guided-create' }),
    [],
  );

  // Use a stable ID — we manage session switching via setMessages, not by changing the chat ID
  const { messages, sendMessage, setMessages, stop, status } = useChat({
    id: 'guided-create',
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Load sessions on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const loaded = loadSessions();
    setSessions(loaded);
  }, []);

  // When modal opens, decide what to show
  useEffect(() => {
    if (!open) return;
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0 && !activeSessionId) {
      setView('browse');
    } else if (!activeSessionId) {
      startNewSession();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;

    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages,
              preview: userMsgs[0]?.parts
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join(' ')
                .slice(0, 80) || s.preview,
            }
          : s,
      );
      saveSessions(updated);
      return updated;
    });
  }, [messages, activeSessionId]);

  const startNewSession = useCallback(() => {
    const id = `guided-${Date.now()}`;
    const session: GuidedSession = {
      id,
      preview: 'New conversation',
      createdAt: Date.now(),
      status: 'active',
      messages: [],
    };
    setSessions((prev) => {
      const updated = [session, ...prev];
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(id);
    setCreationState('chatting');
    setCanvasTitle('');
    setErrorMessage('');
    creatingRef.current = false;
    setMessages([]);
    setView('chat');
  }, [setMessages]);

  const resumeSession = useCallback((session: GuidedSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setCreationState(session.status === 'completed' ? 'done' : 'chatting');
    setCanvasTitle('');
    setErrorMessage('');
    creatingRef.current = session.status === 'completed';
    setView('chat');
  }, [setMessages]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);
      if (updated.length === 0) {
        startNewSession();
      }
      return updated;
    });
  }, [startNewSession]);

  // Watch for generateCanvas tool completion (server-side creation)
  useEffect(() => {
    if (creatingRef.current) return;

    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      for (const part of m.parts ?? []) {
        const p = part as Record<string, unknown>;
        if (p.type !== 'tool-invocation') continue;

        const inv = p.toolInvocation as {
          toolName?: string;
          state?: string;
          args?: Record<string, string>;
          result?: { slug?: string; canvasId?: number; title?: string };
        } | undefined;
        if (!inv || inv.toolName !== 'generateCanvas') continue;

        // The server-side tool returns { slug, canvasId, title } in `result`
        if (inv.state === 'result' && inv.result?.slug) {
          creatingRef.current = true;
          handleCanvasReady(inv.result.slug, inv.result.title ?? inv.args?.title ?? 'Untitled Canvas');
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

  const handleCanvasReady = useCallback((slug: string, title: string) => {
    setCanvasTitle(title);
    setCreationState('creating');
    setCreationStep(0);

    // Mark session as completed
    if (activeSessionId) {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, status: 'completed' as const, canvasSlug: slug }
            : s,
        );
        saveSessions(updated);
        return updated;
      });
    }

    // Brief animation then redirect
    setTimeout(() => {
      setCreationState('done');
      setTimeout(() => {
        onOpenChange(false);
        router.push(`/canvas/${slug}`);
      }, 1200);
    }, 1500);
  }, [router, onOpenChange, activeSessionId]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
  };

  const hasMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant').length > 0;

  const handleOpenChange = (next: boolean) => {
    if (!next && (creationState === 'creating' || creationState === 'done')) return;
    if (!next && hasMessages && creationState === 'chatting') return;
    onOpenChange(next);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleBackToBrowse = () => {
    if (sessions.length > 0) {
      setView('browse');
    }
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
        {/* ===== Browse View ===== */}
        {view === 'browse' && creationState === 'chatting' ? (
          <>
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
                  Your conversations
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

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* New Conversation button */}
              <button
                onClick={startNewSession}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--chroma-indigo)" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className="text-sm text-foreground-muted group-hover:text-foreground transition-colors">
                  New conversation
                </span>
              </button>

              {/* Separator */}
              {sessions.length > 0 && (
                <div className="border-t border-white/5 my-1" />
              )}

              {/* Session list */}
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => session.status === 'completed' && session.canvasSlug
                    ? router.push(`/canvas/${session.canvasSlug}`)
                    : resumeSession(session)
                  }
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: session.status === 'completed'
                        ? 'rgba(52, 211, 153, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: session.status === 'completed'
                        ? '1px solid rgba(52, 211, 153, 0.2)'
                        : '1px solid var(--gray-a4)',
                    }}>
                    {session.status === 'completed' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-a9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-foreground/80 group-hover:text-foreground transition-colors">
                      {session.preview}
                    </p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      {session.status === 'completed' ? 'Canvas created' : 'In progress'}
                      {' · '}
                      {formatRelativeTime(session.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center rounded text-foreground-muted/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    aria-label="Delete session"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* ===== Chat View ===== */}

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
                <div className="flex items-center gap-2">
                  {sessions.length > 1 && (
                    <button
                      onClick={handleBackToBrowse}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-foreground-muted/40 hover:text-foreground-muted/80 hover:bg-white/5 transition-all"
                      aria-label="Back to sessions"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                  )}
                  <div>
                    <Dialog.Title size="4" style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
                      AI-Guided Canvas
                    </Dialog.Title>
                    <Dialog.Description size="1" style={{ color: 'var(--foreground-muted)', marginTop: '4px' }}>
                      Describe your startup idea and AI will build your canvas
                    </Dialog.Description>
                  </div>
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
                  <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    status={status}
                    canvasSlug={sessions.find((s) => s.id === activeSessionId)?.canvasSlug}
                  />
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
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
