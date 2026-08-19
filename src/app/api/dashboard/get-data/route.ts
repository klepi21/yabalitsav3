import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuth, verifyVenueAccess, isAuthError } from '@/lib/api-auth';

/**
 * Το dashboard δείχνει μόνο «τρέχουσες», «σημερινές» και επερχόμενες
 * κρατήσεις — καμία ιστορική άθροιση. Δεν υπάρχει λόγος να κατεβαίνει
 * ολόκληρο το ιστορικό του γηπέδου σε κάθε φόρτωση.
 */
const LOOKBACK_DAYS = 7;

function isMissingIndex(err: unknown): boolean {
  const e = err as { code?: number | string; message?: string };
  return e?.code === 9 || e?.code === 'failed-precondition' || !!e?.message?.includes('requires an index');
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const { venueId } = await request.json();
    if (!venueId) {
      return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
    }

    const accessError = await verifyVenueAccess(venueId, authResult.decodedToken);
    if (accessError) return accessError;

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Τα τρία queries έτρεχαν σειριακά — τώρα παράλληλα.
    const [bookingsSnapshot, pitchesSnapshot, venueSnapshot] = await Promise.all([
      db
        .collection('yabalitsa_bookings')
        .where('venueId', '==', venueId)
        .where('startTime', '>=', since)
        .get()
        .catch(async (err) => {
          if (!isMissingIndex(err)) throw err;
          // Εφεδρεία όσο χτίζεται το composite index.
          return db.collection('yabalitsa_bookings').where('venueId', '==', venueId).get();
        }),
      db.collection('yabalitsa_pitches').where('venueId', '==', venueId).get(),
      db.collection('yabalitsa_venues').doc(venueId).get(),
    ]);

    const bookings = bookingsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate?.().toISOString() || new Date().toISOString(),
        endTime: data.endTime?.toDate?.().toISOString() || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    const pitches = pitchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    const venue = venueSnapshot.exists ? {
      id: venueSnapshot.id,
      ...venueSnapshot.data(),
      createdAt: venueSnapshot.data()?.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      updatedAt: venueSnapshot.data()?.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
    } : null;

    return NextResponse.json(
      { success: true, bookings, pitches, venue },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
