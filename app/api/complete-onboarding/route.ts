import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { serverTablesDB, DATABASE_ID, USERS_TABLE_ID } from '@/lib/appwrite';

export async function POST() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Update onboarding status using Appwrite user ID as row ID
    // No Query optimization needed — single row update by ID
    try {
      await serverTablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: USERS_TABLE_ID,
        rowId: user.$id,
        data: {
          onboardingCompleted: true,
        },
      });
    } catch (updateError: any) {
      // If row doesn't exist (e.g., user created before this fix), create it
      if (updateError?.code === 404 || updateError?.type === 'row_not_found') {
        await serverTablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: USERS_TABLE_ID,
          rowId: user.$id,
          data: {
            email: user.email,
            name: user.name || '',
            onboardingCompleted: true,
          },
        });
      } else {
        throw updateError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
