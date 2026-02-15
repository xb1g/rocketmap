import type { AgentType, AgentConfig } from '@/lib/types/ai';
import type { BlockData } from '@/lib/types/canvas';
import { buildSystemPrompt } from './prompts';

export function getAgentConfig(agentType: AgentType, blocks: BlockData[]): AgentConfig {
  const systemPrompt = buildSystemPrompt(agentType, blocks);

  const toolNames: string[] = ['analyzeBlock', 'proposeBlockEdit', 'createSegments'];

  if (agentType === 'general') {
    toolNames.push('checkConsistency');
  }

  return { systemPrompt, toolNames };
}
