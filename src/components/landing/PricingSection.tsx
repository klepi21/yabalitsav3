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
              <span className="block mt-4 text-emerald-400/80 text-sm md:text-base font-medium">
                Διεθνείς λύσεις κοστίζουν 3-6x περισσότερο χωρίς ελληνική υποστήριξη.
              </span>
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
          
          {/* ================= COMPARISON SECTION ================= */}
          <div className="mt-32 max-w-[900px] mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Γιατί να αλλάξω τον τρόπο που δουλεύω;</h3>
            <p className="text-zinc-400 mb-12 max-w-xl mx-auto">Η παραμονή στο χαρτί και στο Excel δεν είναι δωρεάν. <span className="text-red-400">Σας κοστίζει σε χρόνο, λάθη και χαμένα έσοδα.</span></p>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    <th className="px-6 py-5">Λειτουργία</th>
                    <th className="px-6 py-5 text-center bg-red-500/5 text-red-400">Excel / Χαρτί</th>
                    <th className="px-6 py-5 text-center bg-emerald-500/5 text-emerald-400">Yabalitsa</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-t border-white/5">
                    <td className="px-6 py-5 font-medium">Έλεγχος Διαθεσιμότητας</td>
                    <td className="px-6 py-5 text-center text-zinc-600">Χειροκίνητος & επιρρεπής σε λάθη</td>
                    <td className="px-6 py-5 text-center text-emerald-400 font-bold">Αυτόματος & Αλάνθαστος</td>
                  </tr>
                  <tr className="border-t border-white/5">
                    <td className="px-6 py-5 font-medium">Λήξη Ιατρικών Πιστοποιητικών</td>
                    <td className="px-6 py-5 text-center text-zinc-600">Αδύνατο να ελεγχθεί έγκαιρα</td>
                    <td className="px-6 py-5 text-center text-emerald-400 font-bold">Αυτόματες Ειδοποιήσεις</td>
                  </tr>
                  <tr className="border-t border-white/5">
                    <td className="px-6 py-5 font-medium">Έλεγχος Χρεών & Πληρωμών</td>
                    <td className="px-6 py-5 text-center text-zinc-600">&quot;Ποιος μας χρωστάει;&quot; (Χάος)</td>
                    <td className="px-6 py-5 text-center text-emerald-400 font-bold">Zero-Debt Dashboard</td>
                  </tr>
                  <tr className="border-t border-white/5">
                    <td className="px-6 py-5 font-medium">Πρόσβαση από παντού (Mobile)</td>
                    <td className="px-6 py-5 text-center text-zinc-600">Πρέπει να είστε στο γραφείο</td>
                    <td className="px-6 py-5 text-center text-emerald-400 font-bold">Παντού μαζί σας (Cloud)</td>
                  </tr>
                  <tr className="border-t border-white/5">
                    <td className="px-6 py-5 font-medium">Αναφορές Εσόδων</td>
                    <td className="px-6 py-5 text-center text-zinc-600">Ώρες υπολογισμών & άγχος</td>
                    <td className="px-6 py-5 text-center text-emerald-400 font-bold">Real-time με 1 κλικ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 flex justify-center items-center gap-2 text-zinc-500 text-xs italic">
              <Shield className="w-4 h-4 text-emerald-500" />
              Μην αφήνετε την επιχείρησή σας στην τύχη. Αναβαθμίστε σήμερα.
            </div>
          </div>

          {/* ================= FAQ SECTION ================= */}
          <div className="mt-40 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-[1000px] mx-auto text-left">
            <div className="col-span-full mb-4">
              <h3 className="text-3xl md:text-4xl font-bold mb-4">Συχνές Ερωτήσεις</h3>
              <div className="h-1 w-20 bg-emerald-500 rounded-full" />
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-3">Είναι δύσκολο στη χρήση;</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Σχεδιάσαμε το Yabalitsa με γνώμονα την απλότητα. Αν ξέρετε να στέλνετε ένα μήνυμα, μπορείτε να διαχειριστείτε το γήπεδό σας. Χρειάζονται λιγότερο από 10 λεπτά για να εξοικειωθείτε πλήρως.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-3">Τι γίνεται αν σταματήσω τη συνδρομή;</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Τα δεδομένα σας ανήκουν σε εσάς. Αν αποφασίσετε να σταματήσετε, μπορείτε να κάνετε εξαγωγή όλων των στοιχείων (αθλητές, πελάτες, κρατήσεις) σε Excel. Καμία δέσμευση, καμία &quot;παγίδα&quot;.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-3">Μπορούν να το χρησιμοποιούν οι υπάλληλοί μου;</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Φυσικά! Μπορείτε να προσκαλέσετε coaches και γραμματεία στην πλατφόρμα, ορίζοντας ακριβώς τι επιτρέπεται να βλέπουν και να αλλάζουν (π.χ. μόνο κρατήσεις, χωρίς πρόσβαση στα οικονομικά).
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-3">Χρειάζεται εγκατάσταση;</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Όχι, το Yabalitsa είναι Cloud Software. Λειτουργεί μέσω browser σε οποιαδήποτε συσκευή (PC, Mac, Tablet, Mobile) χωρίς να κατεβάσετε τίποτα. Τα δεδομένα σας συγχρονίζονται αυτόματα παντού.
              </p>
            </div>
          </div>
        </div>
      </section>
  );
}
