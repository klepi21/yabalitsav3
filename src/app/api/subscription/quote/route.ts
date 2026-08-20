import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuth, verifyVenueAccess, isAuthError } from '@/lib/api-auth';
import { getVenueUsage } from '@/lib/venue-usage';
import {
  calculateSubscription,
  describeBreakdown,
  platformTiers,
  academyTiers,
  resolveTier,
  unitsToNextTier,
  exceedsSelfServe,
  SELF_SERVE_LIMITS,
  calculateUpgrade,
  quoteUnlock,
  pricingConfig,
} from '@/lib/pricing';

/**
 * Επιστρέφει το μέγεθος του venue και την τιμή του για κάθε διάρκεια.
 *
 * Ο πελάτης δεν διαλέγει πακέτο — βλέπει τι ΕΙΝΑΙ και τι κοστίζει. Το
 * endpoint επιστρέφει και πόσο απέχει από την επόμενη ζώνη, ώστε να μην
 * τον αιφνιδιάσει ποτέ μια αλλαγή τιμής.
 */
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

    const usage = await getVenueUsage(venueId);

    // Τι πληρώθηκε και τι χρησιμοποιείται τώρα — για τυχόν αναβάθμιση.
    const venueDoc = await db.collection('yabalitsa_venues').doc(venueId).get();
    const venueData = venueDoc.data() ?? {};
    const upgrade = calculateUpgrade(usage, venueData.billing, (venueData.daysRemaining as number) || 0);

    /* Μπλοκάρισμα ΝΕΩΝ εγγραφών που βγάζουν τον πελάτη εκτός της ζώνης
       που έχει πληρώσει. Υπολογίζουμε και το κόστος ξεκλειδώματος, ώστε
       η οθόνη να δείχνει ακριβώς τι κοστίζει η προσθήκη. */
    const billed = venueData.billing;
    const days = (venueData.daysRemaining as number) || 0;

    const nextPitch = quoteUnlock(usage, billed, days, { pitches: usage.pitches + 1 });
    const nextAthlete = quoteUnlock(usage, billed, days, { athletes: usage.athletes + 1 });

    const durations = [1, 6, 12] as const;

    const quotes = durations.map((d) => {
      const breakdown = calculateSubscription(usage, d);
      return { duration: d, ...breakdown, ...describeBreakdown(breakdown) };
    });


    const platformTier = resolveTier(platformTiers, usage.pitches);
    const academyTier = usage.hasAcademy ? resolveTier(academyTiers, usage.athletes) : null;

    return NextResponse.json({
      success: true,
      usage,
      limits: SELF_SERVE_LIMITS,
      /* Το top bar ζει στο layout και δεν ξαναφορτώνεται στις πλοηγήσεις.
         Παίρνοντας την κατάσταση από εδώ, μοιράζεται την ίδια cache με
         τις υπόλοιπες οθόνες και ανανεώνεται μαζί τους. */
      venue: {
        plan: venueData.plan ?? null,
        planType: venueData.planType ?? null,
        daysRemaining: venueData.daysRemaining ?? 0,
        active: venueData.active !== false,
      },
      upgrade,
      // Χρειάζεται πληρωμή για να προστεθεί η επόμενη εγγραφή;
      pitchNeedsUnlock: nextPitch.owed,
      pitchUnlockAmount: nextPitch.amountWithVat,
      athleteNeedsUnlock: nextAthlete.owed,
      athleteUnlockAmount: nextAthlete.amountWithVat,
      /* Τι πληρώνει σήμερα: η βάση που αγοράστηκε, με την έκπτωση που
         ίσχυσε και ΦΠΑ. `null` όταν δεν υπάρχει στιγμιότυπο (δοκιμή). */
      billedMonthly: venueData.billing
        ? venueData.billing.monthlyBase *
          (1 - venueData.billing.discountPercent / 100) *
          (1 + pricingConfig.vatRate)
        : null,
      // «At limit» = έφτασε το όριο, άρα δεν επιτρέπεται ΝΕΑ δημιουργία.
      atPitchLimit: usage.pitches >= SELF_SERVE_LIMITS.pitches,
      atAthleteLimit: usage.hasAcademy && usage.athletes >= SELF_SERVE_LIMITS.athletes,
      requiresContact: exceedsSelfServe(usage),
      quotes,
      headroom: {
        pitchesToNextTier: unitsToNextTier(platformTiers, usage.pitches),
        athletesToNextTier: usage.hasAcademy ? unitsToNextTier(academyTiers, usage.athletes) : null,
        platformTierLabel: platformTier.label,
        academyTierLabel: academyTier?.label ?? null,
      },
      tiers: { platform: platformTiers, academy: academyTiers },
    });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to build quote' },
      { status: 500 }
    );
  }
}
