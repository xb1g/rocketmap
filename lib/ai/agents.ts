import type { AgentType, AgentConfig } from '@/lib/types/ai';
import type { BlockData } from '@/lib/types/canvas';
import { buildSystemPrompt, type AssumptionContext } from './prompts';

export function getAgentConfig(agentType: AgentType, blocks: BlockData[], assumptions?: AssumptionContext[]): AgentConfig {
  const systemPrompt = buildSystemPrompt(agentType, blocks, assumptions);

  const toolNames: string[] = ['analyzeBlock', 'identifyAssumptions', 'proposeBlockEdit', 'createBlockItems', 'createSegments'];

  if (agentType === 'general') {
    toolNames.push('checkConsistency', 'searchWeb');
  }

  // Add searchWeb to customer_segments for market research
  if (agentType === 'customer_segments') {
    toolNames.push('searchWeb');
  }

  return { systemPrompt, toolNames };
}
