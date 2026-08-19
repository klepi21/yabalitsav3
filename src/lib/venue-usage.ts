import { db } from '@/lib/api-auth';
import type { UsageSnapshot } from '@/lib/pricing';

/**
 * Μετράει το πραγματικό μέγεθος ενός venue, ώστε η τιμολόγηση να
 * προκύπτει από τα δεδομένα και όχι από δήλωση του πελάτη.
 *
 * Η μέτρηση είναι σκόπιμα ΣΥΝΤΗΡΗΤΙΚΗ: μετρώνται μόνο ενεργά γήπεδα και
 * μόνο χρήστες που ανήκουν σε κατηγορία με δυνατότητα `squad_assignment`
 * (δηλαδή αθλητές — όχι γονείς, όχι προπονητές). Ίδιος ορισμός με τον
 * μετρητή «Αθλητές» στον πίνακα ελέγχου, ώστε ο αριθμός στον λογαριασμό
 * να συμφωνεί με αυτόν που βλέπει ο πελάτης στην οθόνη του.
 */
export async function getVenueUsage(venueId: string): Promise<UsageSnapshot> {
  const [pitchesSnap, groupsSnap, usersSnap] = await Promise.all([
    db.collection('yabalitsa_pitches').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_user_groups').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_academy_users').where('venueId', '==', venueId).get(),
  ]);

  const pitches = pitchesSnap.docs.filter((d) => d.data().active !== false).length;

  const athleteGroupIds = new Set(
    groupsSnap.docs
      .filter((d) => (d.data().capabilities as string[] | undefined)?.includes('squad_assignment'))
      .map((d) => d.id)
  );

  const athletes = usersSnap.docs.filter((d) => athleteGroupIds.has(d.data().groupId)).length;

  // Το module ακαδημίας χρεώνεται μόνο εφόσον χρησιμοποιείται πραγματικά.
  const hasAcademy = usersSnap.size > 0 || groupsSnap.size > 0;

  return { pitches, athletes, hasAcademy };
}
