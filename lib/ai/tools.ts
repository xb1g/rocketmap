import { tool } from 'ai';
import { z } from 'zod';
import { ID } from 'node-appwrite';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
  SEGMENTS_TABLE_ID,
} from '@/lib/appwrite';
import { generateSlug } from '@/lib/utils';
import type { BlockType } from '@/lib/types/canvas';
import { SEGMENT_COLORS } from '@/lib/types/canvas';
import { searchBrave } from './brave-search';

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

export const searchWeb = tool({
  description: 'Search the web for real-world market data, competitor information, industry reports, and validation data. Use this to ground market research in current facts and sources. Always cite URLs in your analysis.',
  inputSchema: z.object({
    query: z.string().describe('Search query optimized for finding market research data (e.g., "TAM coffee shop management software 2026", "specialty coffee market size Bangkok")'),
    maxResults: z.number().optional().default(5).describe('Maximum number of search results to return (default 5)'),
  }),
  execute: async ({ query, maxResults }) => {
    return await searchBrave(query, { maxResults });
  },
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

// ─── Segment Profile Tool ────────────────────────────────────────────────────

export const suggestSegmentProfile = tool({
  description: 'Suggest a segment profile with market definition and buyer structure based on the canvas context and segment data.',
  inputSchema: z.object({
    marketDefinition: z.object({
      geography: z.string().describe('Target geography (e.g. "Thailand", "Bangkok only", "Southeast Asia")'),
      businessType: z.string().describe('Business type (e.g. "Specialty cafe", "chain restaurant", "SaaS startup")'),
      sizeBucket: z.string().describe('Size bucket (e.g. "Revenue $1-5M, 1-3 locations", "10-50 employees")'),
      estimatedCount: z.string().describe('Estimated count in target geography (e.g. "~2,500 in Bangkok", "15,000 nationwide")'),
    }),
    buyerStructure: z.object({
      economicBuyer: z.string().describe('Who signs the check (e.g. "Owner-operator", "Purchasing manager")'),
      user: z.string().describe('Who uses the product day-to-day (e.g. "Barista", "Store manager")'),
      decisionCycle: z.string().describe('How long to close a deal (e.g. "1-2 weeks", "3-6 month procurement")'),
      budgetOwnership: z.string().describe('Where budget comes from (e.g. "Owner personal budget", "Departmental OPEX")'),
    }),
  }),
  execute: async (params) => params,
});

// ─── Block Item Creation Tool (Block Chat Copilot) ──────────────────────────

export const createBlockItems = tool({
  description: 'Create structured items for a business model canvas block. Use this when the user asks to add, suggest, or list specific items (costs, activities, resources, channels, partners, etc.) for ANY block. Each item becomes a card that can be linked to segments and other blocks. ALWAYS prefer this tool over writing markdown lists.',
  inputSchema: z.object({
    items: z.array(z.object({
      name: z.string().describe('Short item name (e.g. "AWS hosting", "Content marketing", "$15/mo subscription")'),
      description: z.string().describe('Brief description or details about this item'),
    })).min(1).describe('Block items to create'),
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

const generateCanvasInputSchema = z.object({
  title: z.string().min(3).describe('A concise title for the canvas (the startup or product name)'),
  segments: z.array(z.object({
    name: z.string().describe('Segment name'),
    description: z.string().describe('Segment description'),
    demographics: z.string().describe('Demographic characteristics (e.g., "25-40 years old, urban professionals")'),
    psychographics: z.string().describe('Psychographic characteristics (e.g., "Value convenience, tech-savvy")'),
    behavioral: z.string().describe('Behavioral patterns (e.g., "Early adopters, frequent online shoppers")'),
    geographic: z.string().describe('Geographic scope (e.g., "Bangkok metropolitan area", "Southeast Asia")'),
    estimatedSize: z.string().describe('Estimated segment size (e.g., "50,000 SMBs in Thailand", "15% of TAM")'),
    priority: z.enum(['high', 'medium', 'low']).describe('Segment priority'),
  })).optional().describe('Customer segments to extract (1-3 segments recommended)'),
  key_partnerships: z.array(z.string()).optional().describe('Array of specific key partners (e.g., ["Cloud infrastructure providers (AWS/GCP)", "Payment gateway partners"])'),
  key_activities: z.array(z.string()).optional().describe('Array of concrete key activities (e.g., ["ML model training", "Customer onboarding automation"])'),
  key_resources: z.array(z.string()).optional().describe('Array of specific key resources (e.g., ["Proprietary dataset of 10M+ transactions", "Engineering team (5 FTE)"])'),
  value_prop: z.array(z.string()).optional().describe('Array of specific value propositions (e.g., ["Reduce churn by 30%", "Save 10 hours/week on manual work"])'),
  customer_relationships: z.array(z.string()).optional().describe('Array of relationship types (e.g., ["Self-service onboarding", "Dedicated account manager for enterprise"])'),
  channels: z.array(z.string()).optional().describe('Array of specific channels (e.g., ["Website", "D2C sales team", "Social media (LinkedIn/Twitter)"])'),
  cost_structure: z.array(z.string()).optional().describe('Array of specific cost items (e.g., ["AWS infrastructure: $500/mo", "Engineering salaries: $15k/mo"])'),
  revenue_streams: z.array(z.string()).optional().describe('Array of specific revenue streams (e.g., ["$15/mo subscription tier", "$99/year annual plan"])'),
});

/** Static version — echoes args back (used as fallback / in tool registry) */
export const generateCanvas = tool({
  description: 'Generate a complete Business Model Canvas with content for all 9 blocks based on the startup idea discussed. Call this once you have enough context from the conversation.',
  inputSchema: generateCanvasInputSchema,
  execute: async (params) => params,
});

const ALL_BLOCK_TYPES: BlockType[] = [
  'key_partnerships', 'key_activities', 'key_resources',
  'value_prop', 'customer_relationships', 'channels',
  'customer_segments', 'cost_structure', 'revenue_streams',
];

/**
 * Factory: creates a generateCanvas tool that persists the canvas + blocks
 * in Appwrite and returns { slug, canvasId, title }.
 */
export function createGenerateCanvasTool(userId: string) {
  return tool({
    description: 'Generate a complete Business Model Canvas with content for all 9 blocks based on the startup idea discussed. Call this once you have enough context from the conversation. Extract customer segments and create multiple atomic blocks per type.',
    inputSchema: generateCanvasInputSchema,
    execute: async (params) => {
      const { title, segments = [], ...blockArrays } = params;
      const now = new Date().toISOString();

      try {
        // 1. Create canvas
        const canvas = await serverTablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: CANVASES_TABLE_ID,
          rowId: ID.unique(),
          data: {
            title: title.trim(),
            slug: await generateSlug(title, userId),
            description: '',
            createdAt: now,
            updatedAt: now,
            isPublic: false,
            users: userId, // Appwrite relationship field
          }
        });

        // 2. Create segments (MOST IMPORTANT)
        let segmentSummary = '';
        if (segments.length > 0) {
          await Promise.all(
            segments.map((seg, idx) =>
              serverTablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: SEGMENTS_TABLE_ID,
                rowId: ID.unique(),
                data: {
                  canvas: canvas.$id,  // Appwrite relationship
                  name: seg.name,
                  description: seg.description || '',
                  demographics: seg.demographics || '',
                  psychographics: seg.psychographics || '',
                  behavioral: seg.behavioral || '',
                  geographic: seg.geographic || '',
                  estimatedSize: seg.estimatedSize || '',
                  priorityScore: seg.priority === 'high' ? 80 : seg.priority === 'low' ? 30 : 50,
                  earlyAdopterFlag: false,
                  colorHex: SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
                }
              })
            )
          );

          // Create summary for customer_segments block
          segmentSummary = segments.map(seg =>
            `${seg.name} - ${seg.description} (${seg.estimatedSize})`
          ).join('\n');
        }

        // 3. Create blocks (multiple per type from arrays)
        const blockTypeMap: Record<string, BlockType> = {
          key_partnerships: 'key_partnerships',
          key_activities: 'key_activities',
          key_resources: 'key_resources',
          value_prop: 'value_prop',
          customer_relationships: 'customer_relationships',
          channels: 'channels',
          cost_structure: 'cost_structure',
          revenue_streams: 'revenue_streams'
        };

        const blockCreationPromises = [];
        for (const [paramKey, blockType] of Object.entries(blockTypeMap)) {
          const contentArray = blockArrays[paramKey as keyof typeof blockArrays];
          if (!contentArray || contentArray.length === 0) continue;

          for (const content of contentArray) {
            blockCreationPromises.push(
              serverTablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: BLOCKS_TABLE_ID,
                rowId: ID.unique(),
                data: {
                  canvas: canvas.$id,  // Appwrite relationship
                  blockType: blockType,
                  contentJson: JSON.stringify({ bmc: content, lean: content }),
                  aiAnalysisJson: '',
                  deepDiveJson: '',
                  confidenceScore: 0,
                  riskScore: 0
                }
              })
            );
          }
        }

        // Create customer_segments block if segments were provided
        if (segmentSummary) {
          blockCreationPromises.push(
            serverTablesDB.createRow({
              databaseId: DATABASE_ID,
              tableId: BLOCKS_TABLE_ID,
              rowId: ID.unique(),
              data: {
                canvas: canvas.$id,
                blockType: 'customer_segments',
                contentJson: JSON.stringify({ bmc: segmentSummary, lean: segmentSummary }),
                aiAnalysisJson: '',
                deepDiveJson: '',
                confidenceScore: 0,
                riskScore: 0
              }
            })
          );
        }

        if (blockCreationPromises.length > 0) {
          await Promise.all(blockCreationPromises);
        }

        // 4. Return canvas info (use $id for Appwrite)
        return {
          slug: canvas.slug,
          canvasId: canvas.$id,
          title: canvas.title
        };
      } catch (error) {
        // Appwrite cascade deletes handle cleanup automatically
        console.error('Canvas creation failed:', error);
        throw error;
      }
    },
  });
}

// ─── Surgical Card Tools (Atomic CRUD) ───────────────────────────────────────

const blockTypeEnum = z.enum([
  'key_partnerships', 'key_activities', 'key_resources',
  'value_prop', 'customer_relationships', 'channels',
  'customer_segments', 'cost_structure', 'revenue_streams',
]);

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
  searchWeb,
  proposeBlockEdit,
  createBlockItems,
  createSegments,
  generateCanvas,
  estimateMarketSize,
  generateSegments,
  generatePersonas,
  validateMarketSize,
  analyzeCompetitors,
  scoreSegment,
  compareSegments,
  suggestSegmentProfile,
};

export function getToolsForAgent(
  toolNames: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Record<string, ReturnType<typeof tool<any, any>>>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, ReturnType<typeof tool<any, any>>> = {};
  for (const name of toolNames) {
    if (overrides?.[name]) {
      result[name] = overrides[name];
    } else if (allTools[name]) {
      result[name] = allTools[name];
    }
  }
  return result;
}
