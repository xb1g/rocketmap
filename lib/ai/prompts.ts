import type { BlockData, BlockType, DeepDiveModule, MarketResearchData } from '@/lib/types/canvas';
import type { AgentType } from '@/lib/types/ai';
import { BLOCK_DEFINITIONS } from '@/app/components/canvas/constants';

export const BASE_SYSTEM_PROMPT = `You are RocketMap AI, an adversarial business model validator. You do NOT simply generate content — you analyze structural coherence, extract hidden assumptions, simulate risk scenarios, and flag contradictions.

You are working within a Business Model Canvas (BMC) tool. The user is building a startup plan across 9 blocks:
1. Key Partners — Strategic alliances, supplier relationships
2. Key Activities — Core actions to deliver value
3. Key Resources — Assets required (physical, IP, human, financial)
4. Value Propositions — What value you deliver to customers
5. Customer Relationships — How you acquire, retain, grow customers
6. Channels — How you reach and deliver to customers
7. Customer Segments — Who you serve, target markets
8. Cost Structure — Major cost drivers, fixed vs variable
9. Revenue Streams — How you capture value, pricing model

Your role:
- Be specific and actionable, not vague
- Challenge assumptions rather than validating them
- Flag logical gaps between blocks
- Quantify when possible (market sizes, unit economics, timelines)
- Reference specific blocks when noting cross-block issues

When analyzing a block, always produce structured output with:
- draft: An improved version of the block content
- assumptions: Hidden assumptions the user is making
- risks: Potential failure points or weaknesses
- questions: Critical questions the user should answer

## Editing Block Content

IMPORTANT: When the user asks to change, update, improve, fix, rewrite, or modify block content, you MUST use the proposeBlockEdit tool.
Do NOT describe changes in text — ALWAYS use the tool so the user sees an actionable diff they can accept or reject.
Even for small changes, use the tool. The user expects to see a diff card, not a text description.

Use the proposeBlockEdit tool when:
- The user asks to change, improve, fix, or update block content
- You detect contradictions or issues that should be fixed
- After analysis reveals the content should be more specific

When proposing edits:
- Always include the current content as oldContent (copy it exactly from the canvas state above)
- Explain WHY the change improves the business model in the reason field
- For shared blocks (channels, customer_segments, cost_structure, revenue_streams), use mode="both"
- For non-shared blocks, use the appropriate mode ("bmc" or "lean") based on the user's current context
- For multi-block fixes (e.g., resolving contradictions), propose all changes in one tool call
- Keep edits concise but specific — avoid vague language

The user will see individual diff cards for each edit and can accept, edit, or reject each one independently.`;

