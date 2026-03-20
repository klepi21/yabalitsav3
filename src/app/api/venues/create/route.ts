import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const body = await request.json();

    const {
      venueName,
      venueAddress,
      venueCity,
      venueEmail,
      venuePhone,
      venueAfm,
      venueDoy,
      ownerName,
      ownerEmail,
      ownerPhone,
      plan = 'trial',
    } = body;

    // Validate required fields
    if (!venueName || !venueAddress || !venueCity || !venueAfm || !ownerName || !ownerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create venue document
    const venueDocRef = await db.collection('yabalitsa_venues').add({
      name: venueName,
      address: venueAddress,
      city: venueCity,
      contactDetails: {
        email: venueEmail || '',
        phone: venuePhone || '',
      },
      ownerId: uid,
      plan: plan,
      active: true,
      bookingsEnabled: true,
      tax: {
        afm: venueAfm,
        doy: venueDoy || '',
      },
      daysRemaining: 15,
      lastDecrementAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create venue owner profile
    await db.collection('yabalitsa_venueOwners').add({
      venueId: venueDocRef.id,
      email: ownerEmail,
      name: ownerName,
      phone: ownerPhone || '',
      role: 'admin',
      permissions: ['manage:all'],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        venueId: venueDocRef.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create venue' },
      { status: 500 }
    );
  }
}
