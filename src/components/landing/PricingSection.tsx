'use client';
import { Zap, Shield, CheckCircle2, Check } from 'lucide-react';
import Link from 'next/link';
import { pricingUtils } from '@/lib/pricing';

export default function PricingSection() {
  return (
    <section id="pricing" className="py-32 px-6 border-t border-white/5 bg-[#03090C] relative w-full overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10 w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6">
              Απλή προσέγγιση. <span className="text-emerald-400">Ξεκάθαρη τιμή.</span>
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl font-light max-w-2xl mx-auto">
              Επιλέξτε τη συνδρομή που ταιριάζει στις ανάγκες της δικής σας επιχείρησης. Χωρίς κρυφές χρεώσεις, χωρίς περιορισμούς.
            </p>
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-[12px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 italic"><Zap className="w-3 h-3 text-emerald-500" /> Δωρεαν για 15 ημερες</span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"><Shield className="w-3 h-3 text-emerald-500" /> Ολες οι λειτουργιες</span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Χωρις καρτα</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-[1000px] mx-auto">
            {pricingUtils.getAllPlans().map((plan) => {
              const isPopular = plan.popular;
              const duration = plan.durationMonths || 1;
              const monthlyPrice = pricingUtils.calculateMonthlyPrice(plan.basePrice, duration as 1 | 6 | 12);
              const totalPrice = pricingUtils.calculateTotalPrice(plan.basePrice, duration as 1 | 6 | 12);
              
              return (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 ${
                    isPopular 
                      ? 'bg-[#0B151C] border-emerald-500/50 shadow-[0_0_50px_rgba(52,211,153,0.15)] md:-translate-y-4' 
                      : 'bg-[#040D12]/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-black text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase">
                        ΠΙΟ ΔΗΜΟΦΙΛΕΣ
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm mb-6">{plan.description}</p>
                  
                  <div className="mb-8">
                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-black text-white">{pricingUtils.formatPrice(totalPrice).replace('€', '')}</span>
                      <span className="text-emerald-400 font-bold text-xl">€</span>
                      <span className="text-zinc-500 mb-1 ml-1">{duration === 1 ? '/ μήνα' : 'συνολικά'}</span>
                    </div>
                    {duration > 1 && (
                      <div className="inline-block mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-sm font-semibold tracking-wide">
                        Βγαίνει {pricingUtils.formatPrice(monthlyPrice).replace('€', '')}€ / μήνα
                      </div>
                    )}
                    <p className={`text-xs text-zinc-500 font-medium ${duration > 1 ? 'mt-3' : 'mt-2'}`}>περιλαμβάνει ΦΠΑ 24%</p>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 shrink-0 ${isPopular ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        <span className="text-zinc-300 text-sm leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link 
                    href="https://www.yabalitsa.com/for-venues"
                    className={`w-full text-center py-4 rounded-xl font-bold transition-all ${
                      isPopular 
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-black' 
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    Ξεκινήστε τώρα
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
  );
}
