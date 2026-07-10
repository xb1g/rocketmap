import { describe, expect, it } from 'vitest';
import {
  buildPositioningStatement,
  emitProductScopeSignals,
  normalizeProductScopeRows,
} from '@/lib/zones/phase1-value-product';

describe('phase1 value/product helpers', () => {
  it('builds the required positioning statement from trimmed fields', () => {
    const statement = buildPositioningStatement({
      customer: '  bootstrapped SaaS founders ',
      pain: ' cannot tell which feature proves demand ',
      outcome: 'identify the smallest sellable wedge',
      mechanism: 'a pain-to-proof product scope table ',
      alternative: ' generic roadmap templates ',
    });

    expect(statement).toBe(
      'For bootstrapped SaaS founders, who cannot tell which feature proves demand, we identify the smallest sellable wedge, through a pain-to-proof product scope table, unlike generic roadmap templates.'
    );
  });

  it('normalizes product scope rows and emits linked assumptions and metrics', () => {
    const rows = normalizeProductScopeRows([
      {
        pain: 'Teams cannot prove buyers care before building',
        outcome: 'Commitment before roadmap investment',
        feature: 'Paid pilot workflow',
        proofMetric: '3 signed pilots in 30 days',
      },
      {
        pain: '  ',
        outcome: 'Ignored row',
        feature: 'No pain',
        proofMetric: 'No metric',
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'scope-1',
      pain: 'Teams cannot prove buyers care before building',
      outcome: 'Commitment before roadmap investment',
      feature: 'Paid pilot workflow',
      proofMetric: '3 signed pilots in 30 days',
    });

    const signals = emitProductScopeSignals(rows);

    expect(signals.assumptions).toEqual([
      {
        id: 'assumption-scope-1',
        sourceRowId: 'scope-1',
        text: 'Customers with pain "Teams cannot prove buyers care before building" will value "Commitment before roadmap investment" enough to use "Paid pilot workflow".',
      },
    ]);
    expect(signals.metrics).toEqual([
      {
        id: 'metric-scope-1',
        sourceRowId: 'scope-1',
        name: 'Proof metric for Paid pilot workflow',
        target: '3 signed pilots in 30 days',
        linkedAssumptionId: 'assumption-scope-1',
      },
    ]);
  });
});
