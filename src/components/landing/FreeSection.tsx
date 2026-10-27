import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';

const INCLUDED = [
  'Απεριόριστα γήπεδα και κρατήσεις',
  'Σελίδα online κρατήσεων και QR',
  'Επιβεβαίωση κρατήσεων με email',
  'Επαναλαμβανόμενες κρατήσεις',
  'Πελάτες, είσπραξη και αναφορές εσόδων',
  'Υποστήριξη από εμάς',
];

export default function FreeSection() {
  return (
    <section id="free" className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-600/10 rounded-[100%] blur-[120px] pointer-events-none" />

      <div className="max-w-[560px] mx-auto relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-tight">
            Κόστος; <span className="text-emerald-400">Μηδέν.</span>
          </h2>
          <p className="text-zinc-400 text-lg mt-4 font-light">
            Όλες οι λειτουργίες κρατήσεων είναι δωρεάν για το γήπεδό σας.
          </p>
        </div>

        <div className="bg-[#0B151C] border border-emerald-500/30 rounded-3xl p-8 md:p-10 shadow-[0_0_60px_-20px_rgba(116,238,22,0.35)]">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-bold text-white tracking-tight">0€</span>
            <span className="text-zinc-400">τον μήνα</span>
          </div>
          <p className="text-sm text-zinc-400 mt-2">Χωρίς συνδρομή, χωρίς κάρτα, χωρίς δέσμευση.</p>

          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 text-zinc-200">
                <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/for-venues"
            className="mt-10 w-full h-12 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold flex items-center justify-center gap-2 transition-colors"
          >
            Δημιουργία λογαριασμού <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 leading-relaxed">
          Η δωρεάν χρήση ισχύει για την τρέχουσα περίοδο και ενδέχεται να αλλάξει στο μέλλον.
        </p>
      </div>
    </section>
  );
}
