'use client';
import { Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PitchesSection() {
  return (
    <section id="pitches" className="py-24 relative w-full overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-overlay">
          <Image src="/bg_pitches.png" alt="Pitches Background" fill className="object-cover object-center" quality={60} sizes="100vw" />
        </div>
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
              Το booking system είναι καρδιά της εγκατάστασης. Σχεδιάσαμε ένα Mobile-First ημερολόγιο που σας επιτρέπει να προσθέτετε κρατήσεις &quot;στο φτερό&quot;, χωρίς overlaps και με ξεκάθαρη εικόνα του τζίρου.
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
  );
}
