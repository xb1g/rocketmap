import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { ID } from 'node-appwrite';
import { serverTablesDB, DATABASE_ID, CANVASES_TABLE_ID } from '@/lib/appwrite';
import { generateSlug } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { title } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = await generateSlug(title, user.$id);
    const now = new Date().toISOString();

    const doc = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: ID.unique(),
      data: {
        id: Date.now(),
        title: title.trim(),
        slug,
        description: '',
        createdAt: now,
        updatedAt: now,
        isPublic: false,
        users: user.$id,
      },
    });

    return NextResponse.json({ slug, $id: doc.$id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Canvas creation error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
