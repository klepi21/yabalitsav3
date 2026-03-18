import Image from 'next/image';
import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#040D12] text-white font-sans overflow-hidden flex flex-col selection:bg-emerald-500/30">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-70"
        >
          <source src="/backvide.mp4" type="video/mp4" />
        </video>
        {/* Dark gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040D12]/80 via-transparent to-[#040D12] z-0" />
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
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/venue-login" className="hidden sm:flex items-center gap-1 text-zinc-300 hover:text-white transition">
            Για Παίκτες <span className="text-[10px]">↗</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/venue-login" className="hidden sm:flex px-4 py-2 rounded border border-zinc-600 bg-white/5 hover:bg-white/10 text-white transition">
              Σύνδεση
            </Link>
            <Link href="/venue-login" className="px-5 py-2 rounded bg-emerald-400 hover:bg-emerald-500 text-black font-bold transition">
              Ξεκινήστε δωρεάν
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-24 w-full h-full">
        {/* Glassmorphic Container for Readability */}
        <div className="flex flex-col items-center text-center max-w-[900px] w-full mx-auto p-6 sm:p-8 md:py-12 md:px-14 rounded-[2rem] bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden">
          
          {/* Subtle glowing orb inside the glass box */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

          <h1 className="relative z-10 text-[2rem] sm:text-[3rem] md:text-[4rem] lg:text-[4.5rem] font-medium leading-[1.1] tracking-tight mb-5">
            <span className="text-zinc-100 drop-shadow">Το μέλλον της διαχείρισης</span><br />
            <span className="text-white flex items-center justify-center gap-2 sm:gap-4 flex-wrap mt-1 sm:mt-2 drop-shadow-md">
              έγινε <span className="font-serif italic lowercase text-white tracking-normal px-1">digital</span> <span className="font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">+ Yabalitsa</span>
            </span>
          </h1>
          
          <p className="relative z-10 text-zinc-300 text-sm md:text-base lg:text-lg max-w-2xl mx-auto mb-8 font-light leading-relaxed tracking-wide drop-shadow">
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
    </div>
  );
}
