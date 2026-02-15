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

// ─── Segment Evaluation Tools ────────────────────────────────────────────────

const decisionCriterionSchema = z.object({
  id: z.string().describe('Unique criterion identifier'),
  category: z.enum(['demand', 'market', 'execution']).describe('Category: demand (~30%), market (~40%), execution (~30%)'),
  name: z.string().describe('Criterion name'),
  weight: z.number().min(0).max(1).describe('Weight within category (0-1)'),
  score: z.number().min(1).max(5).describe('Score (1-5)'),
  reasoning: z.string().describe('Justification for this score'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence in this score'),
});

export const scoreSegment = tool({
  description: 'Score a customer segment across 10 decision criteria in 3 categories (Demand, Market, Execution) to evaluate whether to pursue it.',
  inputSchema: z.object({
    criteria: z.array(decisionCriterionSchema).length(10).describe('Exactly 10 decision criteria scores'),
    overallScore: z.number().min(1).max(5).describe('Weighted overall score (1-5)'),
    recommendation: z.enum(['pursue', 'test', 'defer']).describe('Overall recommendation'),
    reasoning: z.string().describe('Overall rationale for the recommendation'),
    keyRisks: z.array(z.string()).min(3).max(5).describe('3-5 key risks for this segment'),
    requiredExperiments: z.array(z.string()).min(2).max(4).describe('2-4 experiments to validate assumptions'),
  }),
  execute: async (params) => params,
});

export const compareSegments = tool({
  description: 'Compare two customer segments to determine which to prioritize as beachhead.',
  inputSchema: z.object({
    segmentAName: z.string().describe('Name of segment A'),
    segmentBName: z.string().describe('Name of segment B'),
    scoreDifference: z.number().describe('Score delta (A - B)'),
    betterSegment: z.enum(['A', 'B', 'tie']).describe('Which segment scores higher'),
    keyDifferences: z.array(z.object({
      criterion: z.string().describe('Criterion name'),
      scoreA: z.number().min(1).max(5),
      scoreB: z.number().min(1).max(5),
      delta: z.number(),
      explanation: z.string(),
    })).describe('Key differences between the segments'),
    recommendation: z.string().describe('Which segment to prioritize and why'),
  }),
  execute: async (params) => params,
});

// ─── Segment Creation Tool (Block Chat Copilot) ─────────────────────────────

export const createSegments = tool({
  description: 'Create customer segments as structured records. Use this when the user asks to define, suggest, or create customer segments. Each segment becomes a real record that can be linked to blocks and evaluated.',
  inputSchema: z.object({
    segments: z.array(z.object({
      name: z.string().describe('Segment name'),
      description: z.string().describe('Segment description'),
      demographics: z.string().describe('Demographic characteristics'),
      psychographics: z.string().describe('Psychographic characteristics'),
      behavioral: z.string().describe('Behavioral patterns'),
      geographic: z.string().describe('Geographic scope'),
      estimatedSize: z.string().describe('Estimated segment size (e.g. "50,000 SMBs in US")'),
      priority: z.enum(['high', 'medium', 'low']).describe('Segment priority'),
    })).min(1).describe('Customer segments to create'),
  }),
  execute: async (params) => params,
});

// ─── Canvas Generation Tool ──────────────────────────────────────────────────

export const generateCanvas = tool({
  description: 'Generate a complete Business Model Canvas with content for all 9 blocks based on the startup idea discussed. Call this once you have enough context from the conversation.',
  inputSchema: z.object({
    title: z.string().min(3).describe('A concise title for the canvas (the startup or product name)'),
    key_partnerships: z.string().min(10).describe('Key Partners block content'),
    key_activities: z.string().min(10).describe('Key Activities block content'),
    key_resources: z.string().min(10).describe('Key Resources block content'),
    value_prop: z.string().min(10).describe('Value Propositions block content'),
    customer_relationships: z.string().min(10).describe('Customer Relationships block content'),
    channels: z.string().min(10).describe('Channels block content'),
    customer_segments: z.string().min(10).describe('Customer Segments block content'),
    cost_structure: z.string().min(10).describe('Cost Structure block content'),
    revenue_streams: z.string().min(10).describe('Revenue Streams block content'),
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
  createSegments,
  generateCanvas,
  estimateMarketSize,
  generateSegments,
  generatePersonas,
  validateMarketSize,
  analyzeCompetitors,
  scoreSegment,
  compareSegments,
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
