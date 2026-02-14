'use server';

import { createAdminClient, SESSION_COOKIE } from '@/lib/appwrite-server';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { OAuthProvider } from 'node-appwrite';

export async function signInWithGoogle() {
  const { account } = createAdminClient();
  const origin = (await headers()).get('origin');

  const redirectUrl = await account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${origin}/auth/callback`,
    failure: `${origin}/?error=auth_failed`,
  });

  redirect(redirectUrl);
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/');
}
