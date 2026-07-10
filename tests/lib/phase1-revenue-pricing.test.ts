import { describe, expect, it } from 'vitest';
import {
  REVENUE_MODEL_CATALOG,
  designWtpExperimentDraft,
  normalizeRevenuePricingData,
} from '@/lib/zones/phase1-revenue-pricing';

describe('phase1 revenue pricing helpers', () => {
  it('keeps the Phase 1 revenue catalog limited to the supported models', () => {
    expect(REVENUE_MODEL_CATALOG.map((item) => item.id)).toEqual([
      'one_time',
      'license',
      'rev_share',
      'saas',
      'sponsorship',
    ]);
  });

  it('designs WTP experiments as paid commitment tests compatible with the Risk Engine', () => {
    const draft = designWtpExperimentDraft({
      segmentName: 'Bootstrapped B2B SaaS founders',
      revenueModel: 'saas',
      paymentMoment:
        'Their first investor asks for evidence that pricing supports a repeatable sales motion.',
      pricePoint: '$299/month',
      testPreference: 'survey',
    });

    expect(draft.type).toBe('mvp');
    expect(draft.description).toContain('paid pilot');
    expect(draft.description).toContain('Bootstrapped B2B SaaS founders');
    expect(draft.description).not.toMatch(/would you pay|survey/i);
    expect(draft.successCriteria).toContain('commit real payment');
    expect(draft.successThreshold).toContain('$299/month');
    expect(draft.costEstimate).toBeTruthy();
    expect(draft.durationEstimate).toBeTruthy();
  });

  it('normalizes segment entries with payment moments and model defaults', () => {
    const normalized = normalizeRevenuePricingData({
      segments: [
        {
          segmentId: 'seg-1',
          segmentName: 'Campus accelerators',
          revenueModel: 'sponsorship',
          paymentMoment: 'Demo day teams need mentor-ready evidence packs.',
        },
      ],
    });

    expect(normalized.segments[0]).toMatchObject({
      segmentId: 'seg-1',
      segmentName: 'Campus accelerators',
      revenueModel: 'sponsorship',
      paymentMoment: 'Demo day teams need mentor-ready evidence packs.',
      wtpTestPreference: 'paid_pilot',
    });
  });
});
