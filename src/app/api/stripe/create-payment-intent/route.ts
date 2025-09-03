import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { paymentService } from '@/lib/firebase-services';
import { auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, planName, duration, basePrice, amount, userUid } = body;

    if (!planId || !planName || !duration || !basePrice || !amount || !userUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get venue ID for the authenticated user
    const venuesRef = collection(db, 'yabalitsa_venues');
    const q = query(venuesRef, where('ownerId', '==', userUid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'No venue found for this user' },
        { status: 404 }
      );
    }

    const venueDoc = querySnapshot.docs[0];
    const venueId = venueDoc.id;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'eur',
      metadata: {
        venueId,
        planId,
        planName,
        duration: duration.toString(),
        basePrice: basePrice.toString(),
      },
      description: `Subscription ${planName} - ${duration} months for venue ${venueId}`,
    });

    // Store payment record in Firebase (new structure)
    await paymentService.create({
      amount: amount / 100, // Convert from cents to euros (float)
      currency: 'eur',
      paymentDate: new Date().toISOString(),
      subscriptionId: venueId, // Reference to yabalitsa_subscriptions document ID (venueId)
      status: paymentIntent.status as 'succeeded' | 'failed',
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}