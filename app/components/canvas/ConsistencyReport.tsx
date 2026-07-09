"use client";

interface Contradiction {
  blocks: string[];
  issue: string;
  severity: "minor" | "major" | "critical";
  suggestion: string;
}

interface MissingLink {
  from: string;
  to: string;
  issue: string;
}

interface ChainFinding {
  fromZone: string;
  toZone: string;
  issue: string;
  severity: "minor" | "major" | "critical";
  evidenceNeeded: string;
  suggestion: string;
}

export interface ConsistencyData {
  contradictions: Contradiction[];
  missingLinks: MissingLink[];
  chainFindings?: ChainFinding[];
  overallScore: number;
}

interface ConsistencyReportProps {
  data: ConsistencyData | null;
  isLoading: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: "var(--chroma-cyan)",
  major: "var(--chroma-amber)",
  critical: "var(--state-critical)",
};

export function ConsistencyReport({ data, isLoading }: ConsistencyReportProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-xs text-foreground-muted text-center glow-ai rounded-[14px]">
        Running consistency check across all blocks...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-xs text-foreground-muted text-center">
        Run a consistency check to find cross-block issues
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div
          className="text-2xl font-display"
          style={{
            color:
              data.overallScore >= 70
                ? "var(--state-healthy)"
                : data.overallScore >= 40
                  ? "var(--state-warning)"
                  : "var(--state-critical)",
          }}
        >
          {data.overallScore}
        </div>
        <div className="text-xs text-foreground-muted">Coherence Score</div>
      </div>

      {/* Contradictions */}
      {data.contradictions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
            Contradictions ({data.contradictions.length})
          </span>
          {data.contradictions.map((c, i) => (
            <div
              key={i}
              className="p-3 rounded-[14px] bg-canvas-surface border border-border border-t-2 flex flex-col gap-1.5"
              style={{ borderTopColor: SEVERITY_COLORS[c.severity] }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: SEVERITY_COLORS[c.severity] }}
                />
                <span
                  className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: SEVERITY_COLORS[c.severity] }}
                >
                  {c.severity}
                </span>
                <span className="text-[10px] text-foreground-muted">
                  {c.blocks.join(" / ")}
                </span>
              </div>
              <p className="text-xs text-foreground/80">{c.issue}</p>
              <p className="text-xs text-(--chroma-cyan)/70">{c.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chain Findings */}
      {data.chainFindings && data.chainFindings.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
            Chain Findings ({data.chainFindings.length})
          </span>
          {data.chainFindings.map((finding, i) => (
            <div
              key={i}
              className="p-3 rounded-[14px] bg-canvas-surface border border-border border-t-2 flex flex-col gap-1.5"
              style={{ borderTopColor: SEVERITY_COLORS[finding.severity] }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: SEVERITY_COLORS[finding.severity] }}
                />
                <span
                  className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: SEVERITY_COLORS[finding.severity] }}
                >
                  {finding.severity}
                </span>
                <span className="text-[10px] text-foreground-muted">
                  {finding.fromZone} -&gt; {finding.toZone}
                </span>
              </div>
              <p className="text-xs text-foreground/80">{finding.issue}</p>
              <p className="text-xs text-foreground-muted">
                Evidence needed: {finding.evidenceNeeded}
              </p>
              <p className="text-xs text-(--chroma-cyan)/70">
                {finding.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Missing Links */}
      {data.missingLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">
            Missing Links ({data.missingLinks.length})
          </span>
          {data.missingLinks.map((ml, i) => (
            <div
              key={i}
              className="p-3 rounded-[14px] bg-canvas-surface border border-border flex flex-col gap-1"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted">
                {ml.from} &rarr; {ml.to}
              </span>
              <p className="text-xs text-foreground/80">{ml.issue}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
