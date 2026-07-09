import type { ZoneDefinition, ZoneDependency, ZoneId } from '@/lib/types/zones';

export const ZONE_DEFINITIONS: ZoneDefinition[] = [
  {
    id: 'customer_market',
    label: 'Z1 Customer + Market',
    systems: ['Customer Segment System', 'Market Sizing System', 'Beachhead Strategy'],
    sourceBlocks: ['customer_segments'],
    feedsInto: ['pain_jtbd', 'value_product', 'revenue_pricing'],
  },
  {
    id: 'pain_jtbd',
    label: 'Z2 Pain + JTBD',
    systems: ['Problem / JTBD System'],
    sourceBlocks: ['customer_segments', 'value_prop'],
    feedsInto: ['value_product'],
  },
  {
    id: 'value_product',
    label: 'Z3 Value <-> Product',
    systems: ['Value Proposition System', 'Product Scope System'],
    sourceBlocks: ['value_prop', 'key_activities', 'key_resources'],
    feedsInto: ['revenue_pricing', 'distribution_growth'],
  },
  {
    id: 'revenue_pricing',
    label: 'Z4 Revenue + Pricing',
    systems: ['Revenue Model System', 'Pricing + WTP System'],
    sourceBlocks: ['revenue_streams'],
    feedsInto: ['unit_economics'],
  },
  {
    id: 'unit_economics',
    label: 'Z5 Unit Economics',
    systems: ['Unit Economics System', 'Cost Structure System'],
    sourceBlocks: ['revenue_streams', 'cost_structure'],
    feedsInto: ['distribution_growth', 'scalability_defensibility'],
  },
  {
    id: 'distribution_growth',
    label: 'Z6 Distribution + Growth',
    systems: ['Channel + Distribution System', 'Customer Relationship System'],
    sourceBlocks: ['channels', 'customer_relationships'],
    feedsInto: ['partnership', 'unit_economics'],
  },
  {
    id: 'partnership',
    label: 'Z7 Partnership',
    systems: ['Partnership System'],
    sourceBlocks: ['key_partnerships'],
    feedsInto: ['distribution_growth', 'scalability_defensibility'],
  },
  {
    id: 'scalability_defensibility',
    label: 'Z8 Scalability + Defensibility',
    systems: ['Key Resources System', 'Key Activities System', 'Scalability System', 'Defensibility System'],
    sourceBlocks: ['key_resources', 'key_activities'],
    feedsInto: [],
  },
];

export const ZONE_DEPENDENCIES: ZoneDependency[] = [
  {
    from: 'customer_market',
    to: 'pain_jtbd',
    validationQuestions: [
      'Does the chosen segment have a specific urgent job, not just a demographic label?',
      'Are buyer, user, and decision-maker roles clear enough to validate?',
    ],
  },
  {
    from: 'pain_jtbd',
    to: 'value_product',
    validationQuestions: [
      'Does the value proposition map to a named job, pain, and desired outcome?',
      'Can each planned feature trace back to a painful customer outcome?',
    ],
  },
  {
    from: 'value_product',
    to: 'revenue_pricing',
    validationQuestions: [
      'Is there a payment moment where the promised outcome creates enough value to charge?',
      'Does the pricing model fit the customer role that receives budget authority?',
    ],
  },
  {
    from: 'revenue_pricing',
    to: 'unit_economics',
    validationQuestions: [
      'Does price exceed the variable cost to serve this customer?',
      'Does the revenue model imply churn, renewal, or transaction behavior that economics can model?',
    ],
  },
  {
    from: 'unit_economics',
    to: 'distribution_growth',
    validationQuestions: [
      'Can the selected channels acquire customers below allowable CAC?',
      'Do channel conversion assumptions preserve payback and margin targets?',
    ],
  },
  {
    from: 'distribution_growth',
    to: 'partnership',
    validationQuestions: [
      'Do partnerships fill a specific distribution, credibility, delivery, content, or monetization gap?',
      'Is each partner tied to a pilot metric instead of a vague relationship?',
    ],
  },
  {
    from: 'partnership',
    to: 'scalability_defensibility',
    validationQuestions: [
      'Do partnerships create repeatable leverage or fragile dependency?',
      'Which resources and activities become stronger as more partners/customers use the system?',
    ],
  },
];

export function getZoneDefinition(zone: ZoneId): ZoneDefinition {
  const definition = ZONE_DEFINITIONS.find((item) => item.id === zone);
  if (!definition) throw new Error(`Unknown zone: ${zone}`);
  return definition;
}
