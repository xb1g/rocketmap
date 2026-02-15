import { stepCountIs, convertToModelMessages } from 'ai';
import { ID, Query } from 'node-appwrite';
import { streamTextWithLogging } from '@/lib/ai/logger';
import { requireAuth } from '@/lib/appwrite-server';
import { getCanvasBlocks } from '@/lib/ai/canvas-state';
import { getAgentConfig } from '@/lib/ai/agents';
import { getToolsForAgent } from '@/lib/ai/tools';
import { saveChatMessage } from '@/lib/ai/chat-persistence';
import type { BlockType } from '@/lib/types/canvas';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
  CARDS_COLLECTION_ID,
} from '@/lib/appwrite';
import {
  getAnthropicModelForUser,
  recordAnthropicUsageForUser,
} from '@/lib/ai/user-preferences';

interface RouteContext {
  params: Promise<{ canvasId: string; blockType: string }>;
}

/** Persist card tool results (addCard/modifyCard/removeCard) to Appwrite */
async function persistCardToolResults(
  canvasId: string,
  blockType: string,
  userId: string,
  toolName: string,
  result: Record<string, unknown>,
) {
  try {
    if (toolName === 'addCard') {
      // Look up canvas and block IDs
      const canvas = await serverDatabases.getDocument(DATABASE_ID, CANVASES_COLLECTION_ID, canvasId);
      const canvasIntId = canvas.id as number;
      const blockResult = await serverDatabases.listDocuments(DATABASE_ID, BLOCKS_COLLECTION_ID, [
        Query.equal('canvasId', canvasIntId),
        Query.equal('blockType', result.blockType as string || blockType),
        Query.limit(1),
      ]);
      if (blockResult.documents.length === 0) return;
      const blockId = blockResult.documents[0].id as number;

      // Get next order
      const existing = await serverDatabases.listDocuments(DATABASE_ID, CARDS_COLLECTION_ID, [
        Query.equal('blockId', blockId),
        Query.orderDesc('order'),
        Query.limit(1),
      ]);
      const nextOrder = existing.documents.length > 0 ? (existing.documents[0].order as number) + 1 : 0;

      await serverDatabases.createDocument(DATABASE_ID, CARDS_COLLECTION_ID, ID.unique(), {
        id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        blockId,
        canvasId: canvasIntId,
        name: (result.name as string).trim(),
        description: ((result.description as string) ?? '').trim(),
        order: nextOrder,
        createdAt: new Date().toISOString(),
      });
    } else if (toolName === 'modifyCard') {
      const cardId = result.cardId as string;
      const cardResult = await serverDatabases.listDocuments(DATABASE_ID, CARDS_COLLECTION_ID, [
        Query.equal('id', cardId),
        Query.limit(1),
      ]);
      if (cardResult.documents.length === 0) return;
      const updates: Record<string, unknown> = {};
      if (result.name) updates.name = (result.name as string).trim();
      if (result.description) updates.description = (result.description as string).trim();
      if (Object.keys(updates).length > 0) {
        await serverDatabases.updateDocument(DATABASE_ID, CARDS_COLLECTION_ID, cardResult.documents[0].$id, updates);
      }
    } else if (toolName === 'removeCard') {
      const cardId = result.cardId as string;
      const cardResult = await serverDatabases.listDocuments(DATABASE_ID, CARDS_COLLECTION_ID, [
        Query.equal('id', cardId),
        Query.limit(1),
      ]);
      if (cardResult.documents.length > 0) {
        await serverDatabases.deleteDocument(DATABASE_ID, CARDS_COLLECTION_ID, cardResult.documents[0].$id);
      }
    }
  } catch (err) {
    console.error(`[chat] Failed to persist ${toolName}:`, err);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId, blockType } = await context.params;
    const { messages } = await request.json();

    const blocks = await getCanvasBlocks(canvasId, user.$id);
    const config = getAgentConfig(blockType as BlockType, blocks);
    const tools = getToolsForAgent(config.toolNames);

    const modelMessages = await convertToModelMessages(messages);

    const result = streamTextWithLogging(`block-chat:${blockType}`, {
      model: getAnthropicModelForUser(user, 'claude-sonnet-4-5-20250929'),
      system: config.systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(3),
    }, {
      onUsage: (usage) => recordAnthropicUsageForUser(user.$id, usage),
    });

    // Save assistant response (text + tool results) after stream completes
    Promise.resolve(result.steps).then((steps) => {
      const parts: Array<Record<string, unknown>> = [];
      for (const step of steps) {
        if (step.text) parts.push({ type: 'text', text: step.text });
        for (const tc of step.toolResults) {
          const tr = tc as unknown as { toolName: string; toolCallId: string; result: unknown };
          parts.push({
            type: 'tool-result',
            toolName: tr.toolName,
            toolCallId: tr.toolCallId,
            result: tr.result,
          });
          // Persist card operations to Appwrite
          if (['addCard', 'modifyCard', 'removeCard'].includes(tr.toolName)) {
            persistCardToolResults(canvasId, blockType, user.$id, tr.toolName, tr.result as Record<string, unknown>);
          }
        }
      }
      if (parts.length > 0) {
        saveChatMessage(canvasId, blockType, user.$id, {
          messageId: `assistant-${Date.now()}`,
          role: 'assistant',
          content: JSON.stringify({ parts }),
        }).catch((err) => console.error('[chat-persist] Failed to save assistant message:', err));
      }
    }).catch(() => {});

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
