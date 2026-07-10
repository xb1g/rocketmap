import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ValueProductView } from '@/app/components/blocks/value-product/ValueProductView';
import type { ValueProductData } from '@/lib/zones/phase1-value-product';

describe('ValueProductView', () => {
  it('renders role mapping, positioning statement, and product scope rows', () => {
    const data: ValueProductData = {
      roleMappings: [
        {
          id: 'role-1',
          role: 'Economic buyer',
          customer: 'Founder',
          pain: 'wastes budget on unproven features',
          desiredOutcome: 'fund only validated scope',
          valuePromise: 'turn scope into testable proof',
        },
      ],
      positioning: {
        customer: 'Founder',
        pain: 'wastes budget on unproven features',
        outcome: 'fund only validated scope',
        mechanism: 'a pain-to-proof product scope table',
        alternative: 'static roadmap docs',
      },
      productScopeRows: [
        {
          id: 'scope-1',
          pain: 'Unproven roadmap bets',
          outcome: 'Evidence-backed scope',
          feature: 'Scope proof table',
          proofMetric: '2 buyer commitments',
        },
      ],
    };

    render(<ValueProductView data={data} />);

    expect(screen.getByText('Economic buyer')).toBeInTheDocument();
    expect(screen.getByText('turn scope into testable proof')).toBeInTheDocument();
    expect(
      screen.getByText(
        'For Founder, who wastes budget on unproven features, we fund only validated scope, through a pain-to-proof product scope table, unlike static roadmap docs.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Scope proof table')).toBeInTheDocument();
    expect(screen.getByText('2 buyer commitments')).toBeInTheDocument();
  });
});
