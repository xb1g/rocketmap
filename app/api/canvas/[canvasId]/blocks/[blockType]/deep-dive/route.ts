import { NextResponse } from 'next/server';
import { stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
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

interface RouteContext {
  params: Promise<{ canvasId: string; blockType: string }>;
}

const VALID_MODULES: DeepDiveModule[] = [
  'tam_sam_som',
  'segmentation',
  'personas',
  'market_validation',
  'competitive_landscape',
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

    const { result, usage } = await generateTextWithLogging(`deep-dive:${module}`, {
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Perform a deep-dive analysis for the "${blockType}" block. Current content: "${content || '(empty)'}". Use the ${toolName} tool to return your structured analysis.`,
        },
      ],
      tools,
      stopWhen: stepCountIs(3),
    });

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
