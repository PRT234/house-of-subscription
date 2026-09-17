import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hos_token')?.value;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/subscriptions') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/analytics');

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtectedPage && !token) {
    // If accessing protected route without token, redirect to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/subscriptions/:path*',
    '/calendar/:path*',
    '/analytics/:path*',
  ],
};
