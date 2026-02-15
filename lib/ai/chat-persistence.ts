import { Query, ID } from 'node-appwrite';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  MESSAGES_COLLECTION_ID,
} from '@/lib/appwrite';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  sessionKey: string;
  label: string;
  createdAt: string;
  messageCount: number;
}

interface SaveMessageInput {
  messageId: string;
  role: string;
  content: string;
}

async function resolveCanvasId(canvasDocId: string, userId: string): Promise<string> {
  const canvas = await serverDatabases.getDocument(
    DATABASE_ID,
    CANVASES_COLLECTION_ID,
    canvasDocId,
  );
  if (canvas.ownerId !== userId) {
    throw new Error('Forbidden');
  }
  return String(canvas.id);
}

export async function loadChatMessages(
  canvasDocId: string,
  chatKey: string,
  userId: string,
): Promise<ChatMessage[]> {
  const canvasId = await resolveCanvasId(canvasDocId, userId);

  const result = await serverDatabases.listDocuments(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    [
      Query.equal('canvasId', canvasId),
      Query.equal('chatKey', chatKey),
      Query.orderAsc('createdAt'),
      Query.limit(100),
    ],
  );

  return result.documents.map((doc) => ({
    id: doc.messageId as string,
    role: doc.role as string,
    content: doc.content as string,
    createdAt: doc.createdAt as string,
  }));
}

export async function saveChatMessage(
  canvasDocId: string,
  chatKey: string,
  userId: string,
  msg: SaveMessageInput,
): Promise<void> {
  const canvasId = await resolveCanvasId(canvasDocId, userId);

  await serverDatabases.createDocument(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    ID.unique(),
    {
      canvasId,
      chatKey,
      role: msg.role,
      content: msg.content,
      messageId: msg.messageId,
      createdAt: new Date().toISOString(),
      userId,
    },
  );
}

export async function listChatSessions(
  canvasDocId: string,
  scopePrefix: string,
  userId: string,
): Promise<ChatSession[]> {
  const canvasId = await resolveCanvasId(canvasDocId, userId);

  const result = await serverDatabases.listDocuments(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    [
      Query.equal('canvasId', canvasId),
      Query.startsWith('chatKey', scopePrefix),
      Query.orderAsc('createdAt'),
      Query.limit(500),
    ],
  );

  const groups = new Map<string, { createdAt: string; firstUserMsg: string; count: number }>();

  for (const doc of result.documents) {
    const key = doc.chatKey as string;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        createdAt: doc.createdAt as string,
        firstUserMsg: doc.role === 'user' ? (doc.content as string) : '',
        count: 1,
      });
    } else {
      existing.count++;
      if (!existing.firstUserMsg && doc.role === 'user') {
        existing.firstUserMsg = doc.content as string;
      }
    }
  }

  const sessions: ChatSession[] = [];
  for (const [sessionKey, data] of groups) {
    const label = sessionKey === scopePrefix
      ? 'Default'
      : data.firstUserMsg
        ? data.firstUserMsg.slice(0, 40) + (data.firstUserMsg.length > 40 ? '...' : '')
        : 'New chat';
    sessions.push({
      sessionKey,
      label,
      createdAt: data.createdAt,
      messageCount: data.count,
    });
  }

  return sessions;
}

export async function deleteChatMessages(
  canvasDocId: string,
  chatKey: string,
  userId: string,
): Promise<void> {
  const canvasId = await resolveCanvasId(canvasDocId, userId);

  const result = await serverDatabases.listDocuments(
    DATABASE_ID,
    MESSAGES_COLLECTION_ID,
    [
      Query.equal('canvasId', canvasId),
      Query.equal('chatKey', chatKey),
      Query.equal('userId', userId),
      Query.limit(500),
    ],
  );

  await Promise.all(
    result.documents.map((doc) =>
      serverDatabases.deleteDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, doc.$id),
    ),
  );
}
