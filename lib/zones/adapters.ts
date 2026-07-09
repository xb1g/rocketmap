import type {
  BlockData,
  BlockType,
  EconomicsAlert,
  MarketResearchData,
  SegmentEconomics,
  SegmentScorecard,
  UnitEconomicsData,
} from '@/lib/types/canvas';
import type { MetricDefinition, ZoneOutput, ZoneReadiness } from '@/lib/types/zones';
import { ZONE_DEFINITIONS } from '@/lib/zones/chain';

function blockMap(blocks: BlockData[]): Map<BlockType, BlockData> {
  return new Map(blocks.map((block) => [block.blockType, block]));
}

function textFor(block: BlockData | undefined): string {
  if (!block) return '';
  return [block.content.bmc, block.content.lean, ...(block.content.items ?? []).map((item) => item.name)]
    .filter(Boolean)
    .join(' | ')
    .trim();
}

function readinessFor(parts: unknown[]): ZoneReadiness {
  const filled = parts.filter((part) => {
    if (!part) return false;
    if (typeof part === 'string') return part.trim().length > 0;
    if (Array.isArray(part)) return part.length > 0;
    return true;
  }).length;
  if (filled === 0) return 'missing';
  return filled >= Math.max(1, Math.ceil(parts.length / 2)) ? 'ready' : 'partial';
}

function currency(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function newerUnitEconomics(
  first: UnitEconomicsData | null | undefined,
  second: UnitEconomicsData | null | undefined,
): UnitEconomicsData | null {
  if (!first) return second ?? null;
  if (!second) return first;

  const firstTime = Date.parse(first.lastUpdated ?? '');
  const secondTime = Date.parse(second.lastUpdated ?? '');
  if (Number.isNaN(firstTime)) return second;
  if (Number.isNaN(secondTime)) return first;
  return secondTime > firstTime ? second : first;
}

function marketMetrics(data: MarketResearchData | null): MetricDefinition[] {
  const estimates = data?.tamSamSom;
  const scorecards = asArray<SegmentScorecard>(data?.scorecards);
  const metrics: MetricDefinition[] = [];

  if (estimates?.tam) {
    metrics.push({
      id: 'tam',
      name: 'TAM',
      targetThreshold: 'Large enough to support the venture-scale ambition stated in Revenue Streams',
      currentValue: currency(estimates.tam.value),
      source: 'Market Research TAM/SAM/SOM',
    });
  }
  if (estimates?.sam) {
    metrics.push({
      id: 'sam',
      name: 'SAM',
      targetThreshold: 'Serviceable market supports the selected beachhead and channel strategy',
      currentValue: currency(estimates.sam.value),
      source: 'Market Research TAM/SAM/SOM',
    });
  }
  if (estimates?.som) {
    metrics.push({
      id: 'som',
      name: 'SOM',
      targetThreshold: 'Obtainable market supports near-term revenue projections',
      currentValue: currency(estimates.som.value),
      source: 'Market Research TAM/SAM/SOM',
    });
  }

  for (const scorecard of scorecards) {
    metrics.push({
      id: `segment-score-${scorecard.segmentId}`,
      name: `Beachhead score: ${scorecard.segmentId}`,
      targetThreshold: '4.0+ indicates a strong beachhead candidate',
      currentValue: scorecard.overallScore,
      source: 'Segment Evaluation',
    });
  }

  return metrics;
}

function marketAssumptions(data: MarketResearchData | null): string[] {
  const scorecards = asArray<SegmentScorecard>(data?.scorecards);
  const risks = scorecards.flatMap((scorecard: SegmentScorecard) => scorecard.keyRisks ?? []);
  const experiments = scorecards.flatMap((scorecard: SegmentScorecard) => scorecard.requiredExperiments ?? []);
  return [...risks, ...experiments].filter(Boolean).slice(0, 8);
}

function unitEconomicsMetrics(segments: SegmentEconomics[]): MetricDefinition[] {
  return segments.flatMap((segment) => [
    {
      id: `ltv-cac-${segment.segmentId}`,
      name: `LTV:CAC ${segment.segmentName}`,
      targetThreshold: '3.0+ for a durable acquisition loop',
      currentValue: segment.ltvCacRatio,
      source: 'Unit Economics',
    },
    {
      id: `payback-${segment.segmentId}`,
      name: `CAC payback ${segment.segmentName}`,
      targetThreshold: 'Under 12 months for most early SaaS/B2C models',
      currentValue: segment.paybackMonths,
      unit: 'months',
      source: 'Unit Economics',
    },
  ]);
}

export function buildZoneOutputs(blocks: BlockData[]): ZoneOutput[] {
  const byType = blockMap(blocks);
  const customerSegments = byType.get('customer_segments');
  const revenueStreams = byType.get('revenue_streams');
  const costStructure = byType.get('cost_structure');
  const marketData = customerSegments?.deepDiveData ?? null;
  const unitEconomics = newerUnitEconomics(
    revenueStreams?.deepDiveData?.unitEconomics,
    costStructure?.deepDiveData?.unitEconomics,
  );

  return ZONE_DEFINITIONS.map((definition) => {
    const sourceTexts = definition.sourceBlocks.map((type) => textFor(byType.get(type)));
    const metrics: MetricDefinition[] = [];
    const assumptions: string[] = [];
    const structuredData: Record<string, unknown> = {
      blockContent: Object.fromEntries(definition.sourceBlocks.map((type) => [type, textFor(byType.get(type))])),
    };

    if (definition.id === 'customer_market') {
      const segments = asArray(marketData?.segmentation?.segments);
      const personas = asArray(marketData?.personas?.personas);
      const competitors = asArray(marketData?.competitiveLandscape?.competitors);
      const validations = asArray(marketData?.marketValidation?.validations);
      const scorecards = asArray(marketData?.scorecards);

      structuredData.marketResearch = {
        tamSamSom: marketData?.tamSamSom ?? null,
        segmentCount: segments.length,
        personaCount: personas.length,
        competitorCount: competitors.length,
        validationCount: validations.length,
        scorecardCount: scorecards.length,
      };
      metrics.push(...marketMetrics(marketData));
      assumptions.push(...marketAssumptions(marketData));
    }

    if (definition.id === 'unit_economics' && unitEconomics) {
      const segments = asArray<SegmentEconomics>(unitEconomics.segments);
      const alerts = asArray<EconomicsAlert>(unitEconomics.alerts);
      structuredData.unitEconomics = {
        segmentCount: segments.length,
        blendedArpu: unitEconomics.globalMetrics?.blendedArpu,
        blendedCac: unitEconomics.globalMetrics?.blendedCac,
        blendedLtvCacRatio: unitEconomics.globalMetrics?.blendedLtvCacRatio,
        alertCount: alerts.length,
      };
      metrics.push(...unitEconomicsMetrics(segments));
      assumptions.push(...alerts.map((alert) => alert.message));
    }

    const readinessInputs = [
      ...sourceTexts,
      definition.id === 'customer_market' ? marketData?.tamSamSom : null,
      definition.id === 'customer_market' ? asArray(marketData?.segmentation?.segments) : null,
      definition.id === 'unit_economics' ? asArray(unitEconomics?.segments) : null,
    ];

    return {
      zone: definition.id,
      label: definition.label,
      sourceBlocks: definition.sourceBlocks,
      readiness: readinessFor(readinessInputs),
      structuredData,
      assumptions,
      metrics,
      feedsInto: definition.feedsInto,
      updatedAt: new Date().toISOString(),
    };
  });
}
