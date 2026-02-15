"use client";

import type { AIAnalysis, AIUsage } from "@/lib/types/canvas";

interface BlockAIResultsProps {
  analysis: AIAnalysis | null;
  usage?: AIUsage | null;
}

function ResultSection({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span
        className="font-display-small text-[11px] uppercase tracking-wider"
        style={{ color }}
      >
        {title}
      </span>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="font-body text-xs text-foreground/80 flex gap-2 leading-snug"
          >
            <span style={{ color }} className="shrink-0 mt-0.5 opacity-60">
              &#8226;
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlockAIResults({ analysis, usage }: BlockAIResultsProps) {
  if (!analysis) {
    return (
      <div className="px-4 py-3 font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/50 text-center">
        Run analysis to see insights
      </div>
    );
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-5">
      {analysis.draft && (
        <div className="font-body text-xs text-foreground/70 leading-relaxed border-l-2 border-(--chroma-indigo)/30 pl-3 py-0.5">
          {analysis.draft}
        </div>
      )}
      <ResultSection
        title="Assumptions"
        items={analysis.assumptions}
        color="var(--chroma-amber)"
      />
      <ResultSection
        title="Risks"
        items={analysis.risks}
        color="var(--state-critical)"
      />
      <ResultSection
        title="Questions"
        items={analysis.questions}
        color="var(--chroma-cyan)"
      />
      {usage && (
        <div className="font-mono text-[9px] uppercase tracking-widest text-foreground/20 pt-3 border-t border-white/5 flex gap-3">
          <span>{usage.totalTokens} tokens</span>
          <span className="opacity-60">
            ({usage.inputTokens} in / {usage.outputTokens} out)
          </span>
        </div>
      )}
    </div>
  );
}
