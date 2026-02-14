import { tool } from 'ai';
import { z } from 'zod';

export const analyzeBlock = tool({
  description: 'Analyze a business model canvas block and return structured insights including an improved draft, hidden assumptions, risks, and critical questions.',
  inputSchema: z.object({
    draft: z.string().describe('An improved, more specific version of the block content'),
    assumptions: z.array(z.string()).describe('Hidden assumptions the user is making'),
    risks: z.array(z.string()).describe('Potential failure points or weaknesses'),
    questions: z.array(z.string()).describe('Critical questions the user should answer to validate this block'),
  }),
  execute: async (params) => params,
});

export const checkConsistency = tool({
  description: 'Check consistency across multiple business model canvas blocks and identify contradictions, missing links, and logical gaps.',
  inputSchema: z.object({
    contradictions: z.array(z.object({
      blocks: z.array(z.string()).describe('The two or more blocks involved'),
      issue: z.string().describe('Description of the contradiction'),
      severity: z.enum(['minor', 'major', 'critical']),
      suggestion: z.string().describe('How to resolve this contradiction'),
    })).describe('Cross-block contradictions found'),
    missingLinks: z.array(z.object({
      from: z.string().describe('Source block'),
      to: z.string().describe('Target block'),
      issue: z.string().describe('What connection is missing'),
    })).describe('Missing connections between blocks'),
    overallScore: z.number().min(0).max(100).describe('Overall coherence score 0-100'),
  }),
  execute: async (params) => params,
});

export function getToolsForAgent(toolNames: string[]) {
  const allTools: Record<string, typeof analyzeBlock | typeof checkConsistency> = {
    analyzeBlock,
    checkConsistency,
  };

  const result: Record<string, typeof analyzeBlock | typeof checkConsistency> = {};
  for (const name of toolNames) {
    if (allTools[name]) {
      result[name] = allTools[name];
    }
  }
  return result;
}
