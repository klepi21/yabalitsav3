import { NextRequest, NextResponse } from 'next/server';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/fse',
  '/venues',
  '/for-venues',
  '/book',
  '/terms',
  '/privacy',
  '/venue-login',
  '/payment/checkout',
  '/api/verification',
  '/api/stripe',
  '/api/booking/finalize',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    if (route.endsWith('/')) {
      return pathname === route || pathname.startsWith(route);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });

  // If it's a public route, allow it
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If it's not public and not in API/static routes, check authentication
  if (!pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    // Middleware in Next.js 13+ doesn't have direct access to Firebase auth state
    // We rely on the ConditionalWrapper component for client-side auth checks
    // This middleware mainly handles basic route structure
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webp).*)',
  ],
};

