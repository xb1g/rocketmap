/** DB enum values for blockType */
export type BlockType =
  | 'key_partnerships'
  | 'key_activities'
  | 'key_resources'
  | 'value_prop'
  | 'customer_relationships'
  | 'channels'
  | 'customer_segments'
  | 'cost_structure'
  | 'revenue_streams';

export type CanvasMode = 'bmc' | 'lean';
export type BlockState = 'calm' | 'healthy' | 'warning' | 'critical' | 'ai';
export type CanvasTab = 'canvas' | 'analysis' | 'notes';

/** Content stored as JSON in contentJson column */
export interface BlockContent {
  bmc: string;
  lean: string;
}

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

export interface BlockData {
  blockType: BlockType;
  content: BlockContent;
  state: BlockState;
  aiAnalysis: AIAnalysis | null;
  confidenceScore: number;
  riskScore: number;
  deepDiveData: MarketResearchData | null;
  lastUsage?: AIUsage | null;
}

export interface CanvasData {
  $id: string;
  id: number;
  title: string;
  slug: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
}

export interface BlockDefinition {
  type: BlockType;
  bmcLabel: string;
  leanLabel: string | null;
  gridCol: string;
  gridRow: string;
}

// ─── Deep Dive Types (Market Research) ───────────────────────────────────────

export type DeepDiveModule =
  | 'tam_sam_som'
  | 'segmentation'
  | 'personas'
  | 'market_validation'
  | 'competitive_landscape';

export interface MarketSizeEstimate {
  value: number;
  methodology: string;
  sources: string[];
  confidence: 'low' | 'medium' | 'high';
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
  priority: 'high' | 'medium' | 'low';
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
  status: 'confirmed' | 'questioned' | 'contradicted';
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
  threatLevel: 'low' | 'medium' | 'high';
}

export interface CompetitiveLandscapeData {
  competitors: Competitor[];
}

export interface MarketResearchData {
  tamSamSom: TamSamSomData | null;
  segmentation: SegmentationData | null;
  personas: PersonasData | null;
  marketValidation: MarketValidationData | null;
  competitiveLandscape: CompetitiveLandscapeData | null;
}
