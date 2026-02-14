'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heading, Text } from '@radix-ui/themes';

interface SavedIdea {
  id: string;
  text: string;
  savedAt: string;
}

const STORAGE_KEY = 'rocketmap-brainstorm-ideas';

const templates = [
  {
    name: 'SaaS Platform',
    desc: 'Software-as-a-Service with recurring revenue, cloud infrastructure, and self-serve onboarding.',
    emoji: '\u2601\uFE0F',
  },
  {
    name: 'Marketplace',
    desc: 'Two-sided platform connecting buyers and sellers with transaction-based revenue.',
    emoji: '\uD83C\uDFEA',
  },
  {
    name: 'Hardware Product',
    desc: 'Physical product with manufacturing, supply chain, and direct-to-consumer distribution.',
    emoji: '\uD83D\uDD27',
  },
  {
    name: 'Service Business',
    desc: 'Professional services with expertise-driven value and client relationship focus.',
    emoji: '\uD83E\uDD1D',
  },
];

export function BrainstormClient() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState('');
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedIdeas(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveIdea = () => {
    if (!ideaText.trim()) return;
    const newIdea: SavedIdea = {
      id: Date.now().toString(),
      text: ideaText.trim(),
      savedAt: new Date().toISOString(),
    };
    const updated = [newIdea, ...savedIdeas];
    setSavedIdeas(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setIdeaText('');
  };

  const deleteIdea = (id: string) => {
    const updated = savedIdeas.filter((i) => i.id !== id);
    setSavedIdeas(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const createCanvas = async (title: string) => {
    try {
      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create canvas');
      const { slug } = await res.json();
      router.push(`/canvas/${slug}`);
    } catch (error) {
      console.error('Failed to create canvas:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      saveIdea();
    }
  };

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <Heading size="8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.25rem' }}>
          Brainstorm
        </Heading>
        <Text size="2" style={{ color: 'var(--foreground-muted)' }}>
          Capture ideas, start from scratch, or use a template
        </Text>
      </div>

      <div className="brainstorm-capture" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem' }}>&#x2728;</span>
          <Text size="2" weight="medium" style={{ color: 'var(--foreground-muted)' }}>
            Quick Capture
          </Text>
        </div>
        <textarea
          className="brainstorm-textarea"
          placeholder="Describe your startup idea... What problem are you solving? Who are your customers?"
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
          <Text size="1" style={{ color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-mono)' }}>
            &#x2318;+Enter to save
          </Text>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={saveIdea}
              disabled={!ideaText.trim()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: ideaText.trim() ? '#fff' : 'var(--foreground-muted)',
                cursor: ideaText.trim() ? 'pointer' : 'default',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              Save Idea
            </button>
            <button
              onClick={() => ideaText.trim() && createCanvas(ideaText.trim().slice(0, 60))}
              disabled={!ideaText.trim()}
              className="quick-launch"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Create Canvas &#x2192;
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <Heading size="4" style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
          Start from Scratch
        </Heading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="template-card" onClick={() => createCanvas('Untitled BMC Canvas')}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>&#x1F4CA;</div>
            <div className="template-card-title">Business Model Canvas</div>
            <div className="template-card-desc">The classic 9-block framework for mapping your business model.</div>
          </div>
          <div className="template-card" onClick={() => createCanvas('Untitled Lean Canvas')}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>&#x26A1;</div>
            <div className="template-card-title">Lean Canvas</div>
            <div className="template-card-desc">Problem-solution focused canvas for lean startups.</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <Heading size="4" style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
          Start from Template
        </Heading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {templates.map((t) => (
            <div key={t.name} className="template-card" onClick={() => createCanvas(t.name)}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t.emoji}</div>
              <div className="template-card-title">{t.name}</div>
              <div className="template-card-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {savedIdeas.length > 0 && (
        <div>
          <Heading size="4" style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
            Saved Ideas
          </Heading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {savedIdeas.map((idea) => (
              <div
                key={idea.id}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="2" style={{ color: '#fff', lineHeight: 1.5 }}>
                    {idea.text}
                  </Text>
                  <Text size="1" style={{ color: 'var(--foreground-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem', display: 'block' }}>
                    {new Date(idea.savedAt).toLocaleDateString()}
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => createCanvas(idea.text.slice(0, 60))}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(99,102,241,0.2)',
                      background: 'rgba(99,102,241,0.08)',
                      color: 'var(--chroma-indigo)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Create Canvas
                  </button>
                  <button
                    onClick={() => deleteIdea(idea.id)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'transparent',
                      color: 'var(--foreground-muted)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    &#xD7;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
