import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json({ error: 'PaymentIntent not found' }, { status: 404 });
    }

    // Get the customer ID from the payment intent
    const customerId = paymentIntent.customer as string;
    
    if (!customerId) {
      return NextResponse.json({ error: 'No customer associated with this payment' }, { status: 400 });
    }

    // Get the customer details
    const customer = await stripe.customers.retrieve(customerId);

    // Create a receipt/invoice URL
    // For successful payments, we can create a receipt URL
    let receiptUrl: string | null = null;
    
    if (paymentIntent.status === 'succeeded') {
      // Try to get the charge to create a receipt
      const charges = await stripe.charges.list({
        payment_intent: paymentIntentId,
        limit: 1
      });

      if (charges.data.length > 0) {
        const charge = charges.data[0];
        receiptUrl = charge.receipt_url;
      }
    }

    // If no receipt URL is available, we'll create a custom invoice-like response
    const invoiceData = {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created: paymentIntent.created,
      customer: {
        id: customerId,
        email: customer.deleted ? null : customer.email,
        name: customer.deleted ? null : customer.name
      },
      metadata: paymentIntent.metadata,
      receiptUrl: receiptUrl,
      // Create a downloadable invoice URL
      invoiceUrl: receiptUrl || `https://dashboard.stripe.com/payments/${paymentIntentId}`
    };

    return NextResponse.json({
      success: true,
      invoice: invoiceData
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ 
      error: 'Failed to generate invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Alternative method to get invoice PDF directly from Stripe
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent_id');

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'payment_intent_id is required' }, { status: 400 });
    }

    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json({ error: 'PaymentIntent not found' }, { status: 404 });
    }

    // Get the charge to access receipt URL
    const charges = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 1
    });

    if (charges.data.length === 0) {
      return NextResponse.json({ error: 'No charge found for this payment' }, { status: 404 });
    }

    const charge = charges.data[0];
    
    if (!charge.receipt_url) {
      return NextResponse.json({ error: 'No receipt available for this payment' }, { status: 404 });
    }

    // Redirect to the Stripe receipt URL
    return NextResponse.redirect(charge.receipt_url);

  } catch (error) {
    console.error('Error getting invoice:', error);
    return NextResponse.json({ 
      error: 'Failed to get invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
