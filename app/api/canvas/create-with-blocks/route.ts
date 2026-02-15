import { NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from '@/lib/appwrite';
import { generateSlug } from '@/lib/utils';
import type { BlockType } from '@/lib/types/canvas';

const ALL_BLOCK_TYPES: BlockType[] = [
  'key_partnerships', 'key_activities', 'key_resources',
  'value_prop', 'customer_relationships', 'channels',
  'customer_segments', 'cost_structure', 'revenue_streams',
];

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { title, blocks } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!blocks || typeof blocks !== 'object') {
      return NextResponse.json({ error: 'Blocks are required' }, { status: 400 });
    }

    const slug = await generateSlug(title, user.$id);
    const now = new Date().toISOString();
    const canvasIntId = Date.now();

    // Create canvas
    const doc = await serverDatabases.createDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      ID.unique(),
      {
        id: canvasIntId,
        title: title.trim(),
        slug,
        description: '',
        createdAt: now,
        updatedAt: now,
        isPublic: false,
        ownerId: user.$id,
      },
    );

    // Create all 9 blocks in parallel
    await Promise.all(
      ALL_BLOCK_TYPES.map((blockType, index) => {
        const content = blocks[blockType] ?? '';
        const contentJson = JSON.stringify({ bmc: content, lean: content });
        return serverDatabases.createDocument(
          DATABASE_ID,
          BLOCKS_COLLECTION_ID,
          ID.unique(),
          {
            id: canvasIntId * 100 + index + 1,
            canvasId: canvasIntId,
            blockType,
            contentJson,
          },
        );
      }),
    );

    return NextResponse.json({ slug, $id: doc.$id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Canvas creation with blocks error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
