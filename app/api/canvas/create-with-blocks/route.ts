import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { ID } from 'node-appwrite';
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
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

    // Create canvas
    const doc = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: ID.unique(),
      data: {
        title: title.trim(),
        slug,
        description: '',
        createdAt: now,
        updatedAt: now,
        isPublic: false,
        user: user.$id,
      },
    });

    // Create all 9 blocks in parallel
    await Promise.all(
      ALL_BLOCK_TYPES.map((blockType) => {
        const content = blocks[blockType] ?? '';
        const contentJson = JSON.stringify({ bmc: content, lean: content });
        return serverTablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: BLOCKS_TABLE_ID,
          rowId: ID.unique(),
          data: {
            canvasId: doc.$id,
            blockType,
            contentJson,
          },
        });
      }),
    );

    return NextResponse.json({ slug, $id: doc.$id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Canvas creation with blocks error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
