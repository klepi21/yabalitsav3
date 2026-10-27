import { NextRequest, NextResponse } from 'next/server';
import { FEATURES } from '@/config/features';
import { db, verifyAuth, verifyVenueAccess, isAuthError } from '@/lib/api-auth';

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

    /* Η μεγαλύτερη περίοδος των αναφορών είναι «Έτος» (τελευταίοι 12 μήνες).
       Παλαιότερες κρατήσεις δεν εμφανίζονται πουθενά, οπότε δεν διαβάζονται. */
    const since = new Date();
    since.setMonth(since.getMonth() - 13);
    const bookingsSnapshot = await db
      .collection('yabalitsa_bookings')
      .where('venueId', '==', venueId)
      .where('startTime', '>=', since)
      .get();

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

    // Fetch pitches for this venue
    const pitchesSnapshot = await db
      .collection('yabalitsa_pitches')
      .where('venueId', '==', venueId)
      .get();

    const pitches = pitchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    // Fetch payments for this venue
    // Κρυμμένες λειτουργίες (βλ. src/config/features.ts): δεν διαβάζονται καν.
    const empty = { docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] };
    const paymentsSnapshot = FEATURES.billing
      ? await db.collection('yabalitsa_payments').where('venueId', '==', venueId).get()
      : empty;

    const payments = paymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    // Fetch ALL academy payments for this venue (paid + unpaid for full stats)
    const academyPaymentsSnapshot = FEATURES.academy
      ? await db.collection('yabalitsa_academy_payments').where('venueId', '==', venueId).get()
      : empty;

    const academyPayments = academyPaymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paidAt: data.paidAt || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // Fetch squads for grouping
    const squadsSnapshot = FEATURES.academy
      ? await db.collection('yabalitsa_squads').where('venueId', '==', venueId).get()
      : empty;

    const squads = squadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch academy users for squad mapping
    const academyUsersSnapshot = FEATURES.academy
      ? await db.collection('yabalitsa_academy_users').where('venueId', '==', venueId).get()
      : empty;

    const academyUsers = academyUsersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName || '',
        groupId: data.groupId || '',
        squad_ids: data.squad_ids || (data.squad_id ? [data.squad_id] : []),
      };
    });

    return NextResponse.json(
      { success: true, bookings, pitches, payments, academyPayments, squads, academyUsers },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}
