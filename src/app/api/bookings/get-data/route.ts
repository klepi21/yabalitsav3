import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import path from 'path';

// Initialize Firebase Admin if not already done
if (!getApps().length) {
  initializeApp({
    credential: cert(
      path.join(process.cwd(), 'yabalitsa-6f5e8-firebase-adminsdk-fbsvc-c8cc60c683.json')
    ),
  });
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { venueId } = body;

    if (!venueId) {
      return NextResponse.json(
        { error: 'Missing venueId' },
        { status: 400 }
      );
    }

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
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    // Fetch bookings for this venue
    const bookingsSnapshot = await db
      .collection('yabalitsa_bookings')
      .where('venueId', '==', venueId)
      .get();

    const bookings = bookingsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate?.().toISOString() || new Date().toISOString(),
        endTime: data.endTime?.toDate?.().toISOString() || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    // Fetch blocked dates for this venue
    const blockedDatesSnapshot = await db
      .collection('yabalitsa_blockedSlots')
      .where('venueId', '==', venueId)
      .get();

    const blockedDates = blockedDatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.().toISOString() || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json(
      {
        success: true,
        pitches,
        bookings,
        blockedDates,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching new booking data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch new booking data' },
      { status: 500 }
    );
  }
}

