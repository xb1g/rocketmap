"use client";

export function AssumptionsView() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display-small text-lg">Assumptions</h2>
        </div>
        <p className="text-sm text-foreground-muted">
          Track and validate your business assumptions. Assumptions are
          extracted from AI analysis or added manually.
        </p>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-foreground-muted text-sm">
            No assumptions yet. Analyze your blocks to surface hidden
            assumptions, or add them manually.
          </p>
        </div>
      </div>
    </div>
  );
}
