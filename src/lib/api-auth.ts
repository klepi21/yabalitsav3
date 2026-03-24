import { NextRequest, NextResponse } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import path from 'path';

// Initialize Firebase Admin if not already done
if (!getApps().length) {
  initializeApp({
    credential: cert(
      path.join(process.cwd(), process.env.FIREBASE_ADMIN_KEY_PATH!)
    ),
  });
}

const db = getFirestore();
const auth = getAuth();

export { db, auth };

interface AuthResult {
  decodedToken: DecodedIdToken;
}

interface AuthError {
  response: NextResponse;
}

/**
 * Verify Firebase auth token from request header.
 * Returns decoded token or an error response ready to return.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      response: NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return { decodedToken };
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    };
  }
}

/**
 * Verify that the authenticated user has access to the given venue.
 * Checks if user is the venue owner OR a coach assigned to that venue.
 */
export async function verifyVenueAccess(
  venueId: string,
  decodedToken: DecodedIdToken
): Promise<NextResponse | null> {
  const venueDoc = await db.collection('yabalitsa_venues').doc(venueId).get();

  if (!venueDoc.exists) {
    return NextResponse.json(
      { error: 'Venue not found' },
      { status: 404 }
    );
  }

  // Owner check
  if (venueDoc.data()?.ownerId === decodedToken.uid) {
    return null; // authorized
  }

  // Coach check
  const coachSnapshot = await db
    .collection('yabalitsa_venueOwners')
    .where('venueId', '==', venueId)
    .where('email', '==', decodedToken.email)
    .limit(1)
    .get();

  if (!coachSnapshot.empty) {
    return null; // authorized
  }

  return NextResponse.json(
    { error: 'Unauthorized: you do not have access to this venue' },
    { status: 403 }
  );
}

/**
 * Helper: checks if result is an error (has .response)
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'response' in result;
}
