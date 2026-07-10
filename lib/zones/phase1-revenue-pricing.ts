import type { ExperimentType } from '@/lib/types/canvas';
import type { ZoneOutput } from '@/lib/types/zones';

export type RevenueModelId =
  | 'one_time'
  | 'license'
  | 'rev_share'
  | 'saas'
  | 'sponsorship';

export type WtpTestPreference = 'reserve' | 'deposit' | 'paid_pilot';
export type WtpTestInputPreference = WtpTestPreference | 'survey' | 'interview';

export interface RevenueModelCatalogItem {
  id: RevenueModelId;
  label: string;
  description: string;
}

export interface RevenuePricingSegment {
  segmentId: string;
  segmentName: string;
  revenueModel: RevenueModelId;
  paymentMoment: string;
  pricePoint?: string;
  wtpTestPreference: WtpTestPreference;
}

export interface RevenuePricingData {
  segments: RevenuePricingSegment[];
  notes?: string;
  lastUpdated?: string;
}

export interface RevenuePricingInput {
  segments?: Array<Partial<RevenuePricingSegment> & {
    segmentId?: string;
    segmentName?: string;
    revenueModel?: RevenueModelId;
    wtpTestPreference?: WtpTestInputPreference;
  }>;
  notes?: string;
  lastUpdated?: string;
}

export interface WtpExperimentDraftInput {
  segmentName: string;
  revenueModel: RevenueModelId;
  paymentMoment: string;
  pricePoint?: string;
  testPreference?: WtpTestInputPreference;
}

export interface RiskEngineExperimentDraft {
  type: ExperimentType;
  description: string;
  successCriteria: string;
  successThreshold: string;
  costEstimate: string;
  durationEstimate: string;
}

export const REVENUE_MODEL_CATALOG: RevenueModelCatalogItem[] = [
  {
    id: 'one_time',
    label: 'One-time',
    description: 'A single purchase tied to a discrete outcome, deliverable, or setup moment.',
  },
  {
    id: 'license',
    label: 'License',
    description: 'A recurring right to use software, data, content, IP, or a protected workflow.',
  },
  {
    id: 'rev_share',
    label: 'Revenue share',
    description: 'A take-rate model where payment scales with revenue, transactions, or closed deals.',
  },
  {
    id: 'saas',
    label: 'SaaS',
    description: 'Subscription access to an ongoing product or operating system.',
  },
  {
    id: 'sponsorship',
    label: 'Sponsorship',
    description: 'A buyer pays for access, reach, credibility, placement, or association.',
  },
];

const MODEL_IDS = new Set<RevenueModelId>(
  REVENUE_MODEL_CATALOG.map((item) => item.id),
);

function isRevenueModelId(value: unknown): value is RevenueModelId {
  return typeof value === 'string' && MODEL_IDS.has(value as RevenueModelId);
}

export function normalizeWtpTestPreference(
  preference: WtpTestInputPreference | undefined,
  revenueModel: RevenueModelId = 'saas',
): WtpTestPreference {
  if (preference === 'reserve' || preference === 'deposit' || preference === 'paid_pilot') {
    return preference;
  }

  if (revenueModel === 'one_time') return 'deposit';
  if (revenueModel === 'sponsorship') return 'paid_pilot';
  return 'paid_pilot';
}

export function normalizeRevenuePricingData(
  input: RevenuePricingInput | null | undefined,
): RevenuePricingData {
  const segments = (input?.segments ?? []).map((segment, index) => {
    const revenueModel = isRevenueModelId(segment.revenueModel)
      ? segment.revenueModel
      : 'saas';

    return {
      segmentId: segment.segmentId?.trim() || `segment-${index + 1}`,
      segmentName: segment.segmentName?.trim() || `Segment ${index + 1}`,
      revenueModel,
      paymentMoment: segment.paymentMoment?.trim() || '',
      pricePoint: segment.pricePoint?.trim() || undefined,
      wtpTestPreference: normalizeWtpTestPreference(
        segment.wtpTestPreference,
        revenueModel,
      ),
    };
  });

  return {
    segments,
    notes: input?.notes?.trim() || undefined,
    lastUpdated: input?.lastUpdated,
  };
}

