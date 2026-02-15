import { requireAuth } from '@/lib/appwrite-server';
import {
  loadChatMessages,
  saveChatMessage,
  deleteChatMessages,
} from '@/lib/ai/chat-persistence';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const { searchParams } = new URL(request.url);
    const chatKey = searchParams.get('chatKey');

    if (!chatKey) {
      return Response.json({ error: 'chatKey is required' }, { status: 400 });
    }

    const messages = await loadChatMessages(canvasId, chatKey, user.$id);
    return Response.json({ messages });
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
