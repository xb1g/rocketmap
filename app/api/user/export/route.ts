import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import { serverTablesDB, DATABASE_ID, CANVASES_TABLE_ID, BLOCKS_TABLE_ID } from '@/lib/appwrite';

export async function GET() {
  try {
    const user = await requireAuth();

    // Index required: user (key), $updatedAt (desc) — composite index recommended
    const canvasesResult = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      queries: [
        Query.equal('user', user.$id),
        Query.select(['$id', 'title', 'slug', 'createdAt', '$updatedAt']),
        Query.orderDesc('$updatedAt'),
        Query.limit(100),
      ],
    });

    const canvases = await Promise.all(
      canvasesResult.rows.map(async (canvas) => {
        let blocks: { blockType: string; content: unknown }[] = [];
        try {
          // Index required: canvasId (key)
          const blocksResult = await serverTablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: BLOCKS_TABLE_ID,
            queries: [
              Query.equal('canvasId', canvas.$id),
              Query.select(['blockType', 'contentJson']),
              Query.limit(9),
            ],
          });
          blocks = blocksResult.rows.map((block) => ({
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
