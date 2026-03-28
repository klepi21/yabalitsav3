'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, CreditCard, Loader2, Calendar, Sparkles, Shield, Lock, AlertTriangle, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { pricingUtils } from '@/lib/pricing';

const PLAN_HIERARCHY: Record<string, number> = {
  basic: 1,
  pro: 2,
  enterprise: 3,
};

export default function SubscriptionRenewalPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [venueData, setVenueData] = useState<any>(null);
  const [currentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL || '';
  const isDevUser = userEmail === DEV_EMAIL;

  const plans = pricingUtils.getAllPlans().map(plan =>
    isDevUser ? { ...plan, basePrice: 0.50 } : plan
  );

  const hasActiveSubscription = venueData && (venueData.daysRemaining || 0) > 0 && venueData.plan === 'subscription';
  const currentPlanId = venueData?.planType?.toLowerCase() || 'basic';
  const currentPlanLevel = PLAN_HIERARCHY[currentPlanId] || 0;

  const getPlanStatus = (planId: string) => {
    if (!hasActiveSubscription) return 'available'; // Expired — all available
    const planLevel = PLAN_HIERARCHY[planId] || 0;
    if (planId === currentPlanId) return 'current';
    if (planLevel < currentPlanLevel) return 'downgrade';
    return 'upgrade';
  };

  const planIcons: Record<string, React.ElementType> = {
    basic: Calendar,
    pro: Sparkles,
    enterprise: Shield,
  };

  useEffect(() => {
    const fetchVenueData = async () => {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const { getAuth } = await import('firebase/auth');

        const auth = getAuth();
        if (auth.currentUser?.uid) {
          setUserEmail(auth.currentUser.email || null);
          const venuesRef = collection(db, 'yabalitsa_venues');
          const q = query(venuesRef, where('ownerId', '==', auth.currentUser.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const venueDoc = querySnapshot.docs[0];
            setVenueData({ id: venueDoc.id, ...venueDoc.data() });
          }
        }
      } catch (error) {
        console.error('Error fetching venue data:', error);
      }
    };
    fetchVenueData();
  }, []);

  const getSelectedDuration = (): 1 | 6 | 12 => {
    const plan = plans.find(p => p.id === selectedPlan);
    return (plan?.durationMonths as 1 | 6 | 12) || 1;
  };

  const calculateSubscriptionEndDate = () => {
    if (!selectedPlan || !venueData) return null;
    const baseDate = new Date(currentDate);
    const planStatus = getPlanStatus(selectedPlan);
    // Upgrade = starts fresh from today (old days lost)
    // Available (expired) = starts from today
    if (planStatus !== 'upgrade') {
      const remainingDays = venueData.daysRemaining || 0;
      baseDate.setDate(baseDate.getDate() + remainingDays);
    }
    const duration = getSelectedDuration();
    baseDate.setMonth(baseDate.getMonth() + duration);
    return baseDate;
  };

  const formatGreekDate = (date: Date) => {
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !venueData) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const coupon = venueData.coupon;
      if (!coupon || !coupon.active) {
        setCouponError('Δεν υπάρχει ενεργό κουπόνι για το venue σας');
        setCouponApplied(false);
        return;
      }
      if (coupon.code.toUpperCase() !== couponInput.trim().toUpperCase()) {
        setCouponError('Λάθος κωδικός κουπονιού');
        setCouponApplied(false);
        return;
      }
      // Calculate discount for display
      if (selectedPlan) {
        const selectedPlanInfo = plans.find(p => p.id === selectedPlan);
        if (selectedPlanInfo) {
          const total = pricingUtils.calculateTotalPrice(selectedPlanInfo.basePrice, getSelectedDuration());
          const { discountAmount } = pricingUtils.applyCouponDiscount(total, coupon);
          setCouponDiscount(discountAmount);
        }
      }
      setCouponApplied(true);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponInput('');
    setCouponError('');
    setCouponDiscount(0);
  };

  const handlePayment = async () => {
    if (!selectedPlan || !venueData) return;
    setIsLoading(true);
    try {
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      if (!selectedPlanData) return;

      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser?.uid) {
        alert('Παρακαλώ συνδεθείτε πρώτα');
        return;
      }

      const duration = getSelectedDuration();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          planId: selectedPlan,
          planName: selectedPlanData.name,
          duration,
          basePrice: selectedPlanData.basePrice,
          userUid: auth.currentUser.uid,
          customerEmail: auth.currentUser.email,
          amount: pricingUtils.getStripeAmount(selectedPlanData.basePrice, duration),
          ...(couponApplied && { couponCode: couponInput.trim().toUpperCase() }),
        }),
      });

      const { clientSecret, error } = await response.json();
      if (error) { alert('Σφάλμα: ' + error); return; }

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) { alert('Σφάλμα φόρτωσης Stripe'); return; }

      window.location.href = `/payment/checkout?payment_intent=${clientSecret}`;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Υπήρξε σφάλμα με την πληρωμή. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const selectedDuration = getSelectedDuration();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/management/settings"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Ρυθμίσεις
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ανανέωση Συνδρομής</h1>
          <p className="text-sm text-zinc-500">Επιλέξτε τη διάρκεια που σας ταιριάζει — όλα τα χαρακτηριστικά περιλαμβάνονται</p>
        </div>
      </div>

      {/* Current Subscription Info */}
      {venueData && (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-zinc-50/50 p-4 text-center">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">{venueData.daysRemaining || 0}</p>
              <p className="text-xs text-zinc-500 mt-0.5">ημέρες που απομένουν</p>
            </div>
            <div className="rounded-lg bg-zinc-50/50 p-4 text-center">
              <p className="text-base font-semibold text-zinc-900">
                {venueData.plan === 'subscription' ? 'Ενεργή Συνδρομή' : 'Δωρεάν Trial'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">τρέχον πλάνο</p>
            </div>
          </div>
          {(!venueData.plan || venueData.plan !== 'subscription') && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3.5 text-center">
              <p className="text-sm text-blue-700">
                Είσαι στο <strong>δωρεάν trial</strong>! Μετά τις {venueData.daysRemaining || 0} ημέρες θα χρειαστεί να επιλέξεις πλάνο.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plan Selection */}
      <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900 mb-1 text-center">Επιλέξτε Διάρκεια</h2>
        <p className="text-sm text-zinc-500 text-center mb-6">Όλα τα πλάνα περιλαμβάνουν πλήρη πρόσβαση σε όλα τα χαρακτηριστικά</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const duration = plan.durationMonths || 1;
            const Icon = planIcons[plan.id] || Calendar;
            const monthlyPrice = pricingUtils.calculateMonthlyPrice(plan.basePrice, duration as 1 | 6 | 12);
            const totalPrice = pricingUtils.calculateTotalPrice(plan.basePrice, duration as 1 | 6 | 12);
            const discount = pricingUtils.getDiscountPercentage(duration as 1 | 6 | 12);
            const status = getPlanStatus(plan.id);
            const isDisabled = status === 'current' || status === 'downgrade';

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => !isDisabled && setSelectedPlan(plan.id)}
                disabled={isDisabled}
                className={`relative rounded-xl border-2 p-6 text-left transition-all duration-150 ${
                  isDisabled
                    ? 'border-zinc-100 bg-zinc-50/50 opacity-70 cursor-not-allowed'
                    : isSelected
                    ? 'border-emerald-400 bg-emerald-50/30 shadow-sm'
                    : 'border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
                }`}
              >
                {status === 'current' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[12px] font-semibold bg-emerald-600 text-white">
                      ΕΝΕΡΓΟ
                    </span>
                  </div>
                )}
                {plan.popular && status !== 'current' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[12px] font-semibold bg-emerald-600 text-white">
                      ΔΗΜΟΦΙΛΕΣ
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                      isDisabled
                        ? 'bg-zinc-100 text-zinc-400'
                        : isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {isDisabled ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${isDisabled ? 'text-zinc-400' : 'text-zinc-900'}`}>{plan.name}</h3>
                      <p className="text-xs text-zinc-500">{duration} {duration === 1 ? 'μήνας' : 'μήνες'}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-semibold tracking-tight ${isDisabled ? 'text-zinc-400' : 'text-zinc-900'}`}>
                        {pricingUtils.formatPrice(totalPrice)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {pricingUtils.formatPrice(monthlyPrice)}/μήνα με ΦΠΑ
                    </p>
                    {discount > 0 && (
                      <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-md text-xs font-medium border ${
                        isDisabled
                          ? 'bg-zinc-50 text-zinc-400 border-zinc-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        Έκπτωση {discount}%
                      </span>
                    )}
                  </div>

                  <ul className="space-y-1.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-center gap-2 text-sm ${isDisabled ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        <Check className={`h-3.5 w-3.5 shrink-0 ${isDisabled ? 'text-zinc-300' : 'text-emerald-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Status messages */}
                  {status === 'current' && (
                    <p className="text-xs text-emerald-600 font-medium text-center pt-2 border-t border-zinc-100">
                      Το τρέχον πλάνο σας
                    </p>
                  )}
                  {status === 'downgrade' && (
                    <p className="text-xs text-zinc-400 font-medium text-center pt-2 border-t border-zinc-100">
                      Διαθέσιμο μετά τη λήξη της συνδρομής
                    </p>
                  )}
                  {status === 'upgrade' && (
                    <p className="text-xs text-blue-600 font-medium text-center pt-2 border-t border-zinc-100">
                      ⬆ Αναβάθμιση
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coupon — only visible when venue has an active coupon */}
      {selectedPlan && venueData?.coupon?.active && (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-600" />
            Κουπόνι Έκπτωσης
          </h3>
          {couponApplied ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 p-3.5">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Κουπόνι <strong>{couponInput.toUpperCase()}</strong> εφαρμόστηκε — Έκπτωση {pricingUtils.formatPrice(couponDiscount)}
                </span>
              </div>
              <button onClick={handleRemoveCoupon} className="text-emerald-600 hover:text-emerald-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value); setCouponError(''); }}
                  placeholder="Εισάγετε κωδικό κουπονιού"
                  className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={!couponInput.trim() || couponLoading}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Εφαρμογή'}
                </button>
              </div>
              {couponError && (
                <p className="mt-2 text-sm text-red-600">{couponError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Summary */}
      {selectedPlan && selectedPlanData && (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 mb-4">Σύνοψη Πληρωμής</h3>

          {/* Upgrade warning */}
          {hasActiveSubscription && getPlanStatus(selectedPlan) === 'upgrade' && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Αναβάθμιση πλάνου</p>
                  <p className="mt-1">
                    Σας απομένουν <strong>{venueData.daysRemaining} ημέρες</strong> στο τρέχον πλάνο ({venueData.planType || 'Basic'}).
                    Με την αναβάθμιση ξεκινάτε νέα περίοδο στο {selectedPlanData.name}. Οι υπόλοιπες ημέρες δεν μεταφέρονται.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Πλάνο:</span>
              <span className="font-medium text-zinc-900">{selectedPlanData.name} ({selectedDuration} {selectedDuration === 1 ? 'μήνας' : 'μήνες'})</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Βασική τιμή:</span>
              <span className="text-zinc-900">€{selectedPlanData.basePrice} × {selectedDuration} μήνες</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">ΦΠΑ (24%):</span>
              <span className="text-zinc-900">€{(selectedPlanData.basePrice * selectedDuration * 0.24).toFixed(2)}</span>
            </div>
            {selectedDuration > 1 && (
              <div className="flex justify-between py-2 border-b border-zinc-100 text-emerald-600">
                <span className="font-medium">Έκπτωση διάρκειας:</span>
                <span className="font-medium">
                  -€{(selectedPlanData.basePrice * selectedDuration * (pricingUtils.getDiscountPercentage(selectedDuration) / 100)).toFixed(2)}
                </span>
              </div>
            )}
            {couponApplied && couponDiscount > 0 && (
              <div className="flex justify-between py-2 border-b border-zinc-100 text-emerald-600">
                <span className="font-medium">Κουπόνι ({couponInput.toUpperCase()}):</span>
                <span className="font-medium">-{pricingUtils.formatPrice(couponDiscount)}</span>
              </div>
            )}
            {calculateSubscriptionEndDate() && (
              <div className="flex justify-between py-2 border-b border-zinc-100">
                <span className="text-zinc-500">Ισχύει μέχρι:</span>
                <span className="font-medium text-emerald-700">{formatGreekDate(calculateSubscriptionEndDate()!)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3">
              <span className="text-lg font-semibold text-zinc-900">Σύνολο:</span>
              <span className="text-lg font-semibold text-zinc-900">
                {couponApplied
                  ? pricingUtils.formatPrice(pricingUtils.calculateTotalPrice(selectedPlanData.basePrice, selectedDuration) - couponDiscount)
                  : pricingUtils.formatPrice(pricingUtils.calculateTotalPrice(selectedPlanData.basePrice, selectedDuration))
                }
              </span>
            </div>
          </div>

          {/* Upgrade confirmation */}
          {hasActiveSubscription && getPlanStatus(selectedPlan) === 'upgrade' && !showUpgradeConfirm ? (
            <button
              onClick={() => setShowUpgradeConfirm(true)}
              className="w-full mt-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Αναβάθμιση σε {selectedPlanData.name}
            </button>
          ) : hasActiveSubscription && getPlanStatus(selectedPlan) === 'upgrade' && showUpgradeConfirm ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-center text-zinc-600 font-medium">
                Είστε σίγουροι; Οι {venueData.daysRemaining} ημέρες που απομένουν δεν θα μεταφερθούν.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeConfirm(false)}
                  className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-600 font-medium rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); handlePayment(); }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Επεξεργασία...</>
                  ) : (
                    <><CreditCard className="h-4 w-4" /> Επιβεβαίωση</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); handlePayment(); }}
              disabled={!selectedPlan || isLoading}
              className="w-full mt-6 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Επεξεργασία...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Πληρωμή με Κάρτα
                </>
              )}
            </button>
          )}
          <p className="text-xs text-zinc-400 text-center mt-2">Ασφαλής πληρωμή μέσω Stripe</p>
        </div>
      )}
    </div>
  );
}
