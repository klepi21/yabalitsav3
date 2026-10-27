import { NextRequest, NextResponse } from 'next/server';
import { hiddenRouteRedirect } from '@/config/features';

/* Οι λειτουργίες που είναι κρυμμένες (βλ. `src/config/features.ts`) δεν
   φεύγουν μόνο από το μενού: και το άμεσο URL τους στέλνει τον χρήστη
   πίσω. Ο έλεγχος ταυτότητας γίνεται client-side στο ConditionalWrapper. */
export function proxy(request: NextRequest) {
  const target = hiddenRouteRedirect(request.nextUrl.pathname);
  if (target) {
    return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/management/:path*',
    '/coach/:path*',
    '/payment/:path*',
    '/fse',
    '/marketing',
    '/venues',
  ],
};
