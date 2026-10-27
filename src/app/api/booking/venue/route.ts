import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/api-auth';
import { venueSlug } from '@/lib/venue-slug';

/* Όλα όσα χρειάζεται η δημόσια σελίδα κρατήσεων, σε μία κλήση.
 *
 * Πριν η σελίδα διάβαζε από τον browser ΟΛΑ τα γήπεδα της πλατφόρμας για να
 * βρει το σωστό από το όνομα, και ΟΛΟ το ιστορικό κρατήσεων κάθε γηπέδου
 * (μαζί με ονόματα και τηλέφωνα πελατών). Το κόστος σε αναγνώσεις μεγάλωνε
 * με κάθε μέρα λειτουργίας και τα στοιχεία των πελατών ήταν εκτεθειμένα.
 *
 * Τώρα: ένα γήπεδο (με αποθηκευμένο slug), τα ενεργά του γήπεδα, μόνο οι
 * επερχόμενες κρατήσεις χωρίς προσωπικά στοιχεία, και οι κλειστές ημερομηνίες.
 * Η απάντηση μένει λίγα δευτερόλεπτα στο CDN· την τελική διαθεσιμότητα την
 * ελέγχει ούτως ή άλλως το /api/booking/create μέσα σε transaction. */

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' });

function toDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function findVenue(slug: string) {
  const venues = db.collection('yabalitsa_venues');
  const bySlug = await venues.where('slug', '==', slug).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0];

  // Γήπεδα από πριν υπάρξει το πεδίο slug: μία φορά πλήρης αναζήτηση,
  // και αποθήκευση του slug ώστε την επόμενη φορά να βρεθεί με το query.
  const all = await venues.get();
  const match = all.docs.find((d) => venueSlug(d.data().name) === slug);
  if (match) await match.ref.update({ slug }).catch(() => {});
  return match ?? null;
}

export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get('slug') ?? '';
    const slug = venueSlug(decodeURIComponent(raw));
    if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

    const venueDoc = await findVenue(slug);
    if (!venueDoc) return NextResponse.json({ error: 'venue_not_found' }, { status: 404 });
    const v = venueDoc.data();

    const venue = {
      id: venueDoc.id,
      name: String(v.name ?? ''),
      address: String(v.address ?? ''),
      city: String(v.city ?? ''),
      phone: String(v.phone || v.contactDetails?.phone || ''),
      email: String(v.email || v.contactDetails?.email || ''),
      bookingsEnabled: v.bookingsEnabled !== false,
    };
    if (!venue.bookingsEnabled) {
      return NextResponse.json({ venue, pitches: [], bookings: [], blocked: {} }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Από την αρχή της σημερινής ημέρας (ώρα Ελλάδας, με περιθώριο).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = dayFmt.format(new Date());

    const [pitchSnap, bookingSnap] = await Promise.all([
      db.collection('yabalitsa_pitches').where('venueId', '==', venueDoc.id).get(),
      db.collection('yabalitsa_bookings')
        .where('venueId', '==', venueDoc.id)
        .where('startTime', '>=', Timestamp.fromDate(since))
        .get(),
    ]);

    const pitches = pitchSnap.docs
      .filter((d) => d.data().active === true)
      .map((d) => {
        const p = d.data();
        return {
          id: d.id,
          name: String(p.name ?? ''),
          type: String(p.type ?? ''),
          pricePerSlot: Number(p.pricePerSlot) || 0,
          slotDuration: Number(p.slotDuration) || 60,
          defaultOpeningHours: p.defaultOpeningHours ?? {},
        };
      });

    // Μόνο ό,τι χρειάζεται για τη διαθεσιμότητα: καμία πληροφορία πελάτη.
    const bookings = bookingSnap.docs
      .map((d) => {
        const b = d.data();
        const start = toDate(b.startTime);
        const end = toDate(b.endTime);
        if (!start || !end || b.status === 'cancelled') return null;
        return { id: d.id, pitchId: String(b.pitchId), startTime: start.toISOString(), endTime: end.toISOString(), status: String(b.status) };
      })
      .filter(Boolean);

    const pitchIds = pitches.map((p) => p.id);
    const blocked: Record<string, Array<{ start: string; end: string }>> = Object.fromEntries(pitchIds.map((id) => [id, []]));
    if (pitchIds.length > 0) {
      // Το 'in' δέχεται έως 30 τιμές· ένα γήπεδο δεν έχει τόσα.
      const blockedSnap = await db.collection('yabalitsa_blockedDates').where('pitchId', 'in', pitchIds.slice(0, 30)).get();
      for (const d of blockedSnap.docs) {
        const s = toDate(d.data().startDate);
        const e = toDate(d.data().endDate);
        if (!s || !e) continue;
        const range = { start: dayFmt.format(s), end: dayFmt.format(e) };
        if (range.end >= today) blocked[String(d.data().pitchId)]?.push(range);
      }
    }

    return NextResponse.json(
      { venue, pitches, bookings, blocked },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('booking/venue error', err);
    // Δωρεάν πλάνο Firebase: εξαντλήθηκε το ημερήσιο όριο.
    if ((err as { code?: number }).code === 8) {
      return NextResponse.json({ error: 'service_busy' }, { status: 503, headers: { 'Cache-Control': 'public, s-maxage=60' } });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
