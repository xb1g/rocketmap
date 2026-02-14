import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

export async function POST() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Find user document
    const docs = await serverDatabases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('userId', user.$id)]
    );

    if (docs.documents.length === 0) {
      return NextResponse.json({ error: 'User document not found' }, { status: 404 });
    }

    // Update onboarding status
    await serverDatabases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      docs.documents[0].$id,
      {
        onboardingCompleted: true,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
