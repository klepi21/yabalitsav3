'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Check, CreditCard, Loader2, Lock, Tag, X,
  Building2, Users, TrendingUp, Info,
} from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { pricingUtils } from '@/lib/pricing';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import UpgradeDueCard from '@/components/UpgradeDueCard';

interface Tier { id: string; label: string; upTo: number | null; monthly: number }
interface Quote {
  duration: 1 | 6 | 12;
  platformTier: Tier;
  academyTier: Tier | null;
  monthlyBeforeDiscount: number;
  monthlyWithVat: number;
  totalWithVat: number;
  discountPercent: number;
  requiresContact: boolean;
  planType: string;
  planName: string;
}
interface QuoteResponse {
  usage: { pitches: number; athletes: number; hasAcademy: boolean };
  quotes: Quote[];
  requiresContact?: boolean;
  upgrade?: import('@/lib/queries').UpgradeQuote;
  headroom: {
    pitchesToNextTier: number | null;
    athletesToNextTier: number | null;
    platformTierLabel: string;
    academyTierLabel: string | null;
  };
}

const DURATION_LABEL: Record<number, string> = {
  1: 'Μηνιαία',
  6: 'Εξάμηνη',
  12: 'Ετήσια',
};

export default function SubscriptionRenewalPage() {
  const [venueData, setVenueData] = useState<Record<string, unknown> | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [duration, setDuration] = useState<1 | 6 | 12>(12);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);

  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const daysRemaining = (venueData?.daysRemaining as number) || 0;
  const isTrial = venueData?.plan === 'trial';
  const selected = quote?.quotes.find((q) => q.duration === duration);
  const requiresContact = !!quote?.requiresContact;

  const load = useCallback(async () => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { getAuth } = await import('firebase/auth');

      const auth = getAuth();
      if (!auth.currentUser?.uid) return;

      const snap = await getDocs(
        query(collection(db, 'yabalitsa_venues'), where('ownerId', '==', auth.currentUser.uid))
      );
      if (snap.empty) return;

      const venue = { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown>;
      setVenueData(venue);

      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/subscription/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ venueId: venue.id }),
      });
      if (res.ok) setQuote(await res.json());
    } catch (error) {
      console.error('Error loading renewal data:', error);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !venueData || !selected) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const coupon = venueData.coupon as
        | { code: string; active: boolean; expiresAt?: string; discountType: 'percentage' | 'fixed'; discountValue: number }
        | undefined;

      if (!coupon || !coupon.active) {
        setCouponError('Δεν υπάρχει ενεργό κουπόνι για τον λογαριασμό σας');
        setCouponApplied(false);
        return;
      }
      if (coupon.code.toUpperCase() !== couponInput.trim().toUpperCase()) {
        setCouponError('Λάθος κωδικός κουπονιού');
        setCouponApplied(false);
        return;
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        setCouponError('Αυτό το κουπόνι έχει λήξει');
        setCouponApplied(false);
        return;
      }

      const { discountAmount } = pricingUtils.applyCouponDiscount(selected.totalWithVat, coupon);
      setCouponDiscount(discountAmount);
      setCouponApplied(true);
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!venueData || !selected) return;
    setIsLoading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser?.uid) {
        toast.error('Απαιτείται σύνδεση', 'Συνδεθείτε ξανά για να συνεχίσετε με την πληρωμή.');
        return;
      }

      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          duration,
          userUid: auth.currentUser.uid,
          customerEmail: auth.currentUser.email,
          ...(couponApplied && { couponCode: couponInput.trim().toUpperCase() }),
        }),
      });

      const { clientSecret, error } = await response.json();
      if (error) {
        toast.error('Η πληρωμή δεν ολοκληρώθηκε', error);
        return;
      }

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        toast.error('Πρόβλημα φόρτωσης πληρωμών', 'Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.');
        return;
      }

      window.location.href = `/payment/checkout?payment_intent=${clientSecret}`;
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Υπήρξε σφάλμα με την πληρωμή', 'Δεν χρεωθήκατε. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  const finalTotal = selected ? Math.max(0.5, selected.totalWithVat - (couponApplied ? couponDiscount : 0)) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link
        href="/management/settings"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Ρυθμίσεις
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Συνδρομή</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Η τιμή προκύπτει από το μέγεθος του κέντρου σας. Δεν χρειάζεται να επιλέξετε πακέτο.
        </p>
      </div>

      {isLoadingQuote ? (
        <div className="surface p-6 animate-pulse space-y-4">
          <div className="h-5 w-40 bg-zinc-200 rounded" />
          <div className="h-24 bg-zinc-100 rounded-xl" />
          <div className="h-24 bg-zinc-100 rounded-xl" />
        </div>
      ) : !quote ? (
        <div className="surface p-6 text-center">
          <p className="text-sm text-zinc-600">Δεν ήταν δυνατή η φόρτωση των στοιχείων συνδρομής.</p>
        </div>
      ) : (
        <>
          {quote.upgrade?.owed && <UpgradeDueCard upgrade={quote.upgrade} />}

          {/* ---------- Τρέχουσα κατάσταση ---------- */}
          <div className="surface p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-50 p-4 text-center">
                <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{daysRemaining}</p>
                <p className="text-xs text-zinc-600 mt-0.5">ημέρες που απομένουν</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 text-center">
                <p className="text-base font-semibold text-zinc-900">
                  {isTrial ? 'Δωρεάν δοκιμή' : 'Ενεργή συνδρομή'}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">τρέχον πλάνο</p>
              </div>
            </div>
          </div>

          {/* ---------- Το μέγεθός σας ---------- */}
          <div className="surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Το μέγεθός σας</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <span className="text-xs font-medium text-zinc-600">Πλατφόρμα</span>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {quote.usage.pitches} {quote.usage.pitches === 1 ? 'γήπεδο' : 'γήπεδα'}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{quote.headroom.platformTierLabel}</p>
                {quote.headroom.pitchesToNextTier !== null && (
                  <p className="text-2xs text-zinc-500 mt-2">
                    {quote.headroom.pitchesToNextTier > 0
                      ? `Περιθώριο για ${quote.headroom.pitchesToNextTier} ακόμα στην ίδια τιμή`
                      : 'Στο όριο της ζώνης — το επόμενο γήπεδο αλλάζει τιμή'}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <span className="text-xs font-medium text-zinc-600">Ακαδημία</span>
                </div>
                {quote.usage.hasAcademy ? (
                  <>
                    <p className="text-sm font-semibold text-zinc-900">
                      {quote.usage.athletes} {quote.usage.athletes === 1 ? 'αθλητής' : 'αθλητές'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{quote.headroom.academyTierLabel}</p>
                    {quote.headroom.athletesToNextTier !== null && (
                      <p className="text-2xs text-zinc-500 mt-2">
                        {quote.headroom.athletesToNextTier > 0
                          ? `Περιθώριο για ${quote.headroom.athletesToNextTier} ακόμα στην ίδια τιμή`
                          : 'Στο όριο της ζώνης — ο επόμενος αθλητής αλλάζει τιμή'}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-zinc-600">Δεν χρησιμοποιείται — δεν χρεώνεται</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
              <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Αν μεγαλώσετε πέρα από τη ζώνη σας, <strong>τίποτα δεν κλειδώνει</strong>. Η νέα
                τιμή ισχύει από την επόμενη ανανέωση και τη βλέπετε πάντα από πριν.
              </p>
            </div>
          </div>

          {requiresContact ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-base font-semibold text-amber-900">Κατόπιν συνεννόησης</h2>
              <p className="text-sm text-amber-900/90 mt-2 leading-relaxed">
                Το μέγεθός σας ξεπερνά το πλάνο που τιμολογείται αυτόματα. Σε αυτή την κλίμακα
                συμφωνούμε πλάνο μαζί σας — στείλτε μας μήνυμα και επανερχόμαστε με πρόταση.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center justify-center h-11 px-6 rounded-xl bg-amber-800 text-white text-sm font-semibold hover:bg-amber-900 transition-colors"
              >
                Επικοινωνία
              </Link>
            </div>
          ) : (
          <>
          {/* ---------- Διάρκεια ---------- */}
          <div className="surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Διάρκεια χρέωσης</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quote.quotes.map((q) => {
                const isSelected = q.duration === duration;
                return (
                  <button
                    key={q.duration}
                    type="button"
                    onClick={() => {
                      setDuration(q.duration);
                      setCouponApplied(false);
                      setCouponDiscount(0);
                    }}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative rounded-xl border p-4 text-left transition-colors',
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-border bg-white hover:border-zinc-300'
                    )}
                  >
                    {q.discountPercent > 0 && (
                      <span
                        className={cn(
                          'absolute top-3 right-3 text-2xs font-semibold rounded-full px-2 py-0.5',
                          isSelected ? 'bg-emerald-400 text-zinc-950' : 'bg-emerald-50 text-emerald-700'
                        )}
                      >
                        −{q.discountPercent}%
                      </span>
                    )}
                    <p className={cn('text-xs font-medium', isSelected ? 'text-zinc-400' : 'text-zinc-600')}>
                      {DURATION_LABEL[q.duration]}
                    </p>
                    <p className="text-xl font-semibold mt-1 tabular-nums">
                      {pricingUtils.formatPrice(q.monthlyWithVat)}
                    </p>
                    <p className={cn('text-2xs mt-0.5', isSelected ? 'text-zinc-400' : 'text-zinc-500')}>
                      /μήνα με ΦΠΑ
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------- Ανάλυση & πληρωμή ---------- */}
          {selected && (
            <div className="surface p-5 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900">Ανάλυση χρέωσης</h2>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-600">Πλατφόρμα · {selected.platformTier.label}</dt>
                  <dd className="text-zinc-900 tabular-nums">
                    {pricingUtils.formatPrice(selected.platformTier.monthly)}/μήνα
                  </dd>
                </div>
                {selected.academyTier && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">Ακαδημία · {selected.academyTier.label}</dt>
                    <dd className="text-zinc-900 tabular-nums">
                      {pricingUtils.formatPrice(selected.academyTier.monthly)}/μήνα
                    </dd>
                  </div>
                )}

                {selected.discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Έκπτωση {DURATION_LABEL[selected.duration].toLowerCase()}ς χρέωσης</dt>
                    <dd className="tabular-nums">−{selected.discountPercent}%</dd>
                  </div>
                )}

                {couponApplied && couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Κουπόνι {couponInput.toUpperCase()}</dt>
                    <dd className="tabular-nums">−{pricingUtils.formatPrice(couponDiscount)}</dd>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t border-border">
                  <dt className="font-semibold text-zinc-900">
                    Σύνολο για {selected.duration} {selected.duration === 1 ? 'μήνα' : 'μήνες'}
                  </dt>
                  <dd className="text-lg font-semibold text-zinc-900 tabular-nums">
                    {pricingUtils.formatPrice(finalTotal)}
                  </dd>
                </div>
                <p className="text-2xs text-zinc-500 text-right">περιλαμβάνει ΦΠΑ 24%</p>
              </dl>

              {/* Κουπόνι */}
              <div className="pt-2">
                {couponApplied ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-800">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Το κουπόνι εφαρμόστηκε
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCouponApplied(false);
                        setCouponInput('');
                        setCouponDiscount(0);
                      }}
                      aria-label="Αφαίρεση κουπονιού"
                      className="text-emerald-700 hover:text-emerald-900"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
                      <input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          setCouponError('');
                        }}
                        placeholder="Κωδικός κουπονιού"
                        aria-label="Κωδικός κουπονιού"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-sm placeholder:text-zinc-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || couponLoading}
                      className="h-10 px-4 rounded-lg border border-border bg-white text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Εφαρμογή'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-600 mt-1.5">{couponError}</p>}
              </div>

              <button
                type="button"
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Προετοιμασία πληρωμής…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Πληρωμή {pricingUtils.formatPrice(finalTotal)}
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-2xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Ασφαλής πληρωμή μέσω Stripe
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  Οι ημέρες που απομένουν διατηρούνται
                </span>
              </div>
            </div>
          )}
          </>
          )}
        </>
      )}
    </div>
  );
}
