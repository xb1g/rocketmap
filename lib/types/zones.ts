import type { BlockType, DecisionSignal } from '@/lib/types/canvas';

export type ZoneId =
  | 'customer_market'
  | 'pain_jtbd'
  | 'value_product'
  | 'revenue_pricing'
  | 'unit_economics'
  | 'distribution_growth'
  | 'partnership'
  | 'scalability_defensibility';

export type ZoneReadiness = 'missing' | 'partial' | 'ready';

export interface MetricDefinition {
  id: string;
  name: string;
  targetThreshold: string;
  currentValue?: string | number | null;
  unit?: string;
  linkedAssumption?: string;
  source: string;
}

export interface ZoneOutput {
  zone: ZoneId;
  label: string;
  sourceBlocks: BlockType[];
  readiness: ZoneReadiness;
  structuredData: Record<string, unknown>;
  assumptions: string[];
  metrics: MetricDefinition[];
  feedsInto: ZoneId[];
  decisionSignal?: DecisionSignal;
  updatedAt?: string;
}

export interface ZoneDefinition {
  id: ZoneId;
  label: string;
  systems: string[];
  sourceBlocks: BlockType[];
  feedsInto: ZoneId[];
}

export interface ZoneDependency {
  from: ZoneId;
  to: ZoneId;
  validationQuestions: string[];
}
