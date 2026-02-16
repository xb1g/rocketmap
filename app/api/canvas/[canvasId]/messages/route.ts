import { requireAuth } from '@/lib/appwrite-server';
import {
  loadChatMessages,
  saveChatMessage,
  deleteChatMessages,
  listChatSessions,
} from '@/lib/ai/chat-persistence';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const { searchParams } = new URL(request.url);
    const sessions = searchParams.get('sessions');
    const scope = searchParams.get('scope');

    if (sessions === '1' && scope) {
      const sessionList = await listChatSessions(canvasId, scope, user.$id);
      return Response.json({ sessions: sessionList });
    }

    const chatKey = searchParams.get('chatKey');

    if (!chatKey) {
      return Response.json({ error: 'chatKey or sessions+scope is required' }, { status: 400 });
    }

    // Support cursor pagination via ?cursor= query param
    const cursor = searchParams.get('cursor') ?? undefined;
    const { messages, lastId } = await loadChatMessages(canvasId, chatKey, user.$id, cursor);
    return Response.json({ messages, lastId });
  } catch (error: unknown) {
    console.error('[messages GET]', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const { chatKey, role, content, messageId } = await request.json();

    if (!chatKey || !role || !content || !messageId) {
      return Response.json({ error: 'chatKey, role, content, and messageId are required' }, { status: 400 });
    }

    await saveChatMessage(canvasId, chatKey, user.$id, { messageId, role, content });
    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const { searchParams } = new URL(request.url);
    const chatKey = searchParams.get('chatKey');

    if (!chatKey) {
      return Response.json({ error: 'chatKey is required' }, { status: 400 });
    }

    await deleteChatMessages(canvasId, chatKey, user.$id);
    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 },
    );
  }
}
