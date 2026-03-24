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

    // Fetch pitches for this venue
    const pitchesSnapshot = await db
      .collection('yabalitsa_pitches')
      .where('venueId', '==', venueId)
      .get();

    const pitches = pitchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        active: data.active ?? true,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({ success: true, pitches }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching pitches:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch pitches' },
      { status: 500 }
    );
  }
}
