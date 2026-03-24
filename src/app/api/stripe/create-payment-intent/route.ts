import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { venueService, paymentService } from '@/lib/firebase-services';
import { pricingUtils } from '@/lib/pricing';

const DEV_EMAIL = process.env.DEV_EMAIL || '';
const DEV_BASE_PRICE = 0.50;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { planId, duration, userUid, customerEmail, customerName, couponCode } = await request.json();

    console.log('Creating payment intent for:', { planId, duration, userUid, customerEmail, customerName });

    if (!planId || !duration || !userUid) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, duration, userUid' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = pricingUtils.getPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // Get venue for this user
    const venues = await venueService.getAll();
    const venue = venues.find(v => v.ownerId === userUid);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'No venue found for this user' },
        { status: 404 }
      );
    }

    // Block same/lower plan purchases when subscription is active
    const PLAN_HIERARCHY: Record<string, number> = { basic: 1, pro: 2, enterprise: 3 };
    const currentPlanId = (venue.planType || '').toLowerCase();
    const daysRemaining = venue.daysRemaining || 0;
    const hasActiveSub = daysRemaining > 0 && venue.plan === 'subscription';

    if (hasActiveSub) {
      const currentLevel = PLAN_HIERARCHY[currentPlanId] || 0;
      const newLevel = PLAN_HIERARCHY[planId] || 0;
      if (newLevel <= currentLevel) {
        return NextResponse.json(
          { error: `Δεν μπορείτε να αγοράσετε ίδιο ή κατώτερο πλάνο ενώ έχετε ενεργή συνδρομή (${currentPlanId}). Διαθέσιμο μετά τη λήξη.` },
          { status: 400 }
        );
      }
    }

    // Get Stripe Price ID
    const stripePriceId = pricingUtils.getStripePriceId(planId, duration as 1 | 6 | 12);
    if (!stripePriceId) {
      return NextResponse.json(
        { 
          error: 'Price configuration not found for this plan and duration',
          planId,
          duration,
          availablePlans: ['basic', 'pro', 'enterprise'],
          availableDurations: [1, 6, 12]
        },
        { status: 400 }
      );
    }

    console.log('✅ Using Stripe Price ID:', stripePriceId);

    // Check if dev email for testing pricing
    const basePrice = customerEmail === DEV_EMAIL ? DEV_BASE_PRICE : plan.basePrice;

    // Calculate the amount
    let totalPrice = pricingUtils.calculateTotalPrice(basePrice, duration as 1 | 6 | 12);
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;

    // Validate and apply coupon if provided
    if (couponCode) {
      const venueCoupon = venue.coupon;
      if (!venueCoupon || !venueCoupon.active) {
        return NextResponse.json(
          { error: 'Μη έγκυρο ή ανενεργό κουπόνι' },
          { status: 400 }
        );
      }
      if (venueCoupon.code.toUpperCase() !== couponCode.toUpperCase()) {
        return NextResponse.json(
          { error: 'Λάθος κωδικός κουπονιού' },
          { status: 400 }
        );
      }
      const { discountedPrice, discountAmount } = pricingUtils.applyCouponDiscount(totalPrice, venueCoupon);
      totalPrice = discountedPrice;
      couponDiscount = discountAmount;
      appliedCouponCode = couponCode.toUpperCase();
      console.log('🎟️ Coupon applied:', { code: appliedCouponCode, discount: couponDiscount, newTotal: totalPrice });
    }

    const amountInCents = Math.round(totalPrice * 100);

    console.log('💰 Payment details:', {
      basePrice,
      duration,
      totalPrice,
      amountInCents
    });

    // Create or get Stripe customer
    let stripeCustomerId: string;
    
    if (venue.stripeCustomerId) {
      stripeCustomerId = venue.stripeCustomerId;
      console.log('✅ Using existing Stripe customer:', stripeCustomerId);
    } else {
      console.log('📝 Creating new Stripe customer...');
      const stripeCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName || venue.name,
        metadata: {
          venueId: venue.id,
          userUid: userUid
        }
      });
      
      stripeCustomerId = stripeCustomer.id;
      console.log('✅ Created new Stripe customer:', stripeCustomerId);
      
      // Update venue with Stripe customer ID (non-blocking — may fail without auth context)
      try {
        await venueService.update(venue.id, {
          stripeCustomerId: stripeCustomerId
        });
      } catch (e) {
        console.warn('Could not save stripeCustomerId to venue (will retry on next payment):', e);
      }
    }

    // Create PaymentIntent for one-time payment
    console.log('💳 Creating PaymentIntent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      customer: stripeCustomerId,
      confirmation_method: 'automatic',
      confirm: false,
      metadata: {
        venue_id: venue.id,
        plan_id: planId,
        plan_name: plan.name as 'Basic' | 'Pro' | 'Enterprise',
        duration: duration.toString(),
        user_uid: userUid,
        payment_type: 'one_time_plan_purchase',
        ...(appliedCouponCode && { coupon_code: appliedCouponCode, coupon_discount: couponDiscount.toFixed(2) })
      },
      payment_method_types: ['card']
    });

    console.log('✅ PaymentIntent created:', paymentIntent.id, paymentIntent.status);

    // Store payment record in Firebase (payments collection has write: if true)
    const paymentId = await paymentService.create({
      venueId: venue.id,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomerId,
      amount: totalPrice,
      currency: 'eur',
      status: 'pending',
      planName: plan.name as 'Basic' | 'Pro' | 'Enterprise',
      durationMonths: duration,
      paymentType: 'one_time_plan_purchase',
      ...(appliedCouponCode && { couponCode: appliedCouponCode, couponDiscount: couponDiscount }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('💾 Payment record stored in Firebase:', paymentId);

    // Deactivate coupon after use (one-time use)
    if (appliedCouponCode && venue.coupon) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const venueRef = doc(db, 'yabalitsa_venues', venue.id);
        await updateDoc(venueRef, { 'coupon.active': false });
        console.log('🎟️ Coupon deactivated for venue:', venue.id);
      } catch (e) {
        console.warn('Could not deactivate coupon (non-blocking):', e);
      }
    }

    // Return response
    const response = {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalPrice,
      currency: 'eur',
      planName: plan.name,
      duration: duration
    };

    console.log('✅ Payment intent created successfully:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payment intent creation error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
