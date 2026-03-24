import { NextRequest, NextResponse } from 'next/server';
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

    // Fetch venue data
    const venueSnapshot = await db
      .collection('yabalitsa_venues')
      .doc(venueId)
      .get();

    const venue = venueSnapshot.exists ? {
      id: venueSnapshot.id,
      ...venueSnapshot.data(),
      createdAt: venueSnapshot.data()?.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      updatedAt: venueSnapshot.data()?.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
    } : null;

    // Fetch payments for this venue
    const paymentsSnapshot = await db
      .collection('yabalitsa_payments')
      .where('venueId', '==', venueId)
      .get();

    const payments = paymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json(
      { success: true, venue, payments },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error fetching settings data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch settings data' },
      { status: 500 }
    );
  }
}
