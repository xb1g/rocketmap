import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, SESSION_COOKIE } from '@/lib/appwrite-server';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const secret = request.nextUrl.searchParams.get('secret');

    if (!userId || !secret) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(url);
    }

    // Exchange the token for a session
    const { account } = createAdminClient();
    const session = await account.createSession(userId, secret);

    // Set session cookie on our domain
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expire),
    });

    // Redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(url);
  }
}
