import { Query } from 'node-appwrite';
import { ID } from 'node-appwrite';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  MESSAGES_TABLE_ID,
} from '@/lib/appwrite';
import { getUserIdFromCanvas } from '@/lib/utils';
import type { CanvasData } from '@/lib/types/canvas';

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

export async function loadChatMessages(
  canvasDocId: string,
  chatKey: string,
  userId: string,
  cursor?: string,
): Promise<{ messages: ChatMessage[]; lastId: string | null }> {
  // Verify user has access to this canvas
  const canvas = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    rowId: canvasDocId,
  }) as unknown as CanvasData;
  if (getUserIdFromCanvas(canvas) !== userId) {
    throw new Error('Forbidden');
  }

  // Index required: messages collection — composite [canvas, chatKey, createdAt] index
  // Note: Relationship fields use the related row's $id for queries
  const queries = [
    Query.equal('canvas', canvasDocId), // Query by the relationship field value (canvas row ID)
    Query.equal('chatKey', chatKey),
    Query.select(['$id', 'messageId', 'role', 'content', 'createdAt']),
    Query.orderAsc('createdAt'),
    Query.limit(100),
  ];
  // Cursor pagination for chat feeds — avoids offset skips on dynamic data
  if (cursor) {
    queries.push(Query.cursorAfter(cursor));
  }

  const result = await serverTablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: MESSAGES_TABLE_ID,
    queries,
    total: false,
  });

  const docs = result.rows;
  const lastId = docs.length > 0 ? docs[docs.length - 1].$id : null;

  return {
    messages: docs.map((doc) => ({
      id: doc.messageId as string,
      role: doc.role as string,
      content: doc.content as string,
      createdAt: doc.createdAt as string,
    })),
    lastId,
  };
}

export async function saveChatMessage(
  canvasDocId: string,
  chatKey: string,
  userId: string,
  msg: SaveMessageInput,
): Promise<void> {
  // canvasDocId is already the canvas row ID - no need to resolve
  // Verify user has access
  const canvas = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    rowId: canvasDocId,
  }) as unknown as CanvasData;
  if (getUserIdFromCanvas(canvas) !== userId) {
    throw new Error('Forbidden');
  }

  await serverTablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: MESSAGES_TABLE_ID,
    rowId: ID.unique(),
    data: {
      canvas: canvasDocId, // Use relationship - just pass the canvas row ID
      chatKey,
      role: msg.role,
      content: msg.content,
      messageId: msg.messageId,
      createdAt: new Date().toISOString(),
      user: userId, // Use relationship - just pass the user ID
    },
  });
}

export async function listChatSessions(
  canvasDocId: string,
  scopePrefix: string,
  userId: string,
): Promise<ChatSession[]> {
  // Verify user has access to this canvas
  const canvas = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    rowId: canvasDocId,
  }) as unknown as CanvasData;
  if (getUserIdFromCanvas(canvas) !== userId) {
    throw new Error('Forbidden');
  }

  // Index required: messages collection — composite [canvas, chatKey, createdAt] index
  // Index required: messages collection — fulltext index on chatKey (for startsWith)
  const result = await serverTablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: MESSAGES_TABLE_ID,
    queries: [
      Query.equal('canvas', canvasDocId), // Query by the relationship field value
      Query.startsWith('chatKey', scopePrefix),
      Query.select(['$id', 'chatKey', 'role', 'content', 'createdAt']),
      Query.orderAsc('createdAt'),
      Query.limit(500),
    ],
    total: false,
  });

  const groups = new Map<string, { createdAt: string; firstUserMsg: string; count: number }>();

  for (const doc of result.rows) {
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
  // Verify user has access to this canvas
  const canvas = await serverTablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: CANVASES_TABLE_ID,
    rowId: canvasDocId,
  }) as unknown as CanvasData;
  if (getUserIdFromCanvas(canvas) !== userId) {
    throw new Error('Forbidden');
  }

  // Index required: messages collection — composite [canvas, chatKey, user] index
  // Only need $id for deletion — minimal payload
  const result = await serverTablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: MESSAGES_TABLE_ID,
    queries: [
      Query.equal('canvas', canvasDocId), // Query by the relationship field value
      Query.equal('chatKey', chatKey),
      Query.equal('user', userId), // Query by the relationship field value
      Query.select(['$id']),
      Query.limit(500),
    ],
    total: false,
  });

  await Promise.all(
    result.rows.map((doc) =>
      serverTablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: MESSAGES_TABLE_ID, rowId: doc.$id }),
    ),
  );
}
