/**
 * Migration script: Move existing deepDiveJson.segmentation.segments[]
 * from blocks into the `segments` collection and create block_segments links.
 *
 * Usage: npx tsx scripts/migrate-segments.ts
 *
 * Prerequisites:
 * - `segments` and `block_segments` collections must exist in Appwrite
 * - Environment variables must be set (NEXT_PUBLIC_APPWRITE_ENDPOINT, etc.)
 */

import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const BLOCKS_COLLECTION_ID = 'blocks';
const SEGMENTS_COLLECTION_ID = 'segments';
const BLOCK_SEGMENTS_COLLECTION_ID = 'block_segments';

interface LegacySegment {
  id: string;
  name: string;
  description: string;
  demographics: string;
  psychographics: string;
  behavioral: string;
  geographic: string;
  estimatedSize: string;
  priority: 'high' | 'medium' | 'low';
}

const PRIORITY_MAP: Record<string, number> = {
  high: 80,
  medium: 50,
  low: 30,
};

async function migrate() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  console.log('Fetching blocks with deepDiveJson...');

  // Fetch all blocks that might have deepDiveJson
  let offset = 0;
  const limit = 100;
  let totalMigrated = 0;

  while (true) {
    const result = await databases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [
        Query.equal('blockType', 'customer_segments'),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    if (result.documents.length === 0) break;

    for (const blockDoc of result.documents) {
      const deepDiveJson = blockDoc.deepDiveJson as string | undefined;
      if (!deepDiveJson) continue;

      let deepDive;
      try {
        deepDive = JSON.parse(deepDiveJson);
      } catch {
        continue;
      }

      const segments: LegacySegment[] = deepDive?.segmentation?.segments ?? [];
      if (segments.length === 0) continue;

      const canvasId = blockDoc.canvasId as number;
      const blockId = blockDoc.id as number;

      console.log(`\nBlock ${blockDoc.$id} (canvas ${canvasId}): ${segments.length} segments`);

      for (const seg of segments) {
        const segIntId = Math.floor(Math.random() * 2_000_000_000);

        // Create segment document
        const segDoc = await databases.createDocument(
          DATABASE_ID,
          SEGMENTS_COLLECTION_ID,
          ID.unique(),
          {
            id: segIntId,
            canvasId,
            name: seg.name || 'Unnamed Segment',
            description: seg.description || '',
            earlyAdopterFlag: false,
            priorityScore: PRIORITY_MAP[seg.priority] ?? 50,
            demographics: seg.demographics || '',
            psychographics: seg.psychographics || '',
            behavioral: seg.behavioral || '',
            geographic: seg.geographic || '',
            estimatedSize: seg.estimatedSize || '',
          },
        );

        console.log(`  Created segment: "${seg.name}" (id: ${segIntId})`);

        // Create block_segments link
        await databases.createDocument(
          DATABASE_ID,
          BLOCK_SEGMENTS_COLLECTION_ID,
          ID.unique(),
          {
            blockId,
            segmentId: segIntId,
          },
        );

        console.log(`  Linked to block ${blockId}`);
        totalMigrated++;

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    offset += limit;
    if (result.documents.length < limit) break;
  }

  console.log(`\nMigration complete: ${totalMigrated} segments migrated.`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
