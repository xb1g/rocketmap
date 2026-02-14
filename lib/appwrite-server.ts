import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';
import type { Models } from 'node-appwrite';

export const SESSION_COOKIE = 'rocketmap-session';

/**
 * Create an admin Appwrite client (uses API key, not user session)
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    get account() {
      return new Account(client);
    },
  };
}

/**
 * Create a session-scoped Appwrite client using the user's session cookie.
 */
function createSessionClient(session: string) {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  client.setSession(session);

  return {
    get account() {
      return new Account(client);
    },
  };
}

/**
 * Get current session user from cookies
 * Returns user object or null if not authenticated
 */
export async function getSessionUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);

    if (!session) {
      return null;
    }

    const { account } = createSessionClient(session.value);
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<Models.User<Models.Preferences>> {
  const user = await getSessionUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
