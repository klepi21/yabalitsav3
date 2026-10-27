import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/api-auth';

/* Οι κλειστές ημερομηνίες ενός γηπέδου για τη δημόσια σελίδα κρατήσεων.
 * Η συλλογή δεν διαβάζεται από επισκέπτες (κανόνες Firestore), οπότε η
 * σελίδα έδειχνε ως ελεύθερες ώρες που το γήπεδο είχε κλείσει. Επιστρέφονται
 * μόνο οι ημερομηνίες (ώρα Αθήνας), χωρίς την αιτία. */

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

export async function GET(request: Request) {
  try {
    const pitchId = new URL(request.url).searchParams.get('pitchId');
    if (!pitchId) return NextResponse.json({ error: 'missing_pitch' }, { status: 400 });

    const today = dayFmt.format(new Date());
    const snap = await db.collection('yabalitsa_blockedDates').where('pitchId', '==', pitchId).get();
    const blocked = snap.docs
      .map((doc) => {
        const s = toDate(doc.data().startDate);
        const e = toDate(doc.data().endDate);
        return s && e ? { start: dayFmt.format(s), end: dayFmt.format(e) } : null;
      })
      .filter((b): b is { start: string; end: string } => !!b && b.end >= today);

    return NextResponse.json({ blocked }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('booking/availability error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
