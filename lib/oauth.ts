"use server";

import { createAdminClient, SESSION_COOKIE } from "@/lib/appwrite-server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { OAuthProvider } from "node-appwrite";

export async function signInWithGoogle() {
  const { account } = createAdminClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const proto = forwardedProto ?? "https";
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl;
  const baseUrl = origin ?? (host ? `${proto}://${host}` : appUrl);

  if (!baseUrl) {
    throw new Error("Missing base URL for OAuth redirect.");
  }

  const redirectUrl = await account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${baseUrl}/auth/callback`,
    failure: `${baseUrl}/?error=auth_failed`,
  });

  redirect(redirectUrl);
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
