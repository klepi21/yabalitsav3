import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import path from 'path';

// Initialize Firebase Admin if not already done
if (!getApps().length) {
  initializeApp({
    credential: cert(
      path.join(process.cwd(), process.env.FIREBASE_ADMIN_KEY_PATH || 'yabalitsa-6f5e8-firebase-adminsdk-fbsvc-c8cc60c683.json')
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
    try {
      await auth.verifyIdToken(token);
    } catch {
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
      {
        success: true,
        bookings,
        pitches,
        payments,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}

