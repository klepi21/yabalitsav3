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
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-10 pb-32 w-full">
        {/* Glassmorphic Container for Readability */}
        <div className="flex flex-col items-center text-center max-w-[1100px] w-full mx-auto p-8 sm:p-12 md:p-20 rounded-[2.5rem] bg-[#040D12]/50 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] relative overflow-hidden">
          
          {/* Subtle glowing orb inside the glass box to make it pop even better */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-900/20 blur-[100px] rounded-full pointer-events-none" />

          <h1 className="relative z-10 text-[2.5rem] sm:text-[4rem] md:text-[5rem] lg:text-[6rem] font-medium leading-[1.1] tracking-tight mb-6">
            <span className="text-zinc-200 drop-shadow-md">Το μέλλον της διαχείρισης</span><br />
            <span className="text-zinc-100 flex items-center justify-center gap-4 flex-wrap mt-2 drop-shadow-lg">
              έγινε <span className="font-serif italic lowercase text-white tracking-normal px-2">digital</span> <span className="font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">+ Yabalitsa</span>
            </span>
          </h1>
          
          <p className="relative z-10 text-zinc-300 text-base md:text-xl lg:text-2xl max-w-4xl mx-auto mb-12 font-light leading-relaxed tracking-wide drop-shadow-md">
            Σας βοηθάμε να αυτοματοποιήσετε τις κρατήσεις σας, να ελέγχετε άμεσα τις συνδρομές των ακαδημιών και να εξοικονομείτε χρόνο, φέρνοντας όλη τη λειτουργία της εγκατάστασής σας σε ένα σύγχρονο οικοσύστημα.
          </p>

          <Link 
            href="/venue-login" 
            className="relative z-10 group px-8 py-4 font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-2xl transition-all duration-300 overflow-hidden shadow-[0_0_40px_-10px_rgba(52,211,153,0.5)] hover:shadow-[0_0_60px_-10px_rgba(52,211,153,0.7)] flex items-center gap-3 hover:scale-105 active:scale-95"
          >
            <span>Μπείτε στη Νέα Εποχή</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
