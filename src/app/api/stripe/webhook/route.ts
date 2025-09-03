import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { paymentService, subscriptionService, venueService } from '@/lib/firebase-services';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { venueId, planName, duration } = paymentIntent.metadata;
    
    if (!venueId || !planName || !duration) {
      console.error('Missing metadata in payment intent:', paymentIntent.metadata);
      return;
    }

    console.log(`Processing successful payment for venue ${venueId}, plan ${planName}, duration ${duration}`);

    // Update payment status in Firebase (new structure)
    const payments = await paymentService.getBySubscriptionId(venueId);
    console.log(`Found ${payments.length} payments for venue ${venueId}`);
    
    // Find the payment with matching payment intent ID or the most recent one
    const payment = payments.find(p => p.subscriptionId === venueId);
    
    if (payment) {
      await paymentService.update(payment.id, {
        status: 'succeeded',
        paymentDate: new Date().toISOString(),
      });
      console.log(`Updated payment ${payment.id} status to succeeded`);
    } else {
      console.log('No matching payment found to update');
    }

    // Calculate new subscription end date
    const currentDate = new Date();
    const venue = await venueService.getById(venueId);
    
    if (venue && venue.daysRemaining) {
      // Add remaining days to current date, then add subscription months
      currentDate.setDate(currentDate.getDate() + venue.daysRemaining);
      console.log(`Added ${venue.daysRemaining} existing days to subscription`);
    }
    
    currentDate.setMonth(currentDate.getMonth() + parseInt(duration));
    console.log(`New subscription end date: ${currentDate.toISOString()}`);

    // Update or create subscription (new structure) - handle optional stripeCustomerId
    const subscriptionData: any = {
      subscriptionPlan: planName as 'Basic' | 'Pro' | 'Enterprise',
      subscriptionEndDate: currentDate.toISOString(),
    };

    // Only add stripeCustomerId if it exists
    if (paymentIntent.customer) {
      subscriptionData.stripeCustomerId = paymentIntent.customer as string;
    }

    await subscriptionService.set(venueId, subscriptionData);
    console.log(`Created/updated subscription for venue ${venueId}`);

    // Update venue with new subscription info
    const newDaysRemaining = Math.ceil((currentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    await venueService.update(venueId, {
      plan: 'subscription',
      planType: planName as 'Basic' | 'Pro' | 'Enterprise',
      daysRemaining: newDaysRemaining,
    });

    console.log(`Successfully processed payment for venue ${venueId}. New days remaining: ${newDaysRemaining}`);

  } catch (error) {
    console.error('Error processing payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { venueId } = paymentIntent.metadata;
    
    if (!venueId) {
      console.error('Missing venueId in payment intent metadata');
      return;
    }

    // Update payment status in Firebase (new structure)
    const payments = await paymentService.getBySubscriptionId(venueId);
    const payment = payments.find(p => p.subscriptionId === venueId);
    
    if (payment) {
      await paymentService.update(payment.id, {
        status: 'failed',
      });
    }

    console.log(`Payment failed for venue ${venueId}`);

  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
}