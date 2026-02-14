import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, USERS_COLLECTION_ID, CANVASES_COLLECTION_ID } from '@/lib/appwrite';
import { Query, ID } from 'node-appwrite';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  // Get authenticated user
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  // Fetch or create user document
  let userDoc;
  try {
    const docs = await serverDatabases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('userId', user.$id)]
    );

    if (docs.documents.length === 0) {
      // First-time user - create user document
      userDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          email: user.email,
          name: user.name || '',
          onboardingCompleted: false,
        }
      );
    } else {
      userDoc = docs.documents[0];
    }
  } catch (error) {
    console.error('Error fetching user document:', error);
    // If database/collection doesn't exist yet, create minimal user state
    userDoc = {
      onboardingCompleted: false,
    };
  }

  // Fetch user's canvases
  let canvases: { $id: string; title: string; slug: string; $updatedAt: string }[] = [];
  try {
    const canvasesResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('$updatedAt'),
      ]
    );
    canvases = canvasesResult.documents as unknown as typeof canvases;
  } catch (error) {
    // Collection might not exist yet
    console.error('Error fetching canvases:', error);
  }

  return (
    <DashboardClient
      user={{
        $id: user.$id,
        email: user.email,
        name: user.name || '',
      }}
      onboardingCompleted={userDoc.onboardingCompleted || false}
      canvases={canvases}
    />
  );
}
