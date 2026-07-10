import type { BlockType } from '@/lib/types/canvas';
import type { ZoneOutput } from '@/lib/types/zones';

export const JTBD_PAIN_TYPES = [
  'functional',
  'emotional',
  'social',
  'economic',
  'status',
] as const;

export type JTBDPainType = (typeof JTBD_PAIN_TYPES)[number];

export const CUSTOMER_ROLE_TYPES = [
  'user',
  'buyer',
  'decision_maker',
  'influencer',
  'beneficiary',
  'economic_customer',
] as const;

export type CustomerRoleType = (typeof CUSTOMER_ROLE_TYPES)[number];

export interface JTBDPain {
  id: string;
  type: JTBDPainType;
  description: string;
  intensity?: number;
  evidence?: string;
}

export interface JTBDRoleSplit {
  segmentId?: string;
  user: string;
  buyer: string;
  decision_maker: string;
  influencer: string;
  beneficiary: string;
  economic_customer: string;
}

export interface JTBDStatement {
  id: string;
  segmentId?: string;
  role: CustomerRoleType;
  situation: string;
  job: string;
  outcome: string;
  statement: string;
  pains: JTBDPain[];
  priority: 'low' | 'medium' | 'high';
}

export interface JTBDData {
  statements: JTBDStatement[];
  roleSplits: JTBDRoleSplit[];
  notes?: string;
  lastUpdated?: string;
}

const PAIN_TYPE_SET = new Set<string>(JTBD_PAIN_TYPES);
const ROLE_TYPE_SET = new Set<string>(CUSTOMER_ROLE_TYPES);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown): string | undefined {
  const normalized = text(value);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRole(value: unknown): CustomerRoleType {
  const normalized = text(value).toLowerCase().replace(/[-\s]+/g, '_');
  return ROLE_TYPE_SET.has(normalized) ? (normalized as CustomerRoleType) : 'user';
}

function normalizePainType(value: unknown): JTBDPainType | null {
  const normalized = text(value).toLowerCase().replace(/[-\s]+/g, '_');
  return PAIN_TYPE_SET.has(normalized) ? (normalized as JTBDPainType) : null;
}

function normalizePriority(value: unknown): JTBDStatement['priority'] {
  const normalized = text(value).toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return 'medium';
}

function stripTerminalPunctuation(value: string): string {
  return value.replace(/[.!?]+$/u, '').trim();
}

export function buildJTBDStatement(parts: {
  situation: string;
  job: string;
  outcome: string;
}): string {
  const situation = stripTerminalPunctuation(parts.situation);
  const job = stripTerminalPunctuation(parts.job);
  const outcome = stripTerminalPunctuation(parts.outcome);
  return `When ${situation}, I want ${job}, so I can ${outcome}.`;
}

function normalizePain(raw: unknown, fallbackIndex: number): JTBDPain | null {
  const source = record(raw);
  const type = normalizePainType(source.type);
  const description = text(source.description);
  if (!type || description.length === 0) return null;

  const intensity = Number(source.intensity);
  return {
    id: text(source.id) || `pain-${fallbackIndex + 1}`,
    type,
    description,
    intensity: Number.isFinite(intensity) ? Math.min(5, Math.max(1, intensity)) : undefined,
    evidence: optionalText(source.evidence),
  };
}

function normalizePains(raw: unknown): JTBDPain[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((pain, index) => normalizePain(pain, index))
    .filter((pain): pain is JTBDPain => pain !== null);
}

function normalizeStatement(raw: unknown, fallbackIndex: number): JTBDStatement | null {
  const source = record(raw);
  const situation = text(source.situation);
  const job = text(source.job);
  const outcome = text(source.outcome);
  if (!situation && !job && !outcome) return null;

  return {
    id: text(source.id) || `jtbd-${fallbackIndex + 1}`,
    segmentId: optionalText(source.segmentId),
    role: normalizeRole(source.role),
    situation,
    job,
    outcome,
    statement: buildJTBDStatement({ situation, job, outcome }),
    pains: normalizePains(source.pains),
    priority: normalizePriority(source.priority),
  };
}

function emptyRoleSplit(segmentId?: string): JTBDRoleSplit {
  return {
    segmentId,
    user: '',
    buyer: '',
    decision_maker: '',
    influencer: '',
    beneficiary: '',
    economic_customer: '',
  };
}

function normalizeRoleSplit(raw: unknown): JTBDRoleSplit {
  const source = record(raw);
  return {
    ...emptyRoleSplit(optionalText(source.segmentId)),
    user: text(source.user),
    buyer: text(source.buyer),
    decision_maker: text(source.decision_maker ?? source.decisionMaker),
    influencer: text(source.influencer),
    beneficiary: text(source.beneficiary),
    economic_customer: text(source.economic_customer ?? source.economicCustomer),
  };
}

export function normalizeJTBDData(raw: unknown): JTBDData {
  const source = record(raw);
  const statements = Array.isArray(source.statements)
    ? source.statements
        .map((statement, index) => normalizeStatement(statement, index))
        .filter((statement): statement is JTBDStatement => statement !== null)
    : [];
  const roleSplits = Array.isArray(source.roleSplits)
    ? source.roleSplits.map(normalizeRoleSplit)
    : [];

  return {
    statements,
    roleSplits,
    notes: optionalText(source.notes),
    lastUpdated: optionalText(source.lastUpdated),
  };
}

export function createEmptyJTBDStatement(segmentId?: string): JTBDStatement {
  return {
    id: `jtbd-${Date.now()}`,
    segmentId,
    role: 'user',
    situation: '',
    job: '',
    outcome: '',
    statement: buildJTBDStatement({ situation: '', job: '', outcome: '' }),
    pains: [],
    priority: 'medium',
  };
}

export function createEmptyJTBDRoleSplit(segmentId?: string): JTBDRoleSplit {
  return emptyRoleSplit(segmentId);
}

export function buildJTBDZoneOutput(
  data: JTBDData,
  sourceBlocks: BlockType[] = ['customer_segments', 'value_prop'],
): ZoneOutput {
  const statements = normalizeJTBDData(data).statements;
  const assumptions = statements.flatMap((statement) =>
    statement.pains.map(
      (pain) => `${statement.role} pain is ${pain.type}: ${pain.description}`,
    ),
  );

  return {
    zone: 'pain_jtbd',
    label: 'Z2 Pain + JTBD',
    sourceBlocks,
    readiness: statements.length > 0 ? 'ready' : 'missing',
    structuredData: {
      statementCount: statements.length,
      roleCount: new Set(statements.map((statement) => statement.role)).size,
      painTypes: [...new Set(statements.flatMap((statement) => statement.pains.map((pain) => pain.type)))],
      statements,
    },
    assumptions,
    metrics: [
      {
        id: 'jtbd-statement-count',
        name: 'Structured JTBD statements',
        targetThreshold: 'At least one complete statement for the selected beachhead role',
        currentValue: statements.length,
        source: 'JTBD Module',
      },
    ],
    feedsInto: ['value_product'],
    updatedAt: data.lastUpdated,
  };
}
