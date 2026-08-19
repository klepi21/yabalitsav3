'use client';

import Link from 'next/link';
import { Building2, Users, MessageCircle } from 'lucide-react';

/**
 * Εμφανίζεται όταν το κέντρο έφτασε το όριο του self-serve πλάνου.
 *
 * Επίτηδες ΔΕΝ διαβάζεται σαν σφάλμα: ο πελάτης δεν έκανε κάτι λάθος —
 * μεγάλωσε. Τα υπάρχοντα δεδομένα παραμένουν πλήρως λειτουργικά· μόνο η
 * δημιουργία νέων εγγραφών περιμένει να συμφωνηθεί πλάνο.
 */
export default function PlanLimitNotice({
  kind,
  current,
  limit,
}: {
  kind: 'pitches' | 'athletes';
  current: number;
  limit: number;
}) {
  const isPitches = kind === 'pitches';
  const Icon = isPitches ? Building2 : Users;
  const noun = isPitches ? 'γήπεδα' : 'αθλητές';

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-amber-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-amber-800" aria-hidden="true" />
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-amber-900">
              Ξεπεράσατε το αυτόματο πλάνο
            </h2>
            <p className="text-sm text-amber-900/90 mt-1 leading-relaxed">
              Έχετε <strong>{current} {noun}</strong> — το όριο του πλάνου που τιμολογείται
              αυτόματα είναι {limit}. Σε αυτό το μέγεθος συμφωνούμε πλάνο μαζί σας, αντί να
              το υπολογίζει το σύστημα.
            </p>
          </div>

          <p className="text-sm text-amber-900/90 leading-relaxed">
            <strong>Τίποτα δεν σταμάτησε.</strong> Κρατήσεις, ακαδημία, πληρωμές και αναφορές
            λειτουργούν κανονικά — μόνο η προσθήκη νέων {noun} περιμένει τη συμφωνία.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-amber-800 text-white text-sm font-semibold hover:bg-amber-900 transition-colors"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Επικοινωνία για πλάνο
            </Link>
            <Link
              href="/management/settings/renewal"
              className="inline-flex items-center h-10 px-5 rounded-lg border border-amber-300 bg-white text-amber-900 text-sm font-semibold hover:bg-amber-100 transition-colors"
            >
              Δείτε τη συνδρομή σας
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
