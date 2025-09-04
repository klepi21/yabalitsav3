import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { paymentService, venueService } from '@/lib/firebase-services';

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

    // Update payment record in Firebase
    const payments = await paymentService.getAll();
    const payment = payments.find(p => p.stripePaymentIntentId === paymentIntent.id);
    
    if (payment) {
      await paymentService.update(payment.id, {
        status: 'succeeded',
        paymentDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Updated payment record in Firebase');
    }

    // Calculate plan end date
    const currentDate = new Date();
    const planEndDate = new Date();
    planEndDate.setMonth(planEndDate.getMonth() + duration);

    // Calculate days remaining
    const daysRemaining = Math.ceil((planEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Convert planName to planType
    const planTypeMap: { [key: string]: 'Basic' | 'Pro' | 'Enterprise' } = {
      'Basic': 'Basic',
      'Pro': 'Pro', 
      'Enterprise': 'Enterprise'
    };
    const planType = planTypeMap[planName] || 'Basic';

    // Update venue with plan details
    await venueService.update(venueId, {
      plan: 'subscription', // Keep as 'subscription' for compatibility
      planType: planType,
      subscriptionEndDate: planEndDate.toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
      active: true
    });

    console.log('✅ Updated venue with plan details:', {
      planType,
      subscriptionEndDate: planEndDate.toISOString(),
      daysRemaining,
      active: true
    });

    // TODO: Generate official AADE invoice here if needed
    console.log('⚠️ TODO: Generate official AADE invoice for tax compliance');

    return NextResponse.json({ 
      success: true,
      venueId,
      planName,
      planType,
      durationMonths: duration,
      subscriptionEndDate: planEndDate.toISOString(),
      daysRemaining,
      message: 'Plan activated successfully'
    });

  } catch (error) {
    console.error('Finalize one-time payment error:', error);
    return NextResponse.json({ error: 'Failed to finalize payment' }, { status: 500 });
  }
}
