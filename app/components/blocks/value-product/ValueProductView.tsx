'use client';

import {
  buildPositioningStatement,
  emitProductScopeSignals,
  normalizeProductScopeRows,
  type ValueProductData,
} from '@/lib/zones/phase1-value-product';

interface ValueProductViewProps {
  data: ValueProductData;
  className?: string;
}

export function ValueProductView({ data, className = '' }: ValueProductViewProps) {
  const productScopeRows = normalizeProductScopeRows(data.productScopeRows);
  const signals = emitProductScopeSignals(productScopeRows);

  return (
    <section className={`space-y-6 ${className}`}>
      <div className="space-y-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted/60">
            Per-role value map
          </p>
          <h3 className="text-base font-semibold text-foreground">Customer Role Mapping</h3>
        </div>

        {data.roleMappings.length === 0 ? (
          <p className="rounded-lg border border-border/70 bg-surface/40 p-4 text-sm text-foreground-muted/60">
            No customer roles mapped yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.roleMappings.map((mapping) => (
              <article
                key={mapping.id}
                className="rounded-lg border border-border/70 bg-surface/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-state-ai">
                      {mapping.role}
                    </p>
                    <h4 className="mt-1 text-sm font-semibold text-foreground">
                      {mapping.customer}
                    </h4>
                  </div>
                </div>
                <dl className="mt-4 space-y-3 text-xs">
                  <div>
                    <dt className="text-foreground-muted/50">Pain</dt>
                    <dd className="mt-1 text-foreground-muted">{mapping.pain}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground-muted/50">Desired outcome</dt>
                    <dd className="mt-1 text-foreground-muted">{mapping.desiredOutcome}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground-muted/50">Value promise</dt>
                    <dd className="mt-1 text-foreground">{mapping.valuePromise}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-state-ai/30 bg-state-ai/5 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-state-ai">
          Positioning
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          {buildPositioningStatement(data.positioning)}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted/60">
            Pain to proof
          </p>
          <h3 className="text-base font-semibold text-foreground">Product Scope</h3>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-surface/60 text-foreground-muted/60">
              <tr>
                <th className="px-3 py-2 font-medium">Pain</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Feature</th>
                <th className="px-3 py-2 font-medium">Proof metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {productScopeRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-foreground-muted/60">
                    No product scope rows yet.
                  </td>
                </tr>
              ) : (
                productScopeRows.map((row) => (
                  <tr key={row.id} className="bg-surface/30 align-top">
                    <td className="px-3 py-3 text-foreground-muted">{row.pain}</td>
                    <td className="px-3 py-3 text-foreground-muted">{row.outcome}</td>
                    <td className="px-3 py-3 font-medium text-foreground">{row.feature}</td>
                    <td className="px-3 py-3 text-state-healthy">{row.proofMetric}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 text-xs md:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-surface/40 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted/60">
            Assumptions emitted
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {signals.assumptions.length}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface/40 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted/60">
            Metrics emitted
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{signals.metrics.length}</p>
        </div>
      </div>
    </section>
  );
}
