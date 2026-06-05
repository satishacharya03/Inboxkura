import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware for routing and authentication protection.
 */
export default function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  const protectedPaths = ['/dashboard', '/settings'];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Redirect unauthenticated users trying to access dashboard/settings
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from the login/register pages
  if (request.nextUrl.pathname.startsWith('/login') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Edge runtime route matching
  matcher: ['/dashboard/:path*', '/settings/:path*', '/login'],
};
