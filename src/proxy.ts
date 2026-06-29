// proxy.ts
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from './lib/auth/auth';
import { AUTH_REDIRECT_ROUTE, PUBLIC_ROUTES } from './lib/routes';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isPublic) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL(AUTH_REDIRECT_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // stays broad and static — only excludes things that are never real pages
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
