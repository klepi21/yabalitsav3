'use client';
import { Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function FinalCTASection() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-950/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-600/20 rounded-[100%] blur-[120px] pointer-events-none" />
        
        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 shadow-emerald-500 drop-shadow-lg">
            Ήρθε η ώρα να ανεβάσετε το <span className="text-emerald-400">γήπεδό σας</span>.
          </h2>
          <p className="text-zinc-400 text-xl mb-10 font-light max-w-2xl mx-auto">
            Γίνετε κομμάτι του οικοσυστήματος Yabalitsa, οργανωθείτε ψηφιακά και αυξήστε την αποδοτικότητά σας από την πρώτη εβδομάδα.
          </p>
          <div className="flex flex-col items-center justify-center">
            <Link 
              href="https://www.yabalitsa.com/for-venues" 
              className="w-full sm:w-auto px-8 py-4 font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-2xl transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)] flex items-center justify-center gap-3 hover:-translate-y-1"
            >
              Αποκτήστε Πρόσβαση (SaaS) <ChevronRight className="h-4 w-4" />
            </Link>
            <p className="mt-6 text-zinc-500 text-[12px] md:text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 opacity-80">
              <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
              15 Ημερες Δωρεαν • Χωρις Πιστωτικη Καρτα
            </p>
          </div>
        </div>
      </section>
  );
}
