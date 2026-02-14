'use client';

import type { AIAnalysis } from '@/lib/types/canvas';

interface BlockAIResultsProps {
  analysis: AIAnalysis | null;
}

function ResultSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color }}>
        {title}
      </span>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground/80 flex gap-2">
            <span style={{ color }} className="shrink-0 mt-0.5">&#8226;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlockAIResults({ analysis }: BlockAIResultsProps) {
  if (!analysis) {
    return (
      <div className="px-4 py-3 text-xs text-foreground-muted text-center">
        Run analysis to see insights
      </div>
    );
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-4">
      {analysis.draft && (
        <div className="text-xs text-foreground/70 leading-relaxed border-l-2 border-[var(--chroma-indigo)]/30 pl-3">
          {analysis.draft}
        </div>
      )}
      <ResultSection title="Assumptions" items={analysis.assumptions} color="var(--chroma-amber)" />
      <ResultSection title="Risks" items={analysis.risks} color="var(--state-critical)" />
      <ResultSection title="Questions" items={analysis.questions} color="var(--chroma-cyan)" />
    </div>
  );
}
