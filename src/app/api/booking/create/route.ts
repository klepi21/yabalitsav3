import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/api-auth';
import { consumeVerificationCode } from '@/lib/verification-storage';
import { sendEmail, emailTemplates } from '@/lib/email-service';

/* Δημόσια online κράτηση από τη σελίδα του γηπέδου.
 *
 * Πριν η σελίδα έγραφε απευθείας στη Firestore από τον browser. Οι κανόνες
 * ζητούν σύνδεση για πελάτες και κρατήσεις, οπότε για επισκέπτη η κράτηση
 * αποτύγχανε. Επιπλέον ο browser κατέβαζε ΟΛΟΥΣ τους πελάτες όλων των
 * γηπέδων για να βρει αν υπάρχει ο αριθμός τηλεφώνου.
 *
 * Τώρα όλα γίνονται εδώ, με το Admin SDK και χωρίς εμπιστοσύνη στον client:
 * επαλήθευση κωδικού email, ωράριο γηπέδου, κλειστές ημερομηνίες και έλεγχος
 * επικάλυψης μέσα σε transaction (δύο ταυτόχρονες κρατήσεις για την ίδια ώρα
 * δεν περνάνε και οι δύο). */

const TZ = 'Europe/Athens';
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Απλό rate limit ανά IP: 10 προσπάθειες κράτησης ανά 10 λεπτά.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

