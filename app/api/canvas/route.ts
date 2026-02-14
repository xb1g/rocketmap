import { NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, CANVASES_COLLECTION_ID } from '@/lib/appwrite';
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

    const doc = await serverDatabases.createDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      ID.unique(),
      {
        id: Date.now(),
        title: title.trim(),
        slug,
        description: '',
        createdAt: now,
        updatedAt: now,
        isPublic: false,
        ownerId: user.$id,
      },
    );

    return NextResponse.json({ slug, $id: doc.$id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Canvas creation error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
