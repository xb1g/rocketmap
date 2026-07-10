export interface ValueRoleMapping {
  id: string;
  role: string;
  customer: string;
  pain: string;
  desiredOutcome: string;
  valuePromise: string;
}

export interface PositioningTemplate {
  customer: string;
  pain: string;
  outcome: string;
  mechanism: string;
  alternative: string;
}

export interface ProductScopeRowInput {
  id?: string;
  pain: string;
  outcome: string;
  feature: string;
  proofMetric: string;
}

export interface ProductScopeRow {
  id: string;
  pain: string;
  outcome: string;
  feature: string;
  proofMetric: string;
}

export interface ProductScopeAssumption {
  id: string;
  sourceRowId: string;
  text: string;
}

export interface ProductScopeMetric {
  id: string;
  sourceRowId: string;
  name: string;
  target: string;
  linkedAssumptionId: string;
}

export interface ProductScopeSignals {
  assumptions: ProductScopeAssumption[];
  metrics: ProductScopeMetric[];
}

export interface ValueProductData {
  roleMappings: ValueRoleMapping[];
  positioning: PositioningTemplate;
  productScopeRows: ProductScopeRow[];
}

export interface ValueProductZoneOutput {
  zone: 'z3_value_product';
  structuredData: ValueProductData;
  assumptions: string[];
  metrics: ProductScopeMetric[];
  feedsInto: ['z4_revenue_pricing'];
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function sentence(value: string): string {
  const cleaned = clean(value);
  return cleaned.replace(/[.]+$/, '');
}

export function buildPositioningStatement(template: PositioningTemplate): string {
  const customer = sentence(template.customer);
  const pain = sentence(template.pain);
  const outcome = sentence(template.outcome);
  const mechanism = sentence(template.mechanism);
  const alternative = sentence(template.alternative);

  return `For ${customer}, who ${pain}, we ${outcome}, through ${mechanism}, unlike ${alternative}.`;
}

export function normalizeProductScopeRows(rows: ProductScopeRowInput[]): ProductScopeRow[] {
  return rows
    .map((row) => ({
      id: row.id ? clean(row.id) : '',
      pain: clean(row.pain),
      outcome: clean(row.outcome),
      feature: clean(row.feature),
      proofMetric: clean(row.proofMetric),
    }))
    .filter((row) => row.pain && row.outcome && row.feature && row.proofMetric)
    .map((row, index) => ({
      ...row,
      id: row.id || `scope-${index + 1}`,
    }));
}

export function emitProductScopeSignals(rows: ProductScopeRow[]): ProductScopeSignals {
  return rows.reduce<ProductScopeSignals>(
    (signals, row) => {
      const assumptionId = `assumption-${row.id}`;
      signals.assumptions.push({
        id: assumptionId,
        sourceRowId: row.id,
        text: `Customers with pain "${row.pain}" will value "${row.outcome}" enough to use "${row.feature}".`,
      });
      signals.metrics.push({
        id: `metric-${row.id}`,
        sourceRowId: row.id,
        name: `Proof metric for ${row.feature}`,
        target: row.proofMetric,
        linkedAssumptionId: assumptionId,
      });
      return signals;
    },
    { assumptions: [], metrics: [] }
  );
}

export function emitValueProductZoneOutput(data: ValueProductData): ValueProductZoneOutput {
  const normalizedRows = normalizeProductScopeRows(data.productScopeRows);
  const signals = emitProductScopeSignals(normalizedRows);

  return {
    zone: 'z3_value_product',
    structuredData: {
      ...data,
      productScopeRows: normalizedRows,
    },
    assumptions: signals.assumptions.map((assumption) => assumption.text),
    metrics: signals.metrics,
    feedsInto: ['z4_revenue_pricing'],
  };
}
