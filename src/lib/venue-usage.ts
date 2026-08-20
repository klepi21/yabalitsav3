import { db } from '@/lib/api-auth';
import type { UsageSnapshot } from '@/lib/pricing';

/**
 * Μετράει το πραγματικό μέγεθος ενός venue.
 *
 * ── Γιατί ΔΕΝ μετράμε την κατηγορία χρήστη ──────────────────────────────
 * Η πρώτη υλοποίηση μετρούσε όσους ανήκαν σε κατηγορία με δυνατότητα
 * `squad_assignment`. Αυτό ήταν τρωτό: την κατηγορία και τις δυνατότητές
 * της τις ορίζει ο ΙΔΙΟΣ ο πελάτης. Μπορούσε να φτιάξει κατηγορία χωρίς
 * αυτή τη δυνατότητα, να βάλει εκεί τους αθλητές του, και να μηδενίσει
 * τον λογαριασμό του με δύο κλικ.
 *
 * ── Τι μετράμε αντ' αυτού ───────────────────────────────────────────────
 * Μετράμε ΣΥΝΕΠΕΙΑ, όχι ετικέτα: έναν χρήστη τον θεωρούμε αθλητή αν
 * υπάρχει έστω ένα ίχνος ότι τον διαχειρίζεται ως αθλητή —
 *
 *   1. είναι ανατεθειμένος σε τμήμα,
 *   2. έχει εγγραφή μηνιαίας πληρωμής,
 *   3. έχει αξιολόγηση.
 *
 * Για να αποφύγει τη χρέωση θα πρέπει να μην τον βάλει σε τμήμα, να μην
 * του καταγράψει πληρωμή και να μην τον αξιολογήσει — δηλαδή να μη
 * χρησιμοποιεί καθόλου την ακαδημία γι' αυτόν. Τότε σωστά δεν χρεώνεται.
 *
 * Ως παράπλευρο όφελος, αρχειοθετημένοι αθλητές χωρίς τμήμα και χωρίς
 * πληρωμές παύουν να μετρώνται — ο πελάτης δεν πληρώνει για νεκρές
 * εγγραφές.
 *
 * Σημείωση: οι προπονητές συνδέονται με τμήματα μέσω `assigned_squads`,
 * διαφορετικό πεδίο, οπότε δεν μπερδεύονται με αθλητές.
 */
export async function getVenueUsage(venueId: string): Promise<UsageSnapshot> {
  const [pitchesSnap, groupsSnap, usersSnap, paymentsSnap, evalsSnap] = await Promise.all([
    db.collection('yabalitsa_pitches').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_user_groups').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_academy_users').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_academy_payments').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_player_evaluations').where('venueId', '==', venueId).get(),
  ]);

  const pitches = pitchesSnap.docs.filter((d) => d.data().active !== false).length;

  const paidUserIds = new Set(
    paymentsSnap.docs.map((d) => d.data().userId as string | undefined).filter(Boolean)
  );
  const evaluatedUserIds = new Set(
    evalsSnap.docs
      .map((d) => (d.data().userId ?? d.data().athleteId) as string | undefined)
      .filter(Boolean)
  );

  const athletes = usersSnap.docs.filter((d) => {
    const u = d.data();
    const inSquad = !!(u.squad_id || (Array.isArray(u.squad_ids) && u.squad_ids.length > 0));
    return inSquad || paidUserIds.has(d.id) || evaluatedUserIds.has(d.id);
  }).length;

  // Το module ακαδημίας χρεώνεται μόνο εφόσον χρησιμοποιείται πραγματικά.
  const hasAcademy = usersSnap.size > 0 || groupsSnap.size > 0;

  return { pitches, athletes, hasAcademy };
}
