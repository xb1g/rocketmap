import type { Assumption, BlockType, RiskMetrics } from '@/lib/types/canvas';

export function calculateBlockRisk(
  blockType: BlockType,
  assumptions: Assumption[]
): number {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));

  let riskScore = 0;
  for (const a of linked) {
    if (a.status === 'untested') {
      riskScore += a.riskLevel === 'high' ? 30 : a.riskLevel === 'medium' ? 15 : 5;
    } else if (a.status === 'refuted') {
      riskScore += 40;
    } else if (a.status === 'inconclusive') {
      riskScore += 10;
    }
  }

  return Math.min(100, riskScore);
}

export function calculateBlockConfidence(
  blockType: BlockType,
  assumptions: Assumption[]
): number {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));
  if (linked.length === 0) return 0;

  return Math.round(
    linked.reduce((sum, a) => sum + a.confidenceScore, 0) / linked.length
  );
}

export function calculateRiskMetrics(
  blockType: BlockType,
  assumptions: Assumption[]
): RiskMetrics {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));

  return {
    riskScore: calculateBlockRisk(blockType, assumptions),
    confidenceScore: calculateBlockConfidence(blockType, assumptions),
    untestedHighRisk: linked.filter(a => a.status === 'untested' && a.riskLevel === 'high').length,
    untestedMediumRisk: linked.filter(a => a.status === 'untested' && a.riskLevel === 'medium').length,
    untestedLowRisk: linked.filter(a => a.status === 'untested' && a.riskLevel === 'low').length,
    topRisks: linked
      .filter(a => a.status === 'untested' && a.riskLevel === 'high')
      .slice(0, 3)
      .map(a => a.statement),
  };
}

export function getRiskBorderClass(riskScore: number, confidenceScore: number): string {
  if (riskScore >= 70) return 'glow-critical';
  if (riskScore >= 40) return 'glow-warning';
  if (confidenceScore >= 70) return 'glow-healthy';
  return '';
}
