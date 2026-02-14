import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, CANVASES_COLLECTION_ID, BLOCKS_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { AccountClient } from './AccountClient';

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  let canvasCount = 0;
  let totalBlocksFilled = 0;

  try {
    const canvasesResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      [Query.equal('ownerId', user.$id), Query.limit(100)]
    );
    canvasCount = canvasesResult.total;

    for (const canvas of canvasesResult.documents) {
      try {
        const blocksResult = await serverDatabases.listDocuments(
          DATABASE_ID,
          BLOCKS_COLLECTION_ID,
          [Query.equal('canvasId', canvas.id as number), Query.limit(9)]
        );
        totalBlocksFilled += blocksResult.documents.filter((block) => {
          const content = block.contentJson as string;
          if (!content) return false;
          try {
            const parsed = JSON.parse(content);
            return (parsed.bmc && parsed.bmc.trim() !== '') || (parsed.lean && parsed.lean.trim() !== '');
          } catch {
            return content.trim() !== '';
          }
        }).length;
      } catch {
        // skip
      }
    }
  } catch {
    // Collections might not exist
  }

  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(user.$createdAt).getTime()) / 86400000));

  return (
    <AccountClient
      user={{
        name: user.name || '',
        email: user.email,
        joinDate: user.$createdAt,
      }}
      stats={{
        canvasCount,
        totalBlocksFilled,
        daysActive,
      }}
    />
  );
}
