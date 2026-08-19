'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#features', label: 'Λειτουργίες' },
  { href: '#academies', label: 'Ακαδημίες' },
  { href: '#pitches', label: 'Γήπεδα' },
  { href: '#reports', label: 'Αναφορές' },
  { href: '#pricing', label: 'Τιμές' },
  { href: '/blog', label: 'Άρθρα' },
];

/**
 * Το header είχε `hidden lg:flex` χωρίς εναλλακτική: κάτω από 1024px
 * εξαφανιζόταν όλη η πλοήγηση, και κάτω από 640px και το «Σύνδεση» —
 * ένας υπάρχων πελάτης δεν είχε τρόπο να μπει από το κινητό.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Άνοιγμα μενού"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-[#040D12]" role="dialog" aria-modal="true" aria-label="Μενού πλοήγησης">
          <div className="flex h-16 items-center justify-end px-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Κλείσιμο μενού"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav className="px-6 pt-4">
            <ul className="space-y-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-3.5 text-lg font-medium text-zinc-200 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 space-y-3 border-t border-white/10 pt-8">
              <Link
                href="/venue-login"
                onClick={() => setOpen(false)}
                className="flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Σύνδεση
              </Link>
              <Link
                href="/for-venues"
                onClick={() => setOpen(false)}
                className="flex h-12 items-center justify-center rounded-xl bg-emerald-400 text-base font-bold text-zinc-950 hover:bg-emerald-300 transition-colors"
              >
                Ξεκινήστε δωρεάν
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
