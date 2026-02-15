import { NextResponse } from 'next/server';
import { stepCountIs } from 'ai';
import { generateTextWithLogging } from '@/lib/ai/logger';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from '@/lib/appwrite';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { getToolsForAgent } from '@/lib/ai/tools';
import { buildDeepDivePrompt, getDeepDiveToolName } from '@/lib/ai/prompts';
import type { DeepDiveModule, MarketResearchData } from '@/lib/types/canvas';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

interface RouteContext {
  params: Promise<{ canvasId: string; blockType: string }>;
}

const VALID_MODULES: DeepDiveModule[] = [
  'tam_sam_som',
  'segmentation',
  'personas',
  'market_validation',
  'competitive_landscape',
  'segment_scoring',
  'segment_comparison',
];

// POST — AI generation for a specific deep-dive module
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;
    const { module, inputs } = (await request.json()) as {
      module: DeepDiveModule;
      inputs: Record<string, string>;
    };

    if (!VALID_MODULES.includes(module)) {
      return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
    }

    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const targetBlock = blocks.find((b) => b.blockType === blockType);
    const existingDeepDive = targetBlock?.deepDiveData ?? null;

    const systemPrompt = buildDeepDivePrompt(module, blocks, existingDeepDive, inputs);
    const toolName = getDeepDiveToolName(module);
    const tools = getToolsForAgent([toolName]);

    const content = targetBlock
      ? `${targetBlock.content.bmc}\n${targetBlock.content.lean}`.trim()
      : '';

    // Build module-specific user message
    let userMessage: string;
    if (module === 'segment_scoring') {
      const name = inputs?.segmentName || '(unnamed)';
      const desc = inputs?.segmentDescription || '';
      const demo = inputs?.demographics || '';
      const psych = inputs?.psychographics || '';
      const behav = inputs?.behavioral || '';
      const geo = inputs?.geographic || '';
      const segDetail = [
        `Segment: "${name}"`,
        desc && `Description: ${desc}`,
        demo && `Demographics: ${demo}`,
        psych && `Psychographics: ${psych}`,
        behav && `Behavioral: ${behav}`,
        geo && `Geographic: ${geo}`,
      ].filter(Boolean).join('\n');
      userMessage = `Score the following customer segment using the scoreSegment tool.\n\n${segDetail}\n\nBlock content for context: "${content || '(empty)'}"`;
    } else if (module === 'segment_comparison') {
      userMessage = `Compare these two customer segments using the compareSegments tool.\n\nSegment A: "${inputs?.segmentAName || '(unnamed)'}" — ${inputs?.segmentADescription || '(no description)'}\nSegment B: "${inputs?.segmentBName || '(unnamed)'}" — ${inputs?.segmentBDescription || '(no description)'}\n\nBlock content for context: "${content || '(empty)'}"`;
    } else {
      userMessage = `Perform a deep-dive analysis for the "${blockType}" block. Current content: "${content || '(empty)'}". Use the ${toolName} tool to return your structured analysis.`;
    }

    const { result, usage } = await generateTextWithLogging(
      `deep-dive:${module}`,
      {
        model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        tools,
        stopWhen: stepCountIs(3),
      },
      {
        onUsage: (usageData) => recordAnthropicUsageForUser(user.$id, usageData),
      },
    );

    // Extract tool result
    let toolResult: unknown = null;
    for (const step of result.steps) {
      for (const tc of step.toolResults) {
        if (tc.toolName === toolName) {
          toolResult = (tc as unknown as { result: unknown }).result;
        }
      }
    }

    if (!toolResult) {
      return NextResponse.json({ error: 'AI did not produce a result' }, { status: 500 });
    }

    // Merge into existing deep-dive data
    const updatedDeepDive: MarketResearchData = {
      tamSamSom: existingDeepDive?.tamSamSom ?? null,
      segmentation: existingDeepDive?.segmentation ?? null,
      personas: existingDeepDive?.personas ?? null,
      marketValidation: existingDeepDive?.marketValidation ?? null,
      competitiveLandscape: existingDeepDive?.competitiveLandscape ?? null,
      scorecards: existingDeepDive?.scorecards,
    };

    // Map module to the correct field
    switch (module) {
      case 'tam_sam_som': {
        const r = toolResult as { tam: unknown; sam: unknown; som: unknown; reasoning: string };
        updatedDeepDive.tamSamSom = {
          industry: inputs?.industry ?? '',
          geography: inputs?.geography ?? '',
          targetCustomerType: inputs?.targetCustomerType ?? '',
          tam: r.tam as MarketResearchData['tamSamSom'] extends { tam: infer T } ? T : never,
          sam: r.sam as MarketResearchData['tamSamSom'] extends { sam: infer T } ? T : never,
          som: r.som as MarketResearchData['tamSamSom'] extends { som: infer T } ? T : never,
          reasoning: r.reasoning,
        };
        break;
      }
      case 'segmentation':
        updatedDeepDive.segmentation = toolResult as MarketResearchData['segmentation'];
        break;
      case 'personas':
        updatedDeepDive.personas = toolResult as MarketResearchData['personas'];
        break;
      case 'market_validation':
        updatedDeepDive.marketValidation = toolResult as MarketResearchData['marketValidation'];
        break;
      case 'competitive_landscape':
        updatedDeepDive.competitiveLandscape = toolResult as MarketResearchData['competitiveLandscape'];
        break;
      case 'segment_scoring': {
        const scoreResult = toolResult as {
          criteria: MarketResearchData extends { scorecards?: Array<infer S> } ? S extends { criteria: infer C } ? C : never : never;
          overallScore: number;
          recommendation: 'pursue' | 'test' | 'defer';
          reasoning: string;
          keyRisks: string[];
          requiredExperiments: string[];
        };
        const segmentId = inputs?.segmentId ? Number(inputs.segmentId) : 0;
        // Compute data confidence from deep-dive completeness
        let dataConfidence = 20; // base
        if (updatedDeepDive.tamSamSom?.tam) dataConfidence += 20;
        if (updatedDeepDive.segmentation?.segments.length) dataConfidence += 20;
        if (updatedDeepDive.competitiveLandscape?.competitors.length) dataConfidence += 20;
        if (updatedDeepDive.marketValidation?.validations.length) dataConfidence += 20;

        const newScorecard = {
          segmentId,
          beachheadStatus: (scoreResult.recommendation === 'pursue' ? 'primary' : scoreResult.recommendation === 'test' ? 'secondary' : 'later') as 'primary' | 'secondary' | 'later',
          arpu: inputs?.arpu ? Number(inputs.arpu) : null,
          revenuePotential: null,
          criteria: scoreResult.criteria,
          overallScore: scoreResult.overallScore,
          aiRecommendation: scoreResult.recommendation,
          aiReasoning: scoreResult.reasoning,
          keyRisks: scoreResult.keyRisks,
          requiredExperiments: scoreResult.requiredExperiments,
          dataConfidence,
          lastUpdated: new Date().toISOString(),
        };
        // Upsert: replace existing scorecard for this segment or append
        const existing = updatedDeepDive.scorecards ?? [];
        updatedDeepDive.scorecards = [
          ...existing.filter((s) => s.segmentId !== segmentId),
          newScorecard,
        ];
        break;
      }
      case 'segment_comparison': {
        // Comparison results returned directly, no persistence needed
        // But we still persist the deep-dive to ensure consistency
        break;
      }
    }

    // Persist to Appwrite
    await persistDeepDive(canvasId, blockType, updatedDeepDive);

    return NextResponse.json({ result: toolResult, updatedDeepDive, usage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Deep-dive error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT — Manual edits to deep-dive data
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;
    const { deepDiveJson } = (await request.json()) as { deepDiveJson: string };

    // Verify ownership
    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );
    if (canvas.ownerId !== user.$id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canvasIntId = canvas.id as number;
    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [
        Query.equal('canvasId', canvasIntId),
        Query.equal('blockType', blockType),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      await serverDatabases.updateDocument(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        existing.documents[0].$id,
        { deepDiveJson },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Deep-dive PUT error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function persistDeepDive(canvasId: string, blockType: string, data: MarketResearchData) {
  const canvas = await serverDatabases.getDocument(
    DATABASE_ID,
    CANVASES_COLLECTION_ID,
    canvasId,
  );
  const canvasIntId = canvas.id as number;

  const existing = await serverDatabases.listDocuments(
    DATABASE_ID,
    BLOCKS_COLLECTION_ID,
    [
      Query.equal('canvasId', canvasIntId),
      Query.equal('blockType', blockType),
      Query.limit(1),
    ],
  );

  if (existing.documents.length > 0) {
    await serverDatabases.updateDocument(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      existing.documents[0].$id,
      { deepDiveJson: JSON.stringify(data) },
    );
  }
}
