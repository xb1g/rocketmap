import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite';

export async function POST() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Update onboarding status using Appwrite user ID as document ID
    await serverDatabases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      user.$id,
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
