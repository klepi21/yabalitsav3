import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuth, isAuthError } from '@/lib/api-auth';

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL || 'nikoskoukis99@gmail.com';

interface CouponData {
  code: string;
  active: boolean;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'all' | 'basic' | 'pro' | 'enterprise';
  expiresAt?: string | null;
  description?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    if (authResult.decodedToken.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, venueId, coupon, couponCode } = await request.json();

    if (!venueId) {
      return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
    }

    const venueRef = db.collection('yabalitsa_venues').doc(venueId);
    const venueDoc = await venueRef.get();
    if (!venueDoc.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const venueData = venueDoc.data() || {};
    const coupons: CouponData[] = venueData.coupons || [];
    // Backward compat: migrate legacy single coupon
    if (!venueData.coupons && venueData.coupon) {
      coupons.push(venueData.coupon);
    }

    if (action === 'add') {
      // Add new coupon
      if (!coupon || !coupon.code || !coupon.discountType || !coupon.discountValue) {
        return NextResponse.json({ error: 'Missing coupon fields' }, { status: 400 });
      }

      // Check for duplicate code
      const code = coupon.code.toUpperCase().trim();
      if (coupons.some((c: CouponData) => c.code === code)) {
        return NextResponse.json({ error: 'Υπάρχει ήδη κουπόνι με αυτόν τον κωδικό' }, { status: 400 });
      }

      const newCoupon: CouponData = {
        code,
        active: coupon.active !== false,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        appliesTo: coupon.appliesTo || 'all',
        expiresAt: coupon.expiresAt || null,
        description: coupon.description || null,
      };

      // If new coupon is active, deactivate all others
      const updatedCoupons = newCoupon.active
        ? coupons.map((c: CouponData) => ({ ...c, active: false }))
        : [...coupons];

      updatedCoupons.push(newCoupon);

      // Also set legacy `coupon` field to active one for backward compat
      const activeCoupon = updatedCoupons.find((c: CouponData) => c.active) || null;

      await venueRef.update({ coupons: updatedCoupons, coupon: activeCoupon });
      return NextResponse.json({ success: true, coupons: updatedCoupons });
    }

    if (action === 'update') {
      // Update existing coupon by code
      if (!coupon || !couponCode) {
        return NextResponse.json({ error: 'Missing coupon data' }, { status: 400 });
      }

      const updatedCoupons = coupons.map((c: CouponData) => {
        if (c.code === couponCode) {
          return {
            ...c,
            code: (coupon.code || c.code).toUpperCase().trim(),
            discountType: coupon.discountType || c.discountType,
            discountValue: coupon.discountValue !== undefined ? Number(coupon.discountValue) : c.discountValue,
            appliesTo: coupon.appliesTo || c.appliesTo,
            expiresAt: coupon.expiresAt !== undefined ? coupon.expiresAt : c.expiresAt,
            description: coupon.description !== undefined ? coupon.description : c.description,
            active: c.active,
          };
        }
        return c;
      });

      const activeCoupon = updatedCoupons.find((c: CouponData) => c.active) || null;
      await venueRef.update({ coupons: updatedCoupons, coupon: activeCoupon });
      return NextResponse.json({ success: true, coupons: updatedCoupons });
    }

    if (action === 'activate') {
      // Activate one coupon, deactivate all others
      if (!couponCode) {
        return NextResponse.json({ error: 'Missing couponCode' }, { status: 400 });
      }

      const updatedCoupons = coupons.map((c: CouponData) => ({
        ...c,
        active: c.code === couponCode,
      }));

      const activeCoupon = updatedCoupons.find((c: CouponData) => c.active) || null;
      await venueRef.update({ coupons: updatedCoupons, coupon: activeCoupon });
      return NextResponse.json({ success: true, coupons: updatedCoupons });
    }

    if (action === 'deactivate') {
      // Deactivate a specific coupon
      if (!couponCode) {
        return NextResponse.json({ error: 'Missing couponCode' }, { status: 400 });
      }

      const updatedCoupons = coupons.map((c: CouponData) => ({
        ...c,
        active: c.code === couponCode ? false : c.active,
      }));

      const activeCoupon = updatedCoupons.find((c: CouponData) => c.active) || null;
      await venueRef.update({ coupons: updatedCoupons, coupon: activeCoupon });
      return NextResponse.json({ success: true, coupons: updatedCoupons });
    }

    if (action === 'remove') {
      // Remove a specific coupon
      if (!couponCode) {
        return NextResponse.json({ error: 'Missing couponCode' }, { status: 400 });
      }

      const updatedCoupons = coupons.filter((c: CouponData) => c.code !== couponCode);
      const activeCoupon = updatedCoupons.find((c: CouponData) => c.active) || null;
      await venueRef.update({ coupons: updatedCoupons, coupon: activeCoupon });
      return NextResponse.json({ success: true, coupons: updatedCoupons });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Coupon API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed' },
      { status: 500 }
    );
  }
}
