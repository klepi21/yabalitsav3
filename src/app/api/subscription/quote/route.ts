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
    const upgrade = calculateUpgrade(
      usage,
      venueData.billing,
      (venueData.daysRemaining as number) || 0
    );

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
      upgrade,
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