/** Λεπτά διαφοράς ώρας Αθήνας από UTC τη συγκεκριμένη στιγμή (θερινή/χειμερινή ώρα). */
function athensOffsetMinutes(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Τοπική ώρα Αθήνας -> πραγματική στιγμή. Ο server τρέχει σε UTC. */
function athensToDate(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - athensOffsetMinutes(new Date(guess)) * 60000;
  const corrected = guess - athensOffsetMinutes(new Date(t)) * 60000;
  if (corrected !== t) t = corrected;
  return new Date(t);
}

/** 'YYYY-MM-DD' της ημέρας στην Αθήνα. */
function athensDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

function toMinutes(hhmm: string): number {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Τα παράθυρα λειτουργίας μιας ημέρας, από όποια μορφή κι αν έχει αποθηκευτεί. */
function openingWindows(hours: unknown): Array<{ start: string; end: string }> {
  if (!hours || typeof hours !== 'object') return [];
  const h = hours as Record<string, unknown>;
  if (Array.isArray(h.slots)) return h.isOpen === false ? [] : (h.slots as Array<{ start: string; end: string }>);
  if (h.start && h.end) return [{ start: String(h.start), end: String(h.end) }];
  if (h.isOpen && h.open && h.close) return [{ start: String(h.open), end: String(h.close) }];
  return [];
}

function toDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

type Body = {
  venueId?: string;
  pitchId?: string;
  date?: string; // YYYY-MM-DD, ώρα Αθήνας
  time?: string; // HH:MM, ώρα Αθήνας
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  code?: string;
};

const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    if (isRateLimited(ip)) return fail('too_many_requests', 429);

    const body = (await request.json()) as Body;
    const venueId = body.venueId?.trim();
    const pitchId = body.pitchId?.trim();
    const date = body.date?.trim() ?? '';
    const time = body.time?.trim() ?? '';
    const firstName = body.firstName?.trim() ?? '';
    const lastName = body.lastName?.trim() ?? '';
    const phone = body.phone?.replace(/\s+/g, '') ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const code = body.code?.trim() ?? '';

    if (!venueId || !pitchId || !firstName || !lastName || !code) return fail('missing_required_fields');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return fail('invalid_slot');
    if (!/^6\d{9}$/.test(phone)) return fail('invalid_phone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('invalid_email');
    if (firstName.length > 60 || lastName.length > 60) return fail('invalid_name');

    const [venueSnap, pitchSnap] = await Promise.all([
      db.collection('yabalitsa_venues').doc(venueId).get(),
      db.collection('yabalitsa_pitches').doc(pitchId).get(),
    ]);
    const venue = venueSnap.data();
    const pitch = pitchSnap.data();
    if (!venue) return fail('venue_not_found', 404);
    if (venue.bookingsEnabled === false) return fail('bookings_disabled', 403);
    if (!pitch || pitch.venueId !== venueId || pitch.active === false) return fail('pitch_not_found', 404);

    const slotDuration = Number(pitch.slotDuration) || 60;
    const price = Number(pitch.pricePerSlot) || 0;
    const start = athensToDate(date, time);
    const end = new Date(start.getTime() + slotDuration * 60000);
    if (isNaN(start.getTime())) return fail('invalid_slot');

    // Όχι στο παρελθόν. Η σελίδα κρύβει ώρες λιγότερο από μία ώρα μπροστά·
    // εδώ αφήνουμε περιθώριο για όσο συμπληρώνει τη φόρμα.
    if (start.getTime() < Date.now() + 15 * 60000) return fail('slot_in_past');

    // Μέσα στο ωράριο του γηπέδου εκείνη την ημέρα.
    const [y, m, d] = date.split('-').map(Number);
    const dayKey = DAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    const windows = openingWindows(pitch.defaultOpeningHours?.[dayKey]);
    const startMin = toMinutes(time);
    if (!windows.some((w) => startMin >= toMinutes(w.start) && startMin < toMinutes(w.end))) {
      return fail('outside_opening_hours');
    }

    // Κλειστές ημερομηνίες (και όσες δημιουργούν τα τουρνουά): μπλοκάρουν όλη την ημέρα.
    const blockedSnap = await db.collection('yabalitsa_blockedDates').where('pitchId', '==', pitchId).get();
    const isBlocked = blockedSnap.docs.some((doc) => {
      const bs = toDate(doc.data().startDate);
      const be = toDate(doc.data().endDate);
      if (!bs || !be) return false;
      return date >= athensDay(bs) && date <= athensDay(be);
    });
    if (isBlocked) return fail('date_blocked', 409);

    /* Ο κωδικός καταναλώνεται ΜΕΤΑ τους ελέγχους της ώρας: αν η ώρα δεν
       είναι διαθέσιμη, ο πελάτης διαλέγει άλλη χωρίς να ζητήσει νέο κωδικό.
       Αποθηκεύεται με το email όπως το έστειλε η φόρμα. */
    const verification = await consumeVerificationCode(body.email!.trim(), code);
    if (!verification.ok) {
      return fail(verification.error, verification.error === 'too_many_attempts' ? 429 : 400, {
        ...(verification.attemptsRemaining !== undefined && { attemptsRemaining: verification.attemptsRemaining }),
      });
    }

    // Πελάτης: ένας ανά τηλέφωνο, όπως και στη διαχείριση.
    const customers = db.collection('yabalitsa_customers');
    const existing = await customers.where('phone', '==', phone).limit(1).get();
    let customerId: string;
    if (!existing.empty) {
      customerId = existing.docs[0].id;
      await existing.docs[0].ref.update({
        venueIds: FieldValue.arrayUnion(venueId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const ref = await customers.add({
        name: `${firstName} ${lastName}`,
        email,
        phone,
        venueIds: [venueId],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      customerId = ref.id;
    }

    // Έλεγχος επικάλυψης και εγγραφή στο ίδιο transaction.
    const bookings = db.collection('yabalitsa_bookings');
    const bookingRef = bookings.doc();
    const conflict = await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookings.where('pitchId', '==', pitchId));
      const overlaps = snap.docs.some((doc) => {
        const b = doc.data();
        if (b.status === 'cancelled') return false;
        const bs = toDate(b.startTime);
        const be = toDate(b.endTime);
        return !!bs && !!be && bs < end && be > start;
      });
      if (overlaps) return true;
      tx.set(bookingRef, {
        slotId: '',
        pitchId,
        venueId,
        userId: customerId,
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        userPhone: phone,
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        price,
        status: 'pending',
        notes: '',
        origin: 'online',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return false;
    });
    if (conflict) return fail('slot_taken', 409);

    // Email στον πελάτη. Αν αποτύχει, η κράτηση έχει ήδη γίνει.
    try {
      const template = emailTemplates.bookingConfirmation({
        firstName,
        lastName,
        email,
        phone,
        pitchName: String(pitch.name || ''),
        venueName: String(venue.name || ''),
        venuePhone: venue.phone || venue.contactDetails?.phone,
        venueEmail: venue.email || venue.contactDetails?.email,
        venueAddress: venue.address,
        date: start.toLocaleDateString('el-GR', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time,
        price,
      });
      const result = await sendEmail({ to: email, subject: template.subject, html: template.html });
      if (!result.success) console.error('booking/create: confirmation email failed', result.error);
    } catch (emailError) {
      console.error('booking/create: confirmation email error', emailError);
    }

    return NextResponse.json({ ok: true, bookingId: bookingRef.id });
  } catch (err) {
    console.error('booking/create error', err);
    return fail('internal_error', 500);
  }
}
