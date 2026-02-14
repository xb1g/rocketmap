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

export interface BlockData {
  blockType: BlockType;
  content: BlockContent;
  state: BlockState;
  aiAnalysis: AIAnalysis | null;
  confidenceScore: number;
  riskScore: number;
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
