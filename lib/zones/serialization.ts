import type { ZoneOutput } from '@/lib/types/zones';
import { ZONE_DEPENDENCIES } from '@/lib/zones/chain';

function valueLabel(value: string | number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === '') return 'unknown';
  return unit ? `${value} ${unit}` : String(value);
}

export function serializeZoneOutputs(outputs: ZoneOutput[]): string {
  const lines: string[] = [];

  for (const output of outputs) {
    lines.push(`[${output.label}] readiness=${output.readiness}; sourceBlocks=${output.sourceBlocks.join(', ')}`);
    if (output.feedsInto.length > 0) {
      lines.push(`  feedsInto: ${output.feedsInto.join(', ')}`);
    }
    for (const metric of output.metrics.slice(0, 6)) {
      lines.push(
        `  metric: ${metric.name} = ${valueLabel(metric.currentValue, metric.unit)}; threshold: ${metric.targetThreshold}; source: ${metric.source}`,
      );
    }
    for (const assumption of output.assumptions.slice(0, 5)) {
      lines.push(`  assumption/test: ${assumption}`);
    }
  }

  lines.push('\nChain edges to validate:');
  for (const dependency of ZONE_DEPENDENCIES) {
    lines.push(`- ${dependency.from} -> ${dependency.to}: ${dependency.validationQuestions.join(' ')}`);
  }

  return lines.join('\n');
}