export function designWtpExperimentDraft(
  input: WtpExperimentDraftInput,
): RiskEngineExperimentDraft {
  const preference = normalizeWtpTestPreference(
    input.testPreference,
    input.revenueModel,
  );
  const pricePoint = input.pricePoint?.trim() || 'the proposed price';
  const paymentMoment = input.paymentMoment.trim() || 'the value moment';
  const segmentName = input.segmentName.trim() || 'the target segment';

  if (preference === 'reserve') {
    return {
      type: 'mvp',
      description: `Offer ${segmentName} a reserve-now path at ${pricePoint} immediately after: ${paymentMoment}. The reserve action must require a named account, buying contact, and explicit permission to follow up for payment.`,
      successCriteria: `${segmentName} commit real payment intent through a reservation tied to the payment moment, without relying on survey answers.`,
      successThreshold: `At least 10 qualified reservations at ${pricePoint} or higher within 14 days.`,
      costEstimate: '$0-$300',
      durationEstimate: '1-2 weeks',
    };
  }

  if (preference === 'deposit') {
    return {
      type: 'mvp',
      description: `Ask ${segmentName} for a refundable deposit toward ${pricePoint} when they reach this payment moment: ${paymentMoment}. Count only completed deposit commitments from qualified buyers.`,
      successCriteria: `${segmentName} commit real payment through deposits instead of positive opinions or would-you-pay responses.`,
      successThreshold: `At least 5 qualified deposits against ${pricePoint} within 14 days.`,
      costEstimate: '$50-$500',
      durationEstimate: '1-2 weeks',
    };
  }

  return {
    type: 'mvp',
    description: `Run a paid pilot for ${segmentName} at ${pricePoint} triggered by this payment moment: ${paymentMoment}. Scope the pilot around the smallest paid outcome that proves the buyer will exchange money for the promised value.`,
    successCriteria: `${segmentName} commit real payment for a paid pilot and complete the first value-delivery milestone.`,
    successThreshold: `At least 3 qualified paid pilots at ${pricePoint} or higher within 21 days.`,
    costEstimate: '$250-$1,500',
    durationEstimate: '2-3 weeks',
  };
}

export function createRevenuePricingZoneOutput(
  data: RevenuePricingData,
): ZoneOutput {
  const readySegments = data.segments.filter(
    (segment) => segment.paymentMoment.trim().length > 0,
  );

  return {
    zone: 'revenue_pricing',
    label: 'Z4 Revenue + Pricing',
    sourceBlocks: ['revenue_streams'],
    readiness:
      data.segments.length === 0
        ? 'missing'
        : readySegments.length === data.segments.length
          ? 'ready'
          : 'partial',
    structuredData: {
      revenueModels: REVENUE_MODEL_CATALOG,
      segments: data.segments,
    },
    assumptions: data.segments.map((segment) => {
      const price = segment.pricePoint ? ` at ${segment.pricePoint}` : '';
      return `${segment.segmentName} will pay via ${segment.revenueModel}${price} when: ${segment.paymentMoment || 'the payment moment is proven'}.`;
    }),
    metrics: data.segments.map((segment) => ({
      id: `wtp-${segment.segmentId}`,
      name: `${segment.segmentName} WTP commitment`,
      targetThreshold: designWtpExperimentDraft({
        segmentName: segment.segmentName,
        revenueModel: segment.revenueModel,
        paymentMoment: segment.paymentMoment,
        pricePoint: segment.pricePoint,
        testPreference: segment.wtpTestPreference,
      }).successThreshold,
      unit: 'paid commitments',
      linkedAssumption: `${segment.segmentName} willingness to pay`,
      source: 'revenue_pricing',
    })),
    feedsInto: ['unit_economics'],
    updatedAt: data.lastUpdated,
  };
}
