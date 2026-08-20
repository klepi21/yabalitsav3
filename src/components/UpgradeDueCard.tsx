'use client';

import { useState } from 'react';
import { ArrowUpCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { UpgradeQuote } from '@/lib/queries';
import { pricingUtils } from '@/lib/pricing';
import { days } from '@/lib/utils';

const eur = (n: number) => pricingUtils.formatPrice(n);

/**
 * Εμφανίζεται όταν η χρήση ξεπέρασε ό,τι πληρώθηκε.
 *
 * Η χρέωση είναι αναλογική στις ημέρες που απομένουν και ΡΗΤΗ: ο πελάτης
 * βλέπει το ποσό και αποφασίζει. Πριν, μια αναβάθμιση μέσα στην περίοδο
 * ήταν δωρεάν μέχρι την ανανέωση και μετά εμφανιζόταν ως ξαφνική αύξηση.
 */
export default function UpgradeDueCard({ upgrade }: { upgrade: UpgradeQuote }) {
  const [isLoading, setIsLoading] = useState(false);

  if (!upgrade?.owed) return null;

  const what = [
    upgrade.addedPlatform ? 'περισσότερα γήπεδα' : null,
    upgrade.addedAcademy ? 'ακαδημία' : null,
  ].filter(Boolean).join(' και ');

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser?.uid) {
        toast.error('Απαιτείται σύνδεση', 'Συνδεθείτε ξανά για να συνεχίσετε.');
        return;
      }

      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode: 'upgrade',
          userUid: auth.currentUser.uid,
          customerEmail: auth.currentUser.email,
        }),
      });

      const { clientSecret, error } = await res.json();
      if (error) {
        toast.error('Η αναβάθμιση δεν ολοκληρώθηκε', error);
        return;
      }
      window.location.href = `/payment/checkout?payment_intent=${clientSecret}`;
    } catch (err) {
      console.error('Upgrade error:', err);
      toast.error('Υπήρξε σφάλμα', 'Δεν χρεωθήκατε. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center">
          <ArrowUpCircle className="h-5 w-5 text-emerald-800" aria-hidden="true" />
        </div>

        <div className="min-w-0 space-y-3 flex-1">
          <div>
            <h2 className="text-base font-semibold text-emerald-950">Εκκρεμεί αναβάθμιση</h2>
            <p className="text-sm text-emerald-900/90 mt-1 leading-relaxed">
              Προσθέσατε {what || 'περισσότερα από όσα καλύπτει η συνδρομή σας'}. Για να
              καλυφθούν οι <strong>{days(Math.round(upgrade.daysRemaining))}</strong> που
              απομένουν, η διαφορά είναι{' '}
              <strong>{eur(upgrade.amountWithVat)}</strong> με ΦΠΑ.
            </p>
          </div>

          <p className="text-xs text-emerald-900/80 leading-relaxed">
            Χρεώνεστε μόνο για το υπόλοιπο της περιόδου — όχι για ολόκληρο τον χρόνο. Στην
            επόμενη ανανέωση η τιμή περιλαμβάνει ήδη το νέο μέγεθος.
          </p>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-900 disabled:opacity-60 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Προετοιμασία…
              </>
            ) : (
              `Αναβάθμιση — ${eur(upgrade.amountWithVat)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
