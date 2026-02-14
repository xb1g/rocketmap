import type { BlockType } from './canvas';

export type AgentType = BlockType | 'general';

export interface AgentConfig {
  systemPrompt: string;
  toolNames: string[];
}
