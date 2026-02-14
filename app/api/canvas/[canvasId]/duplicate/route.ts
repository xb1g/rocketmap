import { NextResponse } from 'next/server';
import { ID, Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, CANVASES_COLLECTION_ID, BLOCKS_COLLECTION_ID } from '@/lib/appwrite';
import { generateSlug } from '@/lib/utils';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const user = await requireAuth();
    const { canvasId } = await params;

    const source = await serverDatabases.getDocument(DATABASE_ID, CANVASES_COLLECTION_ID, canvasId);

    if (source.ownerId !== user.$id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const newTitle = `${source.title} (Copy)`;
    const slug = await generateSlug(newTitle, user.$id);
    const now = new Date().toISOString();

    const newCanvas = await serverDatabases.createDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      ID.unique(),
      {
        id: Date.now(),
        title: newTitle,
        slug,
        description: source.description || '',
        createdAt: now,
        updatedAt: now,
        isPublic: false,
        ownerId: user.$id,
      }
    );

    try {
      const blocks = await serverDatabases.listDocuments(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        [Query.equal('canvasId', source.id as number), Query.limit(9)]
      );
      for (const block of blocks.documents) {
        await serverDatabases.createDocument(
          DATABASE_ID,
          BLOCKS_COLLECTION_ID,
          ID.unique(),
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            canvasId: newCanvas.id,
            blockType: block.blockType,
            contentJson: block.contentJson,
          }
        );
      }
    } catch {
      // Blocks might not exist
    }

    return NextResponse.json({ slug, $id: newCanvas.$id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
