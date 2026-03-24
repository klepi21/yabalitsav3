import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import path from 'path';

if (!getApps().length) {
  initializeApp({
    credential: cert(
      path.join(process.cwd(), process.env.FIREBASE_ADMIN_KEY_PATH!)
    ),
  });
}

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    // Retrieve PaymentIntent from Stripe to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: `PaymentIntent not succeeded: ${paymentIntent.status}` }, { status: 400 });
    }

    console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
    console.log('💰 Amount paid:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());

    // Get metadata from PaymentIntent
    const venueId = paymentIntent.metadata.venue_id;
    const planName = paymentIntent.metadata.plan_name;
    const duration = parseInt(paymentIntent.metadata.duration);
    const userUid = paymentIntent.metadata.user_uid;

    console.log('📋 Payment details:', { venueId, planName, duration, userUid });

    if (!venueId || !planName || !duration) {
      return NextResponse.json({
        error: 'Missing required metadata in PaymentIntent',
        metadata: paymentIntent.metadata
      }, { status: 400 });
    }

    // Update payment record in Firebase (Admin SDK — bypasses rules)
    const paymentsSnap = await db.collection('yabalitsa_payments')
      .where('stripePaymentIntentId', '==', paymentIntent.id)
      .limit(1)
      .get();

    if (!paymentsSnap.empty) {
      const paymentDoc = paymentsSnap.docs[0];
      await paymentDoc.ref.update({
        status: 'succeeded',
        paymentDate: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Updated payment record in Firebase');
    }

    // Get current venue data to get existing daysRemaining
    const venueDoc = await db.collection('yabalitsa_venues').doc(venueId).get();
    const venueData = venueDoc.data();
    const currentDaysRemaining = venueData?.daysRemaining || 0;

    // Calculate new days to add based on duration (months to days)
    const newDays = duration * 30;
    const daysRemaining = currentDaysRemaining + newDays;

    // Calculate new subscription end date
    const currentDate = new Date();
    const planEndDate = new Date(currentDate);
    planEndDate.setDate(planEndDate.getDate() + daysRemaining);

    // Convert planName to planType
    const planTypeMap: Record<string, string> = {
      'Basic': 'Basic',
      'Pro': 'Pro',
      'Enterprise': 'Enterprise',
    };
    const planType = planTypeMap[planName] || 'Basic';

    // Update venue with plan details (Admin SDK — bypasses rules)
    await db.collection('yabalitsa_venues').doc(venueId).update({
      plan: 'subscription',
      planType,
      subscriptionEndDate: planEndDate.toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('✅ Updated venue with plan details:', {
      planType,
      subscriptionEndDate: planEndDate.toISOString(),
      daysRemaining,
      active: true,
    });

    return NextResponse.json({
      success: true,
      venueId,
      planName,
      planType,
      durationMonths: duration,
      subscriptionEndDate: planEndDate.toISOString(),
      daysRemaining,
      message: 'Plan activated successfully',
    });

  } catch (error) {
    console.error('Finalize one-time payment error:', error);
    return NextResponse.json({ error: 'Failed to finalize payment' }, { status: 500 });
  }
}
