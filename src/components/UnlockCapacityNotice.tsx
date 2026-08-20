'use client';

import { useState } from 'react';
import { Building2, Users, Loader2, CreditCard } from 'lucide-react';
import { toast } from '@/lib/toast';
import { pricingUtils } from '@/lib/pricing';

const eur = (n: number) => pricingUtils.formatPrice(n);

/**
 * Εμφανίζεται όταν η ΝΕΑ εγγραφή θα έβγαζε τον πελάτη εκτός της ζώνης
 * που έχει πληρώσει.
 *
 * Δεν κλείνει τίποτα από όσα ήδη έχει — αφορά μόνο την προσθήκη. Πληρώνει
 * τη διαφορά αναλογικά για τις ημέρες που απομένουν και ξεκλειδώνει
 * αμέσως. Πριν, η προσθήκη ήταν δωρεάν μέχρι την ανανέωση και το ποσό
 * δεν εισπραττόταν ποτέ.
 */
export default function UnlockCapacityNotice({
  kind,
  current,
  amount,
}: {
  kind: 'pitches' | 'athletes';
  current: number;
  amount: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const isPitches = kind === 'pitches';
  const Icon = isPitches ? Building2 : Users;

  const handleUnlock = async () => {
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
          ...(isPitches ? { targetPitches: current + 1 } : { targetAthletes: current + 1 }),
        }),
      });

      const { clientSecret, error } = await res.json();
      if (error) {
        toast.error('Η αναβάθμιση δεν ολοκληρώθηκε', error);
        return;
      }
      window.location.href = `/payment/checkout?payment_intent=${clientSecret}`;
    } catch (err) {
      console.error('Unlock error:', err);
      toast.error('Υπήρξε σφάλμα', 'Δεν χρεωθήκατε. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-white shadow-e2 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-zinc-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
        </div>

        <div className="min-w-0 space-y-3 flex-1">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {isPitches ? 'Προσθήκη γηπέδου' : 'Προσθήκη αθλητή'}
            </h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              Έχετε <strong className="text-zinc-900">{current}</strong>{' '}
              {isPitches
                ? current === 1 ? 'γήπεδο' : 'γήπεδα'
                : current === 1 ? 'αθλητή' : 'αθλητές'}
              . Η επόμενη προσθήκη σας βγάζει από τη ζώνη που έχετε πληρώσει, οπότε καλύπτετε
              τη διαφορά για τις ημέρες που απομένουν:{' '}
              <strong className="text-zinc-900">{eur(amount)}</strong> με ΦΠΑ.
            </p>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            Όσα έχετε ήδη συνεχίζουν κανονικά. Μετά την πληρωμή η προσθήκη ξεκλειδώνει αμέσως
            και η νέα χωρητικότητα ισχύει μέχρι το τέλος της περιόδου σας.
          </p>

          <button
            type="button"
            onClick={handleUnlock}
            disabled={isLoading}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-60 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Προετοιμασία…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Πληρωμή {eur(amount)} και προσθήκη
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
