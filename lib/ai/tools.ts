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

// ─── Deep Dive Tools (Market Research) ───────────────────────────────────────

const marketSizeEstimateSchema = z.object({
  value: z.number().describe('Market size in USD'),
  methodology: z.string().describe('How this estimate was derived'),
  sources: z.array(z.string()).describe('Data sources or references'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence level of the estimate'),
});

export const estimateMarketSize = tool({
  description: 'Estimate TAM, SAM, and SOM market sizes for a startup based on industry, geography, and target customer type.',
  inputSchema: z.object({
    tam: marketSizeEstimateSchema.describe('Total Addressable Market'),
    sam: marketSizeEstimateSchema.describe('Serviceable Addressable Market'),
    som: marketSizeEstimateSchema.describe('Serviceable Obtainable Market'),
    reasoning: z.string().describe('Overall reasoning connecting the three estimates'),
  }),
  execute: async (params) => params,
});

export const generateSegments = tool({
  description: 'Generate customer segments based on the business model canvas content.',
  inputSchema: z.object({
    segments: z.array(z.object({
      id: z.string().describe('Unique segment identifier'),
      name: z.string().describe('Segment name'),
      description: z.string().describe('Segment description'),
      demographics: z.string().describe('Demographic characteristics'),
      psychographics: z.string().describe('Psychographic characteristics'),
      behavioral: z.string().describe('Behavioral patterns'),
      geographic: z.string().describe('Geographic scope'),
      estimatedSize: z.string().describe('Estimated segment size'),
      priority: z.enum(['high', 'medium', 'low']).describe('Segment priority'),
    })).describe('Customer segments'),
  }),
  execute: async (params) => params,
});

export const generatePersonas = tool({
  description: 'Generate detailed customer personas linked to existing segments.',
  inputSchema: z.object({
    personas: z.array(z.object({
      id: z.string().describe('Unique persona identifier'),
      name: z.string().describe('Persona name'),
      age: z.number().describe('Persona age'),
      occupation: z.string().describe('Job title or role'),
      segmentId: z.string().describe('ID of the segment this persona belongs to'),
      goals: z.array(z.string()).describe('What this persona wants to achieve'),
      frustrations: z.array(z.string()).describe('Pain points and frustrations'),
      behaviors: z.array(z.string()).describe('Typical behaviors and habits'),
      quote: z.string().describe('A representative quote from this persona'),
    })).describe('Customer personas'),
  }),
  execute: async (params) => params,
});

export const validateMarketSize = tool({
  description: 'Validate TAM/SAM/SOM estimates by cross-referencing with industry data and checking internal consistency.',
  inputSchema: z.object({
    validations: z.array(z.object({
      claim: z.string().describe('The claim being validated'),
      status: z.enum(['confirmed', 'questioned', 'contradicted']).describe('Validation status'),
      evidence: z.string().describe('Evidence supporting the validation'),
      source: z.string().describe('Source of the evidence'),
    })).describe('Validation results'),
    overallAssessment: z.string().describe('Summary assessment of the market size estimates'),
  }),
  execute: async (params) => params,
});

export const analyzeCompetitors = tool({
  description: 'Analyze the competitive landscape for the target market segments.',
  inputSchema: z.object({
    competitors: z.array(z.object({
      id: z.string().describe('Unique competitor identifier'),
      name: z.string().describe('Competitor name'),
      positioning: z.string().describe('Market positioning'),
      strengths: z.array(z.string()).describe('Key strengths'),
      weaknesses: z.array(z.string()).describe('Key weaknesses'),
      marketShareEstimate: z.string().describe('Estimated market share'),
      threatLevel: z.enum(['low', 'medium', 'high']).describe('Threat level to the startup'),
    })).describe('Competitors in the landscape'),
  }),
  execute: async (params) => params,
});

// ─── Block Editing Tool ──────────────────────────────────────────────────────

export const proposeBlockEdit = tool({
  description: 'Propose an edit to one or more business model canvas blocks. Use this when the user asks to change, improve, fix, or update block content, or when you detect issues that should be fixed. Always include the current content as oldContent for diff display.',
  inputSchema: z.object({
    edits: z.array(z.object({
      blockType: z.enum([
        'key_partnerships', 'key_activities', 'key_resources',
        'value_prop', 'customer_relationships', 'channels',
        'customer_segments', 'cost_structure', 'revenue_streams',
      ]).describe('Which block to edit'),
      mode: z.enum(['bmc', 'lean', 'both']).describe('Which canvas mode to edit. Use "both" for shared blocks (channels, customer_segments, cost_structure, revenue_streams)'),
      oldContent: z.string().describe('The current content of the block (for diff display)'),
      newContent: z.string().describe('The proposed new content'),
      reason: z.string().describe('Brief explanation of why this change improves the business model'),
    })).min(1).describe('One or more block edits to propose'),
  }),
  execute: async (params) => params,
});

// ─── Tool Registry ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allTools: Record<string, ReturnType<typeof tool<any, any>>> = {
  analyzeBlock,
  checkConsistency,
  proposeBlockEdit,
  estimateMarketSize,
  generateSegments,
  generatePersonas,
  validateMarketSize,
  analyzeCompetitors,
};

export function getToolsForAgent(toolNames: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, ReturnType<typeof tool<any, any>>> = {};
  for (const name of toolNames) {
    if (allTools[name]) {
      result[name] = allTools[name];
    }
  }
  return result;
}
