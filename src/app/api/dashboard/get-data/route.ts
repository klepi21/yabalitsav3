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

    return NextResponse.json(
      {
        success: true,
        bookings,
        pitches,
        venue,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

