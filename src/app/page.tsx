import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Zap, Shield, CheckCircle2 } from 'lucide-react';
import HeroVideo from '@/components/HeroVideo';
import AnimatedLaptop from '@/components/AnimatedLaptop';
import BookDemo from '@/components/BookDemo';
import MobileNav from '@/components/landing/MobileNav';

// Dynamic imports for off-screen components to improve PageSpeed
const FeaturesSection = dynamic(() => import('@/components/landing/FeaturesSection'), {
  loading: () => <div className="py-32 h-[500px]" />,
  ssr: true
});
const HowItWorksSection = dynamic(() => import('@/components/landing/HowItWorksSection'), {
  loading: () => <div className="py-24 h-[500px]" />,
  ssr: true
});
const PitchesSection = dynamic(() => import('@/components/landing/PitchesSection'), {
  loading: () => <div className="py-24 h-[500px]" />,
  ssr: true
});
const ReportsSection = dynamic(() => import('@/components/landing/ReportsSection'), {
  loading: () => <div className="py-24 h-[500px]" />,
  ssr: true
});
const FreeSection = dynamic(() => import('@/components/landing/FreeSection'), {
  loading: () => <div className="py-32 h-[500px]" />,
  ssr: true
});
const FinalCTASection = dynamic(() => import('@/components/landing/FinalCTASection'), {
  loading: () => <div className="py-32 h-[300px]" />,
  ssr: true
});

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
        <header className="relative z-50 w-full max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between text-xs font-medium tracking-wide">
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
              <Link href="#how" className="hover:text-emerald-400 transition">Πώς ξεκινάτε</Link>
              <Link href="#pitches" className="hover:text-emerald-400 transition">Ημερολόγιο</Link>
              <Link href="#free" className="hover:text-emerald-400 transition">Δωρεάν</Link>
              <Link href="/blog" className="hover:text-emerald-400 transition">Blog </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/venue-login" className="hidden sm:flex px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors">
              Σύνδεση
            </Link>
            <Link href="/for-venues" className="hidden sm:flex px-5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold transition-colors">
              Ξεκινήστε δωρεάν
            </Link>
            <MobileNav />
          </div>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-4 lg:pt-10 pb-20 w-full h-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

          {/* Text Content Container (No large backgrounds) */}
          <div className="flex flex-col items-center text-center max-w-[1000px] w-full mx-auto relative z-10">
            <h1 className="text-[2.2rem] sm:text-[3.2rem] md:text-[4.2rem] lg:text-[4.8rem] font-bold leading-[1.1] tracking-tight mb-4 mt-6 max-w-[1100px]">
              <span className="text-zinc-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Βάλε online κρατήσεις</span><br />
              <span className="text-zinc-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">στα γήπεδά σου </span>
              <span className="text-emerald-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] uppercase">δωρεάν</span>
            </h1>

            <p className="text-emerald-400 text-lg md:text-2xl max-w-3xl mx-auto mb-10 font-bold leading-relaxed tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-4">
              Ημερολόγιο, σελίδα κρατήσεων και QR. <span className="text-white border-b-2 border-emerald-500">Χωρίς συνδρομή.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 md:mb-24">
              <Link
                href="/for-venues"
                className="group px-8 py-3.5 md:px-10 md:py-4 font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-2xl transition-all duration-300 overflow-hidden shadow-[0_0_30px_-5px_rgba(116,238,22,0.4)] hover:shadow-[0_0_40px_-5px_rgba(116,238,22,0.6)] flex items-center gap-3 hover:scale-105 active:scale-95 text-sm md:text-base w-full sm:w-auto justify-center"
              >
                <span>Ξεκινήστε δωρεάν</span>
              </Link>
              
              <Link
                href="#book-demo"
                className="group px-8 py-3.5 md:px-10 md:py-4 font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-2xl transition-all duration-300 flex items-center gap-3 hover:scale-105 active:scale-95 text-sm md:text-base w-full sm:w-auto justify-center backdrop-blur-sm"
              >
                <Zap className="w-4 h-4" />
                <span>Κλείστε Demo</span>
              </Link>
            </div>

            <div className="-mt-10 md:-mt-16 mb-24 md:mb-36 flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-2xs md:text-xs font-bold text-white/90 uppercase tracking-[0.2em] drop-shadow-lg">
                <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Δωρεάν</span>
                <span className="hidden sm:block w-1.5 h-1.5 bg-white/20 rounded-full" />
                <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-emerald-400" /> Χωρίς πιστωτική κάρτα</span>
                <span className="hidden sm:block w-1.5 h-1.5 bg-white/20 rounded-full" />
                <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Καμία δέσμευση</span>
              </div>
              <p className="text-2xs text-white/50 drop-shadow">
                Η δωρεάν χρήση ενδέχεται να αλλάξει στο μέλλον.
              </p>
            </div>
          </div>

          <AnimatedLaptop />
        </main>
      </section>

      {/* ================= OFF-SCREEN SECTIONS (DYNAMICALLY LOADED) ================= */}
      <FeaturesSection />
      <HowItWorksSection />
      <PitchesSection />
      <ReportsSection />
      <FreeSection />
      <BookDemo />
      <FinalCTASection />

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
            <span className="text-zinc-400 text-sm">© 2026 Yabalitsa. Με επιφύλαξη παντός δικαιώματος.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-400 font-medium">
            <Link href="/contact" className="hover:text-emerald-400 transition">Επικοινωνία</Link>
            <Link href="/blog" className="hover:text-emerald-400 transition">Άρθρα</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition">Όροι χρήσης</Link>
            <Link href="/privacy" className="hover:text-emerald-400 transition">Απόρρητο</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
