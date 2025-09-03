import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { paymentService, subscriptionService, venueService } from '@/lib/firebase-services';

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

    // Find local payment record
    const payment = await paymentService.getByPaymentIntentId(paymentIntent.id);

    // Resolve metadata
    let venueId = (paymentIntent.metadata?.venueId as string | undefined) || undefined;
    let planName = (paymentIntent.metadata?.planName as any) || undefined;
    let duration = (paymentIntent.metadata?.duration as string | undefined) || undefined;

    if (payment) {
      if (!venueId) venueId = payment.subscriptionId;
      if (!planName && payment.planName) planName = payment.planName;
      if (!duration && payment.durationMonths != null) duration = String(payment.durationMonths);
    }

    if (!venueId || !planName || !duration) {
      return NextResponse.json({ error: 'Missing required details to finalize subscription' }, { status: 400 });
    }

    // Update payment status and date
    if (payment) {
      await paymentService.update(payment.id, {
        status: 'succeeded',
        paymentDate: new Date().toISOString(),
      });
    }

    // Calculate new subscription end date
    const currentDate = new Date();
    const venue = await venueService.getById(venueId);

    if (venue && venue.daysRemaining) {
      currentDate.setDate(currentDate.getDate() + venue.daysRemaining);
    }

    currentDate.setMonth(currentDate.getMonth() + parseInt(duration));

    // Update/Create subscription
    const subscriptionData: any = {
      subscriptionPlan: planName as 'Basic' | 'Pro' | 'Enterprise',
      subscriptionEndDate: currentDate.toISOString(),
    };

    if (paymentIntent.customer) {
      subscriptionData.stripeCustomerId = paymentIntent.customer as string;
    }

    await subscriptionService.set(venueId, subscriptionData);

    // Update venue info
    const newDaysRemaining = Math.ceil((currentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    await venueService.update(venueId, {
      plan: 'subscription',
      planType: planName as 'Basic' | 'Pro' | 'Enterprise',
      daysRemaining: newDaysRemaining,
    });

    return NextResponse.json({ ok: true, venueId, planName, durationMonths: parseInt(duration) });
  } catch (error) {
    console.error('Finalize payment error:', error);
    return NextResponse.json({ error: 'Failed to finalize payment' }, { status: 500 });
  }
}


