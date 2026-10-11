import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'creziax_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, images, and next internal files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // file with extension (favicon.ico, images, etc.)
  ) {
    return NextResponse.next();
  }

  // Public routes
  const isLoginPage = pathname === '/login';
  const isAuthLoginApi = pathname === '/api/auth/login';
  const isWebhookApi = pathname.startsWith('/api/webhooks');

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(token && token.includes('.'));

  // If user is already authenticated and visits /login, redirect to dashboard /
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If request is public, proceed
  if (isLoginPage || isAuthLoginApi || isWebhookApi) {
    return NextResponse.next();
  }

  // If unauthenticated, redirect or return 401
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
