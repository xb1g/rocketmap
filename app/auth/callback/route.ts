import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Check if we have the session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    if (!session) {
      // OAuth failed, redirect to landing with error
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(url);
    }

    // Success - redirect to dashboard
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
