'use client';

import Link from 'next/link';
import { ArrowLeft, LifeBuoy } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <p className="eyebrow mb-3">Σφάλμα 404</p>

        <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-900 mb-3">
          Η σελίδα δεν βρέθηκε
        </h1>

        <p className="text-base text-zinc-600 leading-relaxed mb-8">
          Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί. Ελέγξτε τη διεύθυνση
          ή επιστρέψτε στην αρχική.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-6 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Αρχική σελίδα
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-6 rounded-xl border border-border bg-white text-zinc-800 text-sm font-semibold hover:bg-zinc-50 transition-colors"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Επικοινωνία
          </Link>
        </div>
      </div>
    </div>
  );
}
