'use client';

import { useState } from 'react';
import { Calendar, Play, X, ExternalLink } from 'lucide-react';

// Change this to your Calendly URL
const CALENDLY_URL = 'https://calendly.com/nikoskoukis99/30min';

export default function BookDemo() {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <>
      <section className="relative w-full bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-20 sm:py-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-emerald-500/3 blur-2xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Demo</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            Δείτε το Yabalitsa
            <br />
            <span className="text-emerald-400">σε δράση</span>
          </h2>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Κλείστε ένα δωρεάν ραντεβού 30 λεπτών και θα σας δείξουμε πώς το Yabalitsa
            μπορεί να απλοποιήσει τη διαχείριση του κέντρου ή της ακαδημίας σας.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowEmbed(true)}
              className="group flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-base rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Calendar className="h-5 w-5" />
              Κλείστε Demo
              <Play className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-4 text-zinc-400 hover:text-white font-bold text-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Άνοιγμα σε νέα καρτέλα
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              30 λεπτά
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Δωρεάν
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Χωρίς δεσμεύσεις
            </span>
          </div>
        </div>
      </section>

      {/* Calendly Embed Modal */}
      {showEmbed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl h-[85vh] mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowEmbed(false)}
              className="absolute top-3 right-3 z-10 h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-zinc-600" />
            </button>

            {/* Calendly iframe */}
            <iframe
              src={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=ffffff&text_color=18181b&primary_color=10b981`}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Book a Demo"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
