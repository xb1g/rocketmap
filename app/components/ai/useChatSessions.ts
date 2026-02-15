'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChatSession } from '@/lib/ai/chat-persistence';

interface UseChatSessionsOptions {
  canvasId: string;
  scopePrefix: string;
}

interface UseChatSessionsReturn {
  sessions: ChatSession[];
  activeSessionKey: string;
  setActiveSessionKey: (key: string) => void;
  createNewSession: () => string;
  sessionsLoaded: boolean;
  refreshSessions: () => void;
}

export function useChatSessions({ canvasId, scopePrefix }: UseChatSessionsOptions): UseChatSessionsReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionKey, setActiveSessionKey] = useState(scopePrefix);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const fetchSessions = useCallback(() => {
    fetch(`/api/canvas/${canvasId}/messages?sessions=1&scope=${encodeURIComponent(scopePrefix)}`)
      .then((r) => r.json())
      .then((data) => {
        const fetched: ChatSession[] = data.sessions ?? [];
        setSessions((prev) => {
          // Merge: keep optimistic sessions that aren't in fetched data yet
          const fetchedKeys = new Set(fetched.map((s) => s.sessionKey));
          const optimistic = prev.filter((s) => !fetchedKeys.has(s.sessionKey) && s.messageCount === 0);
          return [...fetched, ...optimistic];
        });
        setSessionsLoaded(true);
      })
      .catch(() => {
        setSessions([]);
        setSessionsLoaded(true);
      });
  }, [canvasId, scopePrefix]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createNewSession = useCallback(() => {
    const newKey = `${scopePrefix}:${Date.now()}`;
    const optimistic: ChatSession = {
      sessionKey: newKey,
      label: 'New chat',
      createdAt: new Date().toISOString(),
      messageCount: 0,
    };
    setSessions((prev) => [...prev, optimistic]);
    setActiveSessionKey(newKey);
    return newKey;
  }, [scopePrefix]);

  return {
    sessions,
    activeSessionKey,
    setActiveSessionKey,
    createNewSession,
    sessionsLoaded,
    refreshSessions: fetchSessions,
  };
}
