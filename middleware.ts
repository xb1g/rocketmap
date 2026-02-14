import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('rocketmap-session');

  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/canvas/:path*',
  ],
};
