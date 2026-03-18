import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Trophy, BarChart3, Users, Zap, Shield, ChevronRight, CheckCircle2, LayoutDashboard, Target, Smartphone, Check } from 'lucide-react';
import HeroVideo from '@/components/HeroVideo';
import { pricingUtils } from '@/lib/pricing';

export default function RootPage() {
  return (
    <div className="w-full bg-[#040D12] text-white font-sans selection:bg-emerald-500/30">
      
      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-screen w-full flex flex-col overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <HeroVideo />
          {/* Dark gradient overlay to ensure text readability & blend to next section */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#040D12]/70 via-[#040D12]/40 to-[#040D12] z-0" />
        </div>

        {/* Header */}
        <header className="relative z-50 w-full max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between text-[13px] font-medium tracking-wide">
          <div className="flex items-center gap-10">
            <Link href="/">
              <Image
                src="/yabalo.png"
                alt="Yabalitsa"
                width={160}
                height={32}
                className="filter brightness-0 invert hover:opacity-80 transition cursor-pointer"
              />
            </Link>
            <nav className="hidden lg:flex items-center gap-8 text-zinc-300">
              <Link href="#features" className="hover:text-emerald-400 transition">Λειτουργίες</Link>
              <Link href="#academies" className="hover:text-emerald-400 transition">Ακαδημίες</Link>
              <Link href="#pitches" className="hover:text-emerald-400 transition">Γήπεδα</Link>
              <Link href="#reports" className="hover:text-emerald-400 transition">Αναφορές</Link>
              <Link href="/blog" className="hover:text-emerald-400 transition">Blog</Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Link href="/venue-login" className="hidden sm:flex px-4 py-2 rounded border border-zinc-600 bg-white/5 hover:bg-white/10 text-white transition">
                Σύνδεση
              </Link>
              <Link href="https://www.yabalitsa.com/for-venues" className="px-5 py-2 rounded bg-emerald-400 hover:bg-emerald-500 text-black font-bold transition">
                Ξεκινήστε δωρεάν
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-24 w-full h-full">
        {/* Glassmorphic Container for Readability */}
          <div className="flex flex-col items-center text-center max-w-[1100px] w-full mx-auto p-6 sm:p-6 md:py-8 md:px-20 rounded-[2rem] bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

            <h1 className="relative z-10 text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5rem] font-medium leading-[1.1] tracking-tight mb-4">
              <span className="text-zinc-100 drop-shadow">Το μέλλον της διαχείρισης</span><br />
              <span className="text-white flex items-center justify-center gap-2 md:gap-4 flex-wrap mt-1 sm:mt-2 drop-shadow-md">
                έγινε <span className="font-serif italic lowercase text-white tracking-normal px-1">digital</span>
                <span className="flex items-center gap-2 md:gap-3 font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] ml-1">
                  +
                  <Image 
                    src="/yabalo.png" 
                    alt="Yabalitsa Logo" 
                    width={320} 
                    height={64}
                    priority
                    fetchPriority="high"
                    quality={85}
                    sizes="(max-width: 768px) 200px, 320px"
                    className="w-[160px] sm:w-[200px] md:w-[260px] lg:w-[290px] h-auto filter brightness-0 invert drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] translate-y-[2px] md:translate-y-[4px]" 
                  />
                </span>
              </span>
            </h1>
            
            <p className="relative z-10 text-zinc-300 text-sm md:text-base lg:text-lg max-w-3xl mx-auto mb-6 font-light leading-relaxed tracking-wide drop-shadow">
              Σας βοηθάμε να αυτοματοποιήσετε τις κρατήσεις σας, να ελέγχετε τις συνδρομές των ακαδημιών και να εξοικονομείτε χρόνο σε ένα σύγχρονο οικοσύστημα.
            </p>

            <Link 
              href="/venue-login" 
              className="relative z-10 group px-6 py-3 md:px-8 md:py-3.5 font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-2xl transition-all duration-300 overflow-hidden shadow-[0_0_30px_-5px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_-5px_rgba(52,211,153,0.5)] flex items-center gap-3 hover:scale-105 active:scale-95 text-sm md:text-base"
            >
              <span>Μπείτε στη Νέα Εποχή</span>
            </Link>
          </div>
        </main>
      </section>

      {/* ================= LOGOS / TRUST SECTION ================= */}
      <section className="border-t border-b border-white/5 bg-[#03090C] py-10 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Εμπιστευονται το οικοσυστημα μας κορυφαιες εγκαταστασεις</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             {/* Replace with actual venue logos if you have them, simulating with text for now */}
             <div className="text-xl font-black font-serif italic text-zinc-300">Arena FC</div>
             <div className="text-xl font-black tracking-tighter text-zinc-300">CITY<span className="text-emerald-500">SPORTS</span></div>
             <div className="text-lg font-bold uppercase tracking-widest text-zinc-300 border-2 border-zinc-300 px-2">KINGS</div>
             <div className="text-xl font-medium tracking-tight text-zinc-300">Pro<span className="opacity-50">Academy</span></div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES GRID ================= */}
      <section id="features" className="py-32 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/bg_features.png')] bg-cover bg-center opacity-[0.15] pointer-events-none mix-blend-overlay" />
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

      {/* ================= ACADEMIES SHOWCASE ================= */}
      <section id="academies" className="py-24 px-6 overflow-hidden bg-[#03090C] border-y border-white/5 relative w-full">
        <div className="absolute inset-0 bg-[url('/bg_academies.png')] bg-cover bg-center opacity-[0.15] pointer-events-none mix-blend-screen" />
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
          
          <div className="order-2 lg:order-1 relative">
            {/* Fake Mockup UI for Academy */}
            <div className="relative bg-[#0B151C] border border-white/10 rounded-2xl shadow-2xl p-6 aspect-square max-h-[500px] flex flex-col gap-4 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent z-0 pointer-events-none" />
              <div className="flex items-center justify-between z-10 border-b border-white/5 pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Player Passport</h4>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Μητρωο Αθλητων</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  Total: 124
                </div>
              </div>
              
              {/* Fake List */}
              <div className="flex-1 flex flex-col gap-3 z-10 w-full mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 border-2 border-zinc-700" />
                      <div>
                        <div className="h-4 w-24 bg-white/20 rounded mb-1.5" />
                        <div className="h-2.5 w-16 bg-white/10 rounded" />
                      </div>
                    </div>
                    {i === 1 && <div className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Ιατρικο Έληξε</div>}
                    {i === 2 && <div className="text-[10px] uppercase font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">Οφειλες 2 Μηνων</div>}
                    {i > 2 && <div className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Ενεργος</div>}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Floating Glass Element */}
            <div className="absolute -bottom-10 -right-10 bg-[#111C24]/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-20 hidden md:block animate-pulse-slow">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-5 w-5 text-indigo-400" />
                <h4 className="font-bold text-sm text-white">Αξιολόγηση (Βαθμολογία)</h4>
              </div>
              <p className="text-xs text-zinc-400">Δημιουργία ψηφιακού PDF Report</p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
              Module Ακαδημιων
            </div>
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6 leading-tight">
              Γεννήσαμε το πιο έξυπνο <br/>
              <span className="text-emerald-400">Player Passport</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8 font-light leading-relaxed">
              Ελέγξτε τις πληρωμές, οργανώστε τις προπονήσεις και παρακολουθήστε την πορεία κάθε αθλητή ξεχωριστά. Δεν χρειάζεται πλέον να ρωτάτε "ποιος χρωστάει" ή "ποιανού έληξε το χαρτί γιατρού".
            </p>
            
            <ul className="space-y-4 mb-10">
              {['Αυτόματα Κόκκινα Alerts για ληγμένα ιατρικά', 'Καταγραφή πληρωμών ανά μήνα / έτος', 'Αξιολογήσεις αθλητών (Technical, Tactical, Physical)', 'Γκρουπάρισμα σε Τμήματα / Squads'].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-zinc-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <Link href="/venue-login" className="inline-flex items-center gap-2 text-white font-bold hover:text-emerald-400 transition-colors group">
              Γνωρίστε την Ακαδημία <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
        </div>
      </section>

      {/* ================= PITCHES / BOOKING SHOWCASE ================= */}
      <section id="pitches" className="py-24 relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-[url('/bg_pitches.png')] bg-cover bg-center opacity-[0.15] pointer-events-none mix-blend-overlay" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
          
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
              Διαχειριση Κρατησεων
            </div>
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6 leading-tight">
              Το ημερολόγιο που <br/>
              δεν κάνει <span className="underline decoration-emerald-500 underline-offset-8">λάθη.</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8 font-light leading-relaxed">
              Το booking system είναι καρδιά της εγκατάστασης. Σχεδιάσαμε ένα Mobile-First ημερολόγιο που σας επιτρέπει να προσθέτετε κρατήσεις "στο φτερό", χωρίς overlaps και με ξεκάθαρη εικόνα του τζίρου.
            </p>
            
            <ul className="space-y-4 mb-10">
              {['Live έλεγχος διαθεσιμότητας', 'Ρύθμιση τιμοκαταλόγου ανά γήπεδο 5x5 / 7x7 / 11x11', 'Αυτόματος υπολογισμός "Τιμή ανά Άτομο"', 'QR Code Scanning για γρήγορο Check-In'].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-zinc-300">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <Link href="/venue-login" className="inline-flex items-center gap-2 text-white font-bold hover:text-blue-400 transition-colors group">
              Δείτε το Ημερολόγιο <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="relative">
            {/* Fake Calendar Widget */}
            <div className="bg-[#0B151C] border border-white/10 rounded-2xl shadow-2xl p-6 relative z-10 overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-all duration-500">
               <div className="flex items-center justify-between mb-8">
                 <h4 className="font-bold text-white flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-400"/> Σήμερα</h4>
                 <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-xs font-bold border border-emerald-500/30">12 Κρατήσεις</div>
               </div>
               
               <div className="space-y-3 relative">
                 <div className="absolute top-0 bottom-0 left-[50px] w-px bg-white/5" />
                 
                 {[
                   { time: '17:00', name: 'Ομάδα Γιώργου', pitch: 'Γήπεδο 1 (5x5)', color: 'bg-emerald-500' },
                   { time: '18:30', name: 'Εταιρικό Τουρνουά', pitch: 'Γήπεδο 2 (7x7)', color: 'bg-blue-500' },
                   { time: '20:00', name: 'Ακαδημία K12', pitch: 'Main Pitch (11x11)', color: 'bg-orange-500' },
                 ].map((booking, idx) => (
                   <div key={idx} className="flex gap-4 relative z-10 w-full">
                     <div className="w-[40px] text-xs text-zinc-500 font-bold pt-2">{booking.time}</div>
                     <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer">
                       <div className="flex items-center gap-2 mb-1">
                         <div className={`w-2 h-2 rounded-full ${booking.color}`} />
                         <span className="font-bold text-white text-sm">{booking.name}</span>
                       </div>
                       <span className="text-xs text-zinc-400">{booking.pitch}</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="absolute -z-10 -bottom-10 -right-10 w-full h-full bg-blue-600/20 rounded-2xl blur-3xl opacity-50" />
          </div>
          
        </div>
      </section>

      {/* ================= REPORTS / INSIGHTS ================= */}
      <section id="reports" className="py-24 px-6 border-t border-white/5 bg-[#03090C] relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-[url('/bg_reports.png')] bg-cover bg-center opacity-[0.15] pointer-events-none mix-blend-lighten" />
        <div className="max-w-[800px] mx-auto text-center relative z-10 w-full">
          <div className="h-16 w-16 mx-auto bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6 leading-tight">
            Ξέρετε πόσα <span className="text-purple-400 font-serif italic">βγάλατε;</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-12 font-light leading-relaxed">
            Ασφαλές Reports Dashboard – προστατευμένο με PIN – που σας δείχνει τα έσοδα από κρατήσεις και ακαδημίες σε πραγματικό χρόνο. Γραφήματα, metrics και ανάλυση που βοηθάει κάθε μάνατζερ να κάνει καλύτερες επιλογές.
          </p>
          <div className="bg-[#0B151C] border border-white/10 rounded-3xl p-8 max-w-[600px] mx-auto shadow-2xl relative overflow-hidden group">
             {/* Fake chart visualization */}
             <div className="flex items-end justify-between h-[150px] gap-2 md:gap-4 mb-6 relative z-10 pb-4 border-b border-white/5">
                {[40, 60, 45, 80, 50, 90, 100].map((h, i) => (
                  <div key={i} className="w-full bg-gradient-to-t from-purple-500/20 to-purple-400/80 rounded-t-sm group-hover:from-purple-500/40 group-hover:to-purple-400 transition-all duration-500" style={{ height: `${h}%` }}></div>
                ))}
             </div>
             <div className="flex justify-between items-center relative z-10 text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-widest">Εσοδα Μηνα</span>
                <span className="text-2xl font-black text-white">€12,450</span>
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-[#0B151C] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
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

      {/* ================= FINAL CTA ================= */}
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="https://www.yabalitsa.com/for-venues" 
              className="w-full sm:w-auto px-8 py-4 font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-2xl transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)] flex items-center justify-center gap-3 hover:-translate-y-1"
            >
              Αποκτήστε Πρόσβαση (SaaS) <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/5 bg-[#010304] py-12 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/yabalo.png"
              alt="Yabalitsa"
              width={100}
              height={20}
              className="filter brightness-0 invert opacity-50 hover:opacity-100 transition"
            />
            <span className="text-zinc-600 text-sm">© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500 font-medium">
            <Link href="/" className="hover:text-emerald-400 transition">Contact Us</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-emerald-400 transition">Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
