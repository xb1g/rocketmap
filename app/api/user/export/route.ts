import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, CANVASES_COLLECTION_ID, BLOCKS_COLLECTION_ID } from '@/lib/appwrite';

export async function GET() {
  try {
    const user = await requireAuth();

    const canvasesResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      [
        Query.equal('ownerId', user.$id),
        Query.orderDesc('$updatedAt'),
        Query.limit(100),
      ]
    );

    const canvases = await Promise.all(
      canvasesResult.documents.map(async (canvas) => {
        let blocks: { blockType: string; content: unknown }[] = [];
        try {
          const blocksResult = await serverDatabases.listDocuments(
            DATABASE_ID,
            BLOCKS_COLLECTION_ID,
            [Query.equal('canvasId', canvas.id as number), Query.limit(9)]
          );
          blocks = blocksResult.documents.map((block) => ({
            blockType: block.blockType as string,
            content: (() => {
              try { return JSON.parse(block.contentJson as string); }
              catch { return { bmc: '', lean: '' }; }
            })(),
          }));
        } catch {
          // skip
        }
        return {
          title: canvas.title,
          slug: canvas.slug,
          createdAt: canvas.createdAt,
          updatedAt: canvas.$updatedAt,
          blocks,
        };
      })
    );

    return NextResponse.json({
      user: { name: user.name || '', email: user.email },
      canvases,
      exportDate: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
