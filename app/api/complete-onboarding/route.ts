import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { serverTablesDB, DATABASE_ID, USERS_TABLE_ID } from '@/lib/appwrite';

export async function POST() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Update onboarding status using Appwrite user ID as row ID
    // No Query optimization needed — single row update by ID
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: USERS_TABLE_ID,
      rowId: user.$id,
      data: {
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
