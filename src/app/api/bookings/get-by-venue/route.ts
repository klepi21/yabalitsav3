import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuth, verifyVenueAccess, isAuthError } from '@/lib/api-auth';
import type { Query } from 'firebase-admin/firestore';

/** Πόσο πίσω κοιτάμε όταν δεν ζητηθεί ρητό εύρος. */
const DEFAULT_WINDOW_DAYS = 90;

const iso = (v: { toDate?: () => Date } | undefined) =>
  v?.toDate?.().toISOString() ?? new Date().toISOString();

/** Το Firestore πετάει FAILED_PRECONDITION όσο χτίζεται ένα composite index. */
function isMissingIndex(err: unknown): boolean {
  const e = err as { code?: number | string; message?: string };
  return e?.code === 9 || e?.code === 'failed-precondition' || !!e?.message?.includes('requires an index');
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const { venueId, from, to, status, limit } = await request.json();
    if (!venueId) {
      return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
    }

    const accessError = await verifyVenueAccess(venueId, authResult.decodedToken);
    if (accessError) return accessError;

    const bookingsRef = db.collection('yabalitsa_bookings');

    /* ---------------------------------------------------------------- *
     * Λειτουργία «καμπανάκι»: λίγες εκκρεμείς κρατήσεις.
     *
     * Το top bar καλούσε το ίδιο endpoint σε ΚΑΘΕ πλοήγηση και κατέβαζε
     * ολόκληρο το ιστορικό του γηπέδου για να δείξει 5 γραμμές.
     * ---------------------------------------------------------------- */
    if (status) {
      const take = Math.min(Number(limit) || 5, 50);
      let docs;
      try {
        docs = (
          await bookingsRef
            .where('venueId', '==', venueId)
            .where('status', '==', status)
            .orderBy('startTime', 'desc')
            .limit(take)
            .get()
        ).docs;
      } catch (err) {
        if (!isMissingIndex(err)) throw err;
        // Εφεδρεία όσο χτίζεται το index: φιλτράρισμα στη μνήμη.
        const all = await bookingsRef.where('venueId', '==', venueId).get();
        docs = all.docs
          .filter((d) => d.data().status === status)
          .sort((a, b) => (b.data().startTime?.toMillis?.() ?? 0) - (a.data().startTime?.toMillis?.() ?? 0))
          .slice(0, take);
      }

      return NextResponse.json({
        success: true,
        bookings: docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          startTime: iso(doc.data().startTime),
          endTime: iso(doc.data().endTime),
          createdAt: iso(doc.data().createdAt),
          updatedAt: iso(doc.data().updatedAt),
        })),
        pitches: [],
        blockedDates: [],
      });
    }

    /* ---------------------------------------------------------------- *
     * Κανονική λειτουργία: χρονικό παράθυρο αντί για «όλα από πάντα».
     *
     * Ένα γήπεδο με τριετία δεδομένων κατέβαζε ~15.000 έγγραφα σε κάθε
     * άνοιγμα. Με το προεπιλεγμένο παράθυρο πέφτει σε ~1.500, ενώ
     * αναζήτηση/φίλτρα/μετρητές συνεχίζουν να δουλεύουν στη μνήμη.
     * ---------------------------------------------------------------- */
    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const windowed = !from || !Number.isNaN(fromDate.getTime());

    let bookingsQuery: Query = bookingsRef.where('venueId', '==', venueId);
    if (windowed) bookingsQuery = bookingsQuery.where('startTime', '>=', fromDate);
    if (to) bookingsQuery = bookingsQuery.where('startTime', '<=', new Date(to));

    // Τα τρία queries έτρεχαν σειριακά — τώρα παράλληλα.
    const [bookingsSnap, pitchesSnap, blockedSnap, olderSnap] = await Promise.all([
      bookingsQuery.get().catch(async (err) => {
        if (!isMissingIndex(err)) throw err;
        // Εφεδρεία όσο χτίζεται το index.
        return bookingsRef.where('venueId', '==', venueId).get();
      }),
      db.collection('yabalitsa_pitches').where('venueId', '==', venueId).get(),
      db.collection('yabalitsa_blockedSlots').where('venueId', '==', venueId).get(),
      // Μία φθηνή ανάγνωση: υπάρχει κάτι παλαιότερο από το παράθυρο;
      windowed
        ? bookingsRef
            .where('venueId', '==', venueId)
            .where('startTime', '<', fromDate)
            .limit(1)
            .get()
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const bookings = bookingsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: iso(data.startTime),
        endTime: iso(data.endTime),
        createdAt: iso(data.createdAt),
        updatedAt: iso(data.updatedAt),
      };
    });

    const pitches = pitchesSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          active: data.active ?? true,
          createdAt: iso(data.createdAt),
          updatedAt: iso(data.updatedAt),
        };
      })
      .filter((pitch) => pitch.active !== false);

    const blockedDates = blockedSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: iso(data.date),
        createdAt: iso(data.createdAt),
        updatedAt: iso(data.updatedAt),
      };
    });

    return NextResponse.json(
      {
        success: true,
        bookings,
        pitches,
        blockedDates,
        hasMore: !!olderSnap && !olderSnap.empty,
        windowFrom: windowed ? fromDate.toISOString() : null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
