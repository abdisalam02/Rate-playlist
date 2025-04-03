import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Log request details for debugging
  const requestPath = request.nextUrl.pathname;
  
  if (requestPath.startsWith('/api/')) {
    console.log(`[Middleware] API Request: ${request.method} ${requestPath}`);
    console.log(`[Middleware] Host: ${request.headers.get('host')}`);
  }
  
  // Continue with the request
  return NextResponse.next();
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    // Match all request paths except for static files, Next.js internals, etc.
    '/((?!_next/static|_next/image|images|favicon.ico).*)',
  ],
}; 