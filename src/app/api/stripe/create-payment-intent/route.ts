import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  pricingUtils, calculateSubscription, describeBreakdown,
  calculateUpgrade, buildBilledSnapshot, quoteUnlock, SELF_SERVE_LIMITS,
} from '@/lib/pricing';
import { getVenueUsage } from '@/lib/venue-usage';
import { verifyAuth, isAuthError } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';

const DEV_EMAIL = process.env.DEV_EMAIL || '';
const DEV_BASE_PRICE = 0.50;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const {
      planId, duration, userUid, customerEmail, customerName, couponCode, mode,
      targetPitches, targetAthletes,
    } = await request.json();
    const isUpgrade = mode === 'upgrade';

    // Verify the token uid matches the claimed userUid
    if (authResult.decodedToken.uid !== userUid) {
      return NextResponse.json(
        { error: 'Unauthorized: token does not match userUid' },
        { status: 403 }
      );
    }

    console.log('Creating payment intent for:', { planId, duration, userUid, customerEmail, customerName });

    if (!userUid || (!isUpgrade && !duration)) {
      return NextResponse.json(
        { error: 'Missing required fields: duration, userUid' },
        { status: 400 }
      );
    }

    if (!isUpgrade && ![1, 6, 12].includes(Number(duration))) {
      return NextResponse.json({ error: 'Μη έγκυρη διάρκεια συνδρομής' }, { status: 400 });
    }

    // Get venue for this user via Admin SDK
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const venuesSnap = await adminDb.collection('yabalitsa_venues').where('ownerId', '==', userUid).get();
    if (venuesSnap.empty) {
      return NextResponse.json({ error: 'No venue found for this user' }, { status: 404 });
    }
    const venueDoc = venuesSnap.docs[0];
    const venue = { id: venueDoc.id, ...venueDoc.data() } as Record<string, unknown> & { id: string; ownerId: string; name: string; planType?: string; daysRemaining?: number; plan?: string; stripeCustomerId?: string; coupon?: { code: string; active: boolean; discountType: 'percentage' | 'fixed'; discountValue: number; expiresAt?: string } };

    /* Ο έλεγχος ιεραρχίας πλάνων αφαιρέθηκε: στο μοντέλο βάσει μεγέθους
       ο πελάτης δεν επιλέγει πακέτο, άρα δεν υπάρχει «κατώτερο πλάνο» να
       αποτραπεί. Οι ημέρες προστίθενται σωστά στο υπόλοιπο, οπότε μια
       πρόωρη ανανέωση δεν χάνει τίποτα. */


    /* Η τιμή προκύπτει από το ΠΡΑΓΜΑΤΙΚΟ μέγεθος (γήπεδα + αθλητές),
       όχι από πακέτο που δηλώνει ο πελάτης. */
    const usage = await getVenueUsage(venueDoc.id);
    const billed = (venue as Record<string, unknown>).billing as
      | Parameters<typeof calculateUpgrade>[1]
      | undefined;

    // Στην αναβάθμιση κρατάμε τη διάρκεια που είχε αγοραστεί.
    const effectiveDuration = (isUpgrade ? billed?.durationMonths ?? 1 : Number(duration)) as 1 | 6 | 12;

    /* Η αναβάθμιση μπορεί να αφορά χωρητικότητα που ο πελάτης ΔΕΝ έχει
       ακόμα (θέλει να προσθέσει γήπεδο/αθλητή). Τιμολογούμε τον στόχο,
       ώστε η δημιουργία να ξεκλειδώσει αμέσως μετά την πληρωμή. */
    const wantsPitches = Math.max(usage.pitches, Number(targetPitches) || 0);
    const wantsAthletes = Math.max(usage.athletes, Number(targetAthletes) || 0);
    const targetUsage = isUpgrade
      ? {
          pitches: wantsPitches,
          athletes: wantsAthletes,
          hasAcademy: usage.hasAcademy || wantsAthletes > 0,
        }
      : usage;

    if (
      isUpgrade &&
      (wantsPitches > SELF_SERVE_LIMITS.pitches || wantsAthletes > SELF_SERVE_LIMITS.athletes)
    ) {
      return NextResponse.json(
        {
          error:
            'Το μέγεθος που ζητάτε ξεπερνά το πλάνο που τιμολογείται αυτόματα. Επικοινωνήστε μαζί μας.',
          requiresContact: true,
        },
        { status: 409 }
      );
    }

    const breakdown = calculateSubscription(targetUsage, effectiveDuration);

    // Πάνω από το self-serve μέγεθος δεν υπάρχει αυτόματη τιμή να χρεωθεί.
    if (breakdown.requiresContact) {
      return NextResponse.json(
        {
          error:
            'Το μέγεθος του κέντρου σας ξεπερνά το πλάνο που τιμολογείται αυτόματα. Επικοινωνήστε μαζί μας για να συμφωνήσουμε πλάνο.',
          requiresContact: true,
        },
        { status: 409 }
      );
    }

    let upgradeQuote = null;
    if (isUpgrade) {
      upgradeQuote = quoteUnlock(usage, billed, (venue.daysRemaining as number) || 0, {
        pitches: wantsPitches,
        athletes: wantsAthletes,
      });
      if (!upgradeQuote.owed) {
        return NextResponse.json(
          { error: 'Δεν εκκρεμεί αναβάθμιση για τον λογαριασμό σας.' },
          { status: 409 }
        );
      }
    }

    let totalPrice =
      customerEmail === DEV_EMAIL
        ? pricingUtils.calculateTotalPrice(DEV_BASE_PRICE, effectiveDuration)
        : isUpgrade
          ? upgradeQuote!.amountWithVat
          : breakdown.totalWithVat;
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
      // Check expiration
      if (venueCoupon.expiresAt && new Date(venueCoupon.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: 'Αυτό το κουπόνι έχει λήξει' },
          { status: 400 }
        );
      }
      /* Περιορισμός ανά ζώνη. Πριν συγκρινόταν με το `planId` που ο
         πελάτης επέλεγε — πεδίο που δεν στέλνεται πλέον, οπότε κάθε
         περιορισμένο κουπόνι θα αποτύγχανε. Συγκρίνεται με τη ζώνη που
         προκύπτει από το μέγεθος. */
      const couponAppliesTo = (venueCoupon as Record<string, unknown>).appliesTo as string | undefined;
      const currentTierId = describeBreakdown(breakdown).planType.toLowerCase();
      if (couponAppliesTo && couponAppliesTo !== 'all' && couponAppliesTo !== currentTierId) {
        return NextResponse.json(
          { error: `Αυτό το κουπόνι ισχύει μόνο για τη ζώνη ${couponAppliesTo}` },
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
    const { planType, planName } = describeBreakdown(breakdown);

    console.log('💰 Payment details:', {
      usage,
      planType,
      duration,
      totalPrice,
      amountInCents,
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
      
      // Update venue with Stripe customer ID via Admin SDK
      try {
        await adminDb.collection('yabalitsa_venues').doc(venue.id).update({
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
        plan_id: planId || planType.toLowerCase(),
        plan_name: planName,
        plan_type: planType,
        mode: isUpgrade ? 'upgrade' : 'purchase',
        billed_snapshot: JSON.stringify(
          buildBilledSnapshot(breakdown, new Date().toISOString())
        ),
        pitches: String(usage.pitches),
        athletes: String(usage.athletes),
        duration: String(effectiveDuration),
        user_uid: userUid,
        payment_type: 'one_time_plan_purchase',
        ...(appliedCouponCode && { coupon_code: appliedCouponCode, coupon_discount: couponDiscount.toFixed(2) })
      },
      payment_method_types: ['card']
    });

    console.log('✅ PaymentIntent created:', paymentIntent.id, paymentIntent.status);

    // Store payment record in Firebase via Admin SDK
    const paymentRef = await adminDb.collection('yabalitsa_payments').add({
      venueId: venue.id,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomerId,
      amount: totalPrice,
      currency: 'eur',
      status: 'pending',
      planName,
      planType,
      durationMonths: effectiveDuration,
      paymentType: isUpgrade ? 'plan_upgrade' : 'one_time_plan_purchase',
      ...(appliedCouponCode && { couponCode: appliedCouponCode, couponDiscount: couponDiscount }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('💾 Payment record stored in Firebase:', paymentRef.id);

    // Deactivate coupon after use (one-time use) via Admin SDK
    if (appliedCouponCode && venue.coupon) {
      try {
        await adminDb.collection('yabalitsa_venues').doc(venue.id).update({ 'coupon.active': false });
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
      planName,
      planType,
      breakdown,
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
