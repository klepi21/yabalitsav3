'use client';
import { Zap, Trophy, LayoutDashboard, BarChart3, Smartphone, Shield } from 'lucide-react';
import Image from 'next/image';

export default function FeaturesSection() {
  return (
    <section id="features" className="py-32 w-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-overlay">
          <Image src="/bg_features.png" alt="Features Background" fill className="object-cover object-center" quality={60} sizes="100vw" />
        </div>
        <div className="absolute top-40 left-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto px-6 relative z-10 w-full">
        
        <div className="text-center mb-20 relative z-10">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6">
            Όλα όσα χρειάζεστε.<br />
            <span className="text-emerald-400">Σε μία μοναδική πλατφόρμα.</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Αφήστε πίσω τα σημειωματάρια και τα πολύπλοκα excel. Το Yabalitsa SaaS είναι σχεδιασμένο για την απόλυτη ψηφιακή αναβάθμιση του αθλητικού σας κέντρου.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {/* Feature 1 */}
          <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.1)]">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 overflow-hidden relative">
              <Zap className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Αστραπιαίες Κρατήσεις</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Διαχειριστείτε όλες τις κρατήσεις γηπέδων σε ένα έξυπνο ημερολόγιο. Γρήγορη προσθήκη, αυτόματος έλεγχος διαθεσιμότητας και ακυρώσεις με ένα κλικ.</p>
          </div>
          {/* Feature 2 */}
          <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.1)]">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 overflow-hidden relative">
              <Trophy className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Οργάνωση Ακαδημίας</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Μητρώο αθλητών, ιατρικά πιστοποιητικά (με αυτόματες ειδοποιήσεις λήξης) και τμήματα προπονήσεων, όλα νοικοκυρεμένα.</p>
          </div>
          {/* Feature 3 */}
          <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.1)]">
            <div className="h-12 w-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-6 overflow-hidden relative">
              <LayoutDashboard className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Έλεγχος Πληρωμών</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Τέλος στις χαμένες συνδρομές. Αυτόματη παρακολούθηση οφειλών μηνιαίως και καρτέλες για τους αθλητές που έχουν εκκρεμότητες.</p>
          </div>
          {/* Feature 4 */}
          <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.1)]">
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6 overflow-hidden relative">
              <BarChart3 className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Business Στατιστικά</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Ολοκληρωμένα reports εσόδων-εξόδων, πληρότητα γηπέδων ανά μέρα/ώρα και ανάλυση στοιχείων για αποδοτικότερες αποφάσεις.</p>
          </div>
          {/* Feature 5 */}
          <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.1)]">
            <div className="h-12 w-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-6 overflow-hidden relative">
              <Smartphone className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Mobile-First Σχεδιασμός</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Επειδή η δουλειά δεν γίνεται πάντα πίσω από ένα γραφείο, όλη η πλατφόρμα δουλεύει άψογα από το κινητό σας.</p>
          </div>
          {/* Feature 6 */}
          <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.1)]">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 overflow-hidden relative">
              <Shield className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Ασφάλεια Δεδομένων</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Πρόσβαση στο ταμείο με κρυπτογραφημένο PIN, ασφαλής τήρηση προσωπικών δεδομένων Ακαδημίας σε servers στο Cloud.</p>
          </div>
        </div>
        </div>
      </section>
  );
}
