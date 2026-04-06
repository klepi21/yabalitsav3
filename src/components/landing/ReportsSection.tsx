'use client';
import { BarChart3 } from 'lucide-react';
import Image from 'next/image';

export default function ReportsSection() {
  return (
    <section id="reports" className="py-24 px-6 border-t border-white/5 bg-[#03090C] relative w-full overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-lighten">
          <Image src="/bg_reports.png" alt="Reports Background" fill className="object-cover object-center" quality={60} sizes="100vw" />
        </div>
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
  );
}
