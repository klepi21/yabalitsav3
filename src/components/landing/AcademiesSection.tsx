'use client';
import { Users, CheckCircle2, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AcademiesSection() {
  return (
    <section id="academies" className="py-24 px-6 overflow-hidden bg-[#03090C] border-y border-white/5 relative w-full">
        <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-screen">
          <Image src="/bg_academies.png" alt="Academies Background" fill className="object-cover object-center" quality={60} sizes="100vw" />
        </div>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
          
          <div className="order-2 lg:order-1 relative">
            <div className="relative bg-[#0B151C] border border-white/10 rounded-2xl shadow-2xl p-6 aspect-square max-h-[500px] flex flex-col gap-4 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent z-0 pointer-events-none" />
              <div className="flex items-center justify-between z-10 border-b border-white/5 pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Player Passport</h4>
                    <p className="text-[12px] text-zinc-400 uppercase tracking-widest">Μητρωο Αθλητων</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  Total: 124
                </div>
              </div>
              
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
                    {i === 1 && <div className="text-[12px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Ιατρικο Έληξε</div>}
                    {i === 2 && <div className="text-[12px] uppercase font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">Οφειλες 2 Μηνων</div>}
                    {i > 2 && <div className="text-[12px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Ενεργος</div>}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 bg-[#111C24]/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-20 hidden md:block">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-5 w-5 text-indigo-400" />
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
              Ελέγξτε τις πληρωμές, οργανώστε τις προπονήσεις και παρακολουθήστε την πορεία κάθε αθλητή ξεχωριστά. Δεν χρειάζεται πλέον να ρωτάτε &quot;ποιος χρωστάει&quot; ή &quot;ποιανού έληξε το χαρτί γιατρού&quot;.
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
  );
}
