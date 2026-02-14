import { cookies } from 'next/headers';
import { serverAccount } from './appwrite';
import type { Models } from 'node-appwrite';

/**
 * Get current session user from cookies
 * Returns user object or null if not authenticated
 */
export async function getSessionUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    if (!session) {
      return null;
    }

    // Validate session with Appwrite
    const user = await serverAccount.get();
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use in route handlers that require auth
 */
export async function requireAuth(): Promise<Models.User<Models.Preferences>> {
  const user = await getSessionUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
