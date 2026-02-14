import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check for session cookie
  const sessionCookie = request.cookies.get(
    'a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  );

  // If no session and trying to access protected route, redirect to landing
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // Session exists, allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/canvas/:path*',
  ],
};
