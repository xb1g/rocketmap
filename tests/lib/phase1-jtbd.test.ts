import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_ROLE_TYPES,
  JTBD_PAIN_TYPES,
  buildJTBDStatement,
  normalizeJTBDData,
} from '@/lib/zones/phase1-jtbd';

describe('phase1-jtbd helpers', () => {
  it('normalizes JTBD statements into the structured When/I want/so I can form', () => {
    const data = normalizeJTBDData({
      statements: [
        {
          id: 'jtbd-1',
          role: 'decision-maker',
          situation: 'quarterly planning exposes unknown churn drivers',
          job: 'identify the segment with the riskiest retention assumptions',
          outcome: 'fund the smallest experiment before roadmap lock',
          pains: [
            { id: 'pain-1', type: 'functional', description: 'Retention data is scattered' },
            { id: 'pain-2', type: 'invalid', description: 'Should not survive' },
          ],
        },
      ],
    });

    expect(JTBD_PAIN_TYPES).toEqual([
      'functional',
      'emotional',
      'social',
      'economic',
      'status',
    ]);
    expect(CUSTOMER_ROLE_TYPES).toEqual([
      'user',
      'buyer',
      'decision_maker',
      'influencer',
      'beneficiary',
      'economic_customer',
    ]);
    expect(data.statements[0]).toMatchObject({
      id: 'jtbd-1',
      role: 'decision_maker',
      statement:
        'When quarterly planning exposes unknown churn drivers, I want identify the segment with the riskiest retention assumptions, so I can fund the smallest experiment before roadmap lock.',
      pains: [{ id: 'pain-1', type: 'functional', description: 'Retention data is scattered' }],
    });
  });

  it('builds a JTBD statement from required parts', () => {
    expect(
      buildJTBDStatement({
        situation: 'an onboarding call reveals buyer/user mismatch',
        job: 'separate who uses the product from who approves the budget',
        outcome: 'test the right buying trigger',
      }),
    ).toBe(
      'When an onboarding call reveals buyer/user mismatch, I want separate who uses the product from who approves the budget, so I can test the right buying trigger.',
    );
  });
});
