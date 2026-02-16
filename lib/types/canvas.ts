/** DB enum values for blockType */
export type BlockType =
  | "key_partnerships"
  | "key_activities"
  | "key_resources"
  | "value_prop"
  | "customer_relationships"
  | "channels"
  | "customer_segments"
  | "cost_structure"
  | "revenue_streams";

export type CanvasMode = "bmc" | "lean";
export type BlockState = "calm" | "healthy" | "warning" | "critical" | "ai";
export type CanvasTab = "canvas" | "analysis" | "assumptions" | "notes" | "debug";

export interface BlockContent {
  bmc: string;
  lean: string;
  items: BlockItem[];
}

export interface BlockItem {
  id: string; // Internal stable ID
  name: string;
  description?: string;
  linkedSegmentIds: string[]; // List of segment IDs this item is relevant to
  linkedItemIds: string[]; // format: "blockType:itemId" - cross-block item links
  createdAt: string;
}


export interface BlockCard {
  $id: string;
  name: string;
  description?: string;
  order: number;
}

export const SEGMENT_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
] as const;

export interface AIAnalysis {
  draft: string;
  assumptions: string[];
  risks: string[];
  questions: string[];
  generatedAt: string;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ─── Segment Types ────────────────────────────────────────────────────────────

export interface Segment {
  $id: string;
  id?: number; // Legacy field - kept for backward compatibility
  canvasId?: number | string; // Legacy field - can be integer or string $id
  name: string;
  description: string;
  earlyAdopterFlag: boolean;
  priorityScore: number;
  demographics: string;
  psychographics: string;
  behavioral: string;
  geographic: string;
  estimatedSize: string; // varchar(100) in DB, e.g. "10,000 startups worldwide" or "15% of TAM"
  colorHex?: string;
}

export interface BlockSegmentLink {
  $id: string;
  blockId: number | string; // Can be integer or string $id
  segmentId: number | string; // Can be integer or string $id
  relationshipType: string; // e.g. "primary_segment", "secondary_segment", "unrelated"
}

export interface BlockData {
  $id?: string;
  blockType: BlockType;
  content: BlockContent;
  state: BlockState;
  cards?: BlockCard[];
  aiAnalysis: AIAnalysis | null;
  confidenceScore: number;
  riskScore: number;
  deepDiveData: MarketResearchData | null;
  lastUsage?: AIUsage | null;
  linkedSegments?: Segment[];
}

export interface CanvasData {
  $id: string;
  id?: number; // Legacy field - kept for backward compatibility during migration. New code should use $id.
  title: string;
  slug: string;
  description: string;
  isPublic: boolean;
  user?: string | { $id: string }; // Appwrite relationship field in current schema
  users?: string | { $id: string }; // Legacy field for backward compatibility
  userId?: string; // Alternate schema variant
  viabilityScore?: number | null;
  viabilityData?: ViabilityData | null;
  viabilityCalculatedAt?: string | null;
}

export interface BlockDefinition {
  type: BlockType;
  bmcLabel: string;
  leanLabel: string | null;
  gridCol: string;
  gridRow: string;
  tooltip: {
    bmc: string;
    lean: string;
    ai: string;
  };
}

// ─── Deep Dive Types (Market Research) ───────────────────────────────────────

export type DeepDiveModule =
  | "tam_sam_som"
  | "segmentation"
  | "personas"
  | "market_validation"
  | "competitive_landscape"
  | "segment_scoring"
  | "segment_comparison"
  | "segment_profile";

export interface MarketSizeEstimate {
  value: number;
  methodology: string;
  sources: string[];
  confidence: "low" | "medium" | "high";
}

export interface TamSamSomData {
  industry: string;
  geography: string;
  targetCustomerType: string;
  tam: MarketSizeEstimate | null;
  sam: MarketSizeEstimate | null;
  som: MarketSizeEstimate | null;
  reasoning: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  demographics: string;
  psychographics: string;
  behavioral: string;
  geographic: string;
  estimatedSize: string;
  priority: "high" | "medium" | "low";
}

export interface SegmentationData {
  segments: CustomerSegment[];
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  occupation: string;
  segmentId: string;
  goals: string[];
  frustrations: string[];
  behaviors: string[];
  quote: string;
}

export interface PersonasData {
  personas: Persona[];
}

export interface ValidationItem {
  claim: string;
  status: "confirmed" | "questioned" | "contradicted";
  evidence: string;
  source: string;
}

export interface MarketValidationData {
  validations: ValidationItem[];
  overallAssessment: string;
}

export interface Competitor {
  id: string;
  name: string;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  marketShareEstimate: string;
  threatLevel: "low" | "medium" | "high";
}

export interface CompetitiveLandscapeData {
  competitors: Competitor[];
}

// ─── Segment Profile (Pre-Score Data) ─────────────────────────────────────

export interface SegmentProfile {
  marketDefinition: {
    geography: string;
    businessType: string;
    sizeBucket: string;
    estimatedCount: string;
  };
  buyerStructure: {
    economicBuyer: string;
    user: string;
    decisionCycle: string;
    budgetOwnership: string;
  };
}

export interface MarketResearchData {
  tamSamSom: TamSamSomData | null;
  segmentation: SegmentationData | null;
  personas: PersonasData | null;
  marketValidation: MarketValidationData | null;
  competitiveLandscape: CompetitiveLandscapeData | null;
  scorecards?: SegmentScorecard[];
  segmentProfiles?: Record<string, SegmentProfile>;
}

// ─── Segment Evaluation Scorecard Types ─────────────────────────────────────

export type BeachheadStatus = "primary" | "secondary" | "later";

export interface DecisionCriterion {
  id: string;
  category: "demand" | "market" | "execution";
  name: string;
  weight: number;       // 0-1 within category
  score: number;        // 1-5
  reasoning: string;
  confidence: "low" | "medium" | "high";
}

export interface SegmentScorecard {
  segmentId: string;
  beachheadStatus: BeachheadStatus;
  arpu: number | null;
  revenuePotential: number | null;
  criteria: DecisionCriterion[];
  overallScore: number;
  aiRecommendation: "pursue" | "test" | "defer";
  aiReasoning: string;
  keyRisks: string[];
  requiredExperiments: string[];
  dataConfidence: number;
  lastUpdated: string;
}

// ─── Assumption Types ─────────────────────────────────────────────────────────

export type AssumptionStatus = 'untested' | 'testing' | 'validated' | 'refuted' | 'inconclusive';
export type AssumptionRiskLevel = 'high' | 'medium' | 'low';
export type ExperimentType = 'survey' | 'interview' | 'mvp' | 'ab_test' | 'research' | 'other';
export type ExperimentStatus = 'planned' | 'running' | 'completed';
export type ExperimentResult = 'supports' | 'contradicts' | 'mixed' | 'inconclusive';

export interface Assumption {
  $id: string;
  canvasId: string;
  statement: string;
  category: 'market' | 'product' | 'ops' | 'legal';
  status: AssumptionStatus;
  riskLevel: AssumptionRiskLevel;
  severityScore: number; // 0-10 (legacy, kept for backward compat)
  confidenceScore: number; // 0-100
  source: 'ai' | 'user';
  blockTypes: BlockType[];
  segmentIds: string[];
  linkedValidationItemIds: string[];
  suggestedExperiment?: string;
  suggestedExperimentDuration?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface Experiment {
  $id: string;
  assumptionId: string;
  type: ExperimentType;
  description: string;
  successCriteria: string;
  status: ExperimentStatus;
  result?: ExperimentResult;
  evidence: string;
  sourceUrl?: string;
  costEstimate?: string;
  durationEstimate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RiskMetrics {
  riskScore: number; // 0-100
  confidenceScore: number; // 0-100
  untestedHighRisk: number;
  untestedMediumRisk: number;
  untestedLowRisk: number;
  topRisks: string[]; // Top 3 risky assumption statements
}

// ─── Block Item Proposals (AI Copilot → Create Items) ────────────────────────

export interface BlockItemProposal {
  name: string;
  description: string;
}

// ─── Segment Proposals (AI Copilot → Create Segments) ────────────────────────

export interface SegmentProposal {
  name: string;
  description: string;
  demographics: string;
  psychographics: string;
  behavioral: string;
  geographic: string;
  estimatedSize: string;
  priority: "high" | "medium" | "low";
}

// ─── Block Edit Proposals (AI Agent Editing) ─────────────────────────────────

export interface BlockEditProposal {
  blockType: BlockType;
  mode: "bmc" | "lean" | "both";
  oldContent: string;
  newContent: string;
  reason: string;
}

// ─── Viability Score Types ────────────────────────────────────────────────

export interface ViabilityBreakdown {
  assumptions: number;      // 0-100
  market: number;           // 0-100
  unmetNeed: number;        // 0-100
}

export interface ValidatedAssumption {
  blockType: BlockType;
  assumption: string;
  status: 'validated' | 'invalidated' | 'untested';
  evidence: string;
}

export interface ViabilityData {
  score: number;            // 0-100 overall
  breakdown: ViabilityBreakdown;
  reasoning: string;        // Opus explanation
  validatedAssumptions: ValidatedAssumption[];
  calculatedAt: string;     // ISO timestamp
}