function summarizeDeepDive(data: MarketResearchData): string {
  const lines: string[] = [];
  if (data.tamSamSom?.tam) {
    const fmt = (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : `$${v}`;
    lines.push(`  [Deep Dive - Market Size]: TAM ${fmt(data.tamSamSom.tam.value)}, SAM ${fmt(data.tamSamSom.sam?.value ?? 0)}, SOM ${fmt(data.tamSamSom.som?.value ?? 0)}`);
  }
  if (data.segmentation?.segments.length) {
    const names = data.segmentation.segments.map((s) => s.name).join(', ');
    lines.push(`  [Deep Dive - Segments]: ${data.segmentation.segments.length} segments (${names})`);
  }
  if (data.personas?.personas.length) {
    lines.push(`  [Deep Dive - Personas]: ${data.personas.personas.length} personas defined`);
  }
  if (data.competitiveLandscape?.competitors.length) {
    lines.push(`  [Deep Dive - Competitors]: ${data.competitiveLandscape.competitors.length} competitors mapped`);
  }
  if (data.marketValidation?.validations.length) {
    lines.push(`  [Deep Dive - Validation]: ${data.marketValidation.validations.length} claims validated`);
  }
  return lines.join('\n');
}

/**
 * Serialize canvas state for AI context.
 * Shared blocks (channels, customer_segments, cost_structure, revenue_streams)
 * have the same content in both modes. Non-shared blocks include both BMC and
 * Lean content so the AI can reason across both canvases.
 */
export function serializeCanvasState(blocks: BlockData[], mode: 'bmc' | 'lean' = 'bmc'): string {
  return blocks
    .map((b) => {
      const def = BLOCK_DEFINITIONS.find((d) => d.type === b.blockType);
      const isShared = def?.leanLabel === null;
      const bmcLabel = def?.bmcLabel ?? b.blockType;

      let line: string;
      if (isShared) {
        // Shared block — same content in both modes
        line = `[${bmcLabel}]: ${b.content.bmc || '(empty)'}`;
      } else {
        // Non-shared block — include both BMC and Lean content
        const leanLabel = def?.leanLabel ?? b.blockType;
        const bmcContent = b.content.bmc || '(empty)';
        const leanContent = b.content.lean || '(empty)';
        if (bmcContent === leanContent) {
          // Same content, show once with both labels
          line = `[${bmcLabel} / ${leanLabel}]: ${bmcContent}`;
        } else {
          line = `[${bmcLabel}]: ${bmcContent}\n  [Lean: ${leanLabel}]: ${leanContent}`;
        }
      }

      if (b.linkedSegments?.length) {
        for (const seg of b.linkedSegments) {
          const parts = [`"${seg.name}" (priority: ${seg.priorityScore}`];
          if (seg.earlyAdopterFlag) parts.push('Early Adopter');
          parts.push(')');
          const desc = seg.description ? ` — ${seg.description}` : '';
          line += `\n  → Segment: ${parts.join(', ')}${desc}`;
        }
      }
      if (b.deepDiveData) {
        const summary = summarizeDeepDive(b.deepDiveData);
        if (summary) line += '\n' + summary;
      }
      return line;
    })
    .join('\n');
}

const BLOCK_PROMPTS: Record<BlockType, string> = {
  customer_segments: `You specialize in market analysis for Customer Segments. Focus on:
- Market sizing (TAM/SAM/SOM) with methodology
- Customer segmentation (demographic, psychographic, behavioral, geographic)
- Persona development with specific traits
- Segment prioritization and validation`,

  value_prop: `You specialize in Value Proposition analysis. Focus on:
- Feature-benefit mapping (features → advantages → benefits)
- Competitive positioning and differentiation
- Value proposition fit with customer segments
- Jobs-to-be-done framework application`,

  revenue_streams: `You specialize in Revenue Streams analysis. Focus on:
- Pricing strategy evaluation (value-based, cost-plus, competitive)
- Unit economics (LTV, CAC, margins)
- Revenue model fit (subscription, transaction, freemium, etc.)
- Revenue diversification and scalability`,

  cost_structure: `You specialize in Cost Structure analysis. Focus on:
- Fixed vs variable cost breakdown
- Cost drivers and optimization opportunities
- Break-even analysis methodology
- Economies of scale potential`,

  channels: `You specialize in Channel strategy. Focus on:
- Channel mix optimization (direct, indirect, digital, physical)
- Customer journey mapping across channels
- Channel economics (CAC per channel, conversion rates)
- Channel-segment fit analysis`,

  customer_relationships: `You specialize in Customer Relationship strategy. Focus on:
- Relationship type fit (self-service, assisted, automated, community)
- Retention strategy and churn prevention
- Customer lifecycle management
- Relationship-to-revenue connection`,

  key_activities: `You specialize in Key Activities analysis. Focus on:
- Activity prioritization (core vs supporting)
- Capability assessment and gaps
- Process mapping for critical activities
- Activity-to-value-proposition linkage`,

  key_resources: `You specialize in Key Resources analysis. Focus on:
- Resource audit (physical, intellectual, human, financial)
- Resource gap identification
- Build vs buy vs partner decisions
- Resource scalability assessment`,

  key_partnerships: `You specialize in Key Partnerships analysis. Focus on:
- Partnership type evaluation (strategic alliance, joint venture, buyer-supplier)
- Partner fit assessment criteria
- Partnership risk and dependency analysis
- Make vs partner decision framework`,
};

export function buildSystemPrompt(agentType: AgentType, blocks: BlockData[]): string {
  const canvasState = serializeCanvasState(blocks);
  const blockPrompt = agentType !== 'general' ? BLOCK_PROMPTS[agentType] : '';
  const focusInstruction = agentType === 'general'
    ? `You are the system-level AI performing cross-block reasoning. Analyze the ENTIRE canvas for contradictions, missing links, and logical gaps between blocks.`
    : `${blockPrompt}\n\nFocus on this block while cross-referencing other blocks for consistency.`;

  return `${BASE_SYSTEM_PROMPT}

${focusInstruction}

The canvas supports two modes: BMC (Business Model Canvas) and Lean Canvas. Some blocks are shared between both modes (Channels, Customer Segments, Cost Structure, Revenue Streams). Non-shared blocks may have different content in each mode — both are shown below.

Current canvas state:
${canvasState}`;
}

// ─── Deep Dive Prompts ───────────────────────────────────────────────────────

const DEEP_DIVE_PROMPTS: Record<DeepDiveModule, string> = {
  tam_sam_som: `You are a market sizing specialist. Estimate TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) for this startup.

Guidelines:
- Use top-down and bottom-up approaches where possible
- Cite specific industry reports, market research firms, or data sources
- Be realistic — SOM should be achievable within 2-3 years for a startup
- Explain the methodology clearly so the user can verify and adjust
- Flag any assumptions that significantly affect the estimates
- Consider the startup's specific geography and target customer type

Use the estimateMarketSize tool to return your structured analysis.`,

  segmentation: `You are a customer segmentation expert. Generate distinct customer segments for this startup based on the canvas content.

Guidelines:
- Define 3-5 meaningful segments with clear differentiation
- Include all four dimensions: demographics, psychographics, behavioral, geographic
- Estimate segment sizes relative to each other
- Prioritize segments by accessibility, willingness to pay, and strategic fit
- Each segment should be actionable — the startup can target it with a specific strategy
- Reference the value proposition and channels blocks for segment-channel fit

Use the generateSegments tool to return your structured segments.`,

  personas: `You are a customer persona specialist. Create detailed, realistic personas linked to existing customer segments.

Guidelines:
- Create 1-2 personas per segment
- Make personas specific and memorable — real names, ages, occupations, quotes
- Goals and frustrations should directly relate to the startup's value proposition
- Behaviors should suggest how this persona discovers and evaluates solutions
- Each persona should feel like a real person the founder could interview
- Link each persona to its segment via segmentId

Use the generatePersonas tool to return your structured personas.`,

  market_validation: `You are a market research validator. Cross-check the TAM/SAM/SOM estimates and market assumptions against available data and logic.

Guidelines:
- Check if TAM→SAM→SOM ratios are reasonable (SAM typically 10-40% of TAM, SOM 1-5% of SAM for a startup)
- Validate methodology — are the assumptions sound?
- Cross-reference with the revenue streams block — does the SOM support the projected revenue?
- Flag any claims that seem too optimistic or too conservative
- Provide specific evidence for each validation point
- Give an overall assessment of the market sizing quality

Use the validateMarketSize tool to return your structured validation.`,

  competitive_landscape: `You are a competitive intelligence analyst. Map the competitive landscape for this startup's target market.

Guidelines:
- Identify 4-6 key competitors (direct and indirect)
- Assess positioning — how does each competitor differentiate?
- Be specific about strengths and weaknesses (not generic)
- Estimate market share where possible
- Assess threat level based on overlap with the startup's target segments and value proposition
- Consider substitutes and potential new entrants, not just current competitors
- Reference the value proposition block to identify differentiation opportunities

Use the analyzeCompetitors tool to return your structured analysis.`,
};

const DEEP_DIVE_TOOL_MAP: Record<DeepDiveModule, string> = {
  tam_sam_som: 'estimateMarketSize',
  segmentation: 'generateSegments',
  personas: 'generatePersonas',
  market_validation: 'validateMarketSize',
  competitive_landscape: 'analyzeCompetitors',
};

export function getDeepDiveToolName(module: DeepDiveModule): string {
  return DEEP_DIVE_TOOL_MAP[module];
}

export function buildDeepDivePrompt(
  module: DeepDiveModule,
  blocks: BlockData[],
  existingDeepDive: MarketResearchData | null,
  inputs?: Record<string, string>,
): string {
  const canvasState = serializeCanvasState(blocks);
  const modulePrompt = DEEP_DIVE_PROMPTS[module];

  let contextSection = '';

  // Include existing deep-dive data as context
  if (existingDeepDive) {
    if (module === 'personas' && existingDeepDive.segmentation?.segments.length) {
      contextSection += `\nExisting segments (link personas to these):\n${JSON.stringify(existingDeepDive.segmentation.segments, null, 2)}`;
    }
    if (module === 'market_validation' && existingDeepDive.tamSamSom) {
      contextSection += `\nExisting TAM/SAM/SOM to validate:\n${JSON.stringify(existingDeepDive.tamSamSom, null, 2)}`;
    }
    if (module === 'competitive_landscape' && existingDeepDive.segmentation?.segments.length) {
      contextSection += `\nTarget segments to consider:\n${existingDeepDive.segmentation.segments.map((s) => s.name).join(', ')}`;
    }
  }

  // Include user inputs
  let inputSection = '';
  if (inputs && Object.keys(inputs).length > 0) {
    inputSection = `\nUser-provided inputs:\n${Object.entries(inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
  }

  return `${BASE_SYSTEM_PROMPT}

${modulePrompt}

Current canvas state:
${canvasState}
${contextSection}${inputSection}`;
}
