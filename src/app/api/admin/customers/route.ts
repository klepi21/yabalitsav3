import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuth, isAuthError } from '@/lib/api-auth';

const SUPER_ADMIN_EMAIL = 'nikoskoukis99@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    // Only super admin can access this endpoint
    if (authResult.decodedToken.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized: super admin access only' },
        { status: 403 }
      );
    }

    // Fetch all venues
    const venuesSnapshot = await db.collection('yabalitsa_venues').get();
    const venues = venuesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        city: data.city || '',
        email: data.email || '',
        phone: data.phone || '',
        ownerId: data.ownerId || '',
        plan: data.plan || 'trial',
        planType: data.planType || null,
        daysRemaining: data.daysRemaining ?? null,
        subscriptionEndDate: data.subscriptionEndDate || null,
        active: data.active !== false,
        bookingsEnabled: data.bookingsEnabled !== false,
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
      };
    });

    // Fetch counts in parallel for all collections
    const [
      pitchesSnapshot,
      bookingsSnapshot,
      customersSnapshot,
      academyUsersSnapshot,
      squadsSnapshot,
      paymentsSnapshot,
      venueOwnersSnapshot,
    ] = await Promise.all([
      db.collection('yabalitsa_pitches').get(),
      db.collection('yabalitsa_bookings').get(),
      db.collection('yabalitsa_customers').get(),
      db.collection('yabalitsa_academy_users').get(),
      db.collection('yabalitsa_squads').get(),
      db.collection('yabalitsa_payments').get(),
      db.collection('yabalitsa_venueOwners').get(),
    ]);

    // Group counts by venueId
    const countByVenue = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
      const map: Record<string, number> = {};
      for (const doc of docs) {
        const vid = doc.data().venueId;
        if (vid) map[vid] = (map[vid] || 0) + 1;
      }
      return map;
    };

    const pitchCounts = countByVenue(pitchesSnapshot.docs);
    const bookingCounts = countByVenue(bookingsSnapshot.docs);
    const academyUserCounts = countByVenue(academyUsersSnapshot.docs);
    const squadCounts = countByVenue(squadsSnapshot.docs);
    const paymentCounts = countByVenue(paymentsSnapshot.docs);

    // Customer counts need special handling (customers have venueIds array)
    const customerCounts: Record<string, number> = {};
    for (const doc of customersSnapshot.docs) {
      const vids = doc.data().venueIds || [];
      for (const vid of vids) {
        if (vid) customerCounts[vid] = (customerCounts[vid] || 0) + 1;
      }
    }

    // Staff counts (venue owners/coaches per venue)
    const staffCounts = countByVenue(venueOwnersSnapshot.docs);

    // Get last booking date per venue
    const lastBookingByVenue: Record<string, string> = {};
    for (const doc of bookingsSnapshot.docs) {
      const data = doc.data();
      const vid = data.venueId;
      const created = data.createdAt?.toDate?.().toISOString();
      if (vid && created) {
        if (!lastBookingByVenue[vid] || created > lastBookingByVenue[vid]) {
          lastBookingByVenue[vid] = created;
        }
      }
    }

    // Revenue per venue (sum of succeeded payments)
    const revenueByVenue: Record<string, number> = {};
    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data();
      if (data.status === 'succeeded' && data.venueId) {
        revenueByVenue[data.venueId] = (revenueByVenue[data.venueId] || 0) + (data.amount || 0);
      }
    }

    // Build venue details with stats
    const venueDetails = venues.map(venue => ({
      ...venue,
      stats: {
        pitches: pitchCounts[venue.id] || 0,
        bookings: bookingCounts[venue.id] || 0,
        customers: customerCounts[venue.id] || 0,
        academyUsers: academyUserCounts[venue.id] || 0,
        squads: squadCounts[venue.id] || 0,
        staff: staffCounts[venue.id] || 0,
        payments: paymentCounts[venue.id] || 0,
        revenue: revenueByVenue[venue.id] || 0,
        lastBooking: lastBookingByVenue[venue.id] || null,
      },
    }));

    // Global KPIs
    const kpis = {
      totalVenues: venues.length,
      activeVenues: venues.filter(v => v.active).length,
      expiredVenues: venues.filter(v => !v.active).length,
      trialVenues: venues.filter(v => v.plan === 'trial' && v.active).length,
      totalBookings: bookingsSnapshot.size,
      totalCustomers: customersSnapshot.size,
      totalAcademyUsers: academyUsersSnapshot.size,
      totalRevenue: Object.values(revenueByVenue).reduce((sum, v) => sum + v, 0),
      newVenuesThisMonth: venues.filter(v => {
        if (!v.createdAt) return false;
        const d = new Date(v.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    };

    return NextResponse.json({ success: true, venues: venueDetails, kpis }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching admin data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch admin data' },
      { status: 500 }
    );
  }
}
