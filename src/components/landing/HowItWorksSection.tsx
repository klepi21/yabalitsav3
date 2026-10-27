import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const STEPS = [
  {
    n: '1',
    title: 'Φτιάξτε λογαριασμό',
    text: 'Συμπληρώνετε τα στοιχεία του γηπέδου και επιβεβαιώνετε το email σας. Δεν χρειάζεται κάρτα.',
  },
  {
    n: '2',
    title: 'Προσθέστε τα γήπεδά σας',
    text: 'Για κάθε γήπεδο ορίζετε μέγεθος, διάρκεια, τιμή και ωράριο λειτουργίας ανά ημέρα.',
  },
  {
    n: '3',
    title: 'Μοιραστείτε το link',
    text: 'Στέλνετε τη σελίδα κρατήσεων στους πελάτες σας ή τυπώνετε το QR. Οι κρατήσεις έρχονται στο ημερολόγιό σας.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-24 px-6 border-t border-white/5 bg-[#03090C] relative w-full overflow-hidden">
      <div className="max-w-[1100px] mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
            Πώς ξεκινάτε
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-tight">
            Σε λειτουργία μέσα σε <span className="text-emerald-400">λίγα λεπτά</span>
          </h2>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <li key={step.n} className="relative bg-white/5 border border-white/10 rounded-3xl p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-zinc-950 font-bold mb-6">
                {step.n}
              </span>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <Link
            href="/for-venues"
            className="inline-flex items-center gap-2 text-white font-bold hover:text-emerald-400 transition-colors group"
          >
            Ξεκινήστε τώρα <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
