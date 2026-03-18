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
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen"
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
            <Link href="#features" className="hover:text-emerald-400 transition">Features</Link>
            <Link href="#academies" className="hover:text-emerald-400 transition">Academies</Link>
            <Link href="#pitches" className="hover:text-emerald-400 transition">Pitches</Link>
            <Link href="#reports" className="hover:text-emerald-400 transition">Reports</Link>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/venue-login" className="hidden sm:flex items-center gap-1 text-zinc-300 hover:text-white transition">
            For Players <span className="text-[10px]">↗</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/venue-login" className="hidden sm:flex px-4 py-2 rounded border border-zinc-600 bg-white/5 hover:bg-white/10 text-white transition">
              Log in
            </Link>
            <Link href="/venue-login" className="px-5 py-2 rounded bg-emerald-400 hover:bg-emerald-500 text-black font-bold transition">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-10 pb-32">
        <h1 className="text-[3rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6.5rem] font-medium leading-[1.1] tracking-tight mb-6">
          <span className="text-zinc-400">The future of sports</span><br />
          <span className="text-zinc-300 flex items-center justify-center gap-4 flex-wrap">
            is <span className="font-serif italic lowercase text-white tracking-normal px-2">digital</span> <span className="font-black text-emerald-400 shadow-emerald-400/50 drop-shadow-xl">+ Yabalitsa</span>
          </span>
        </h1>
        
        <p className="text-zinc-400 text-base md:text-xl lg:text-2xl max-w-3xl mx-auto mb-12 font-light leading-relaxed tracking-wide">
          We help you manage your pitches, track academy subscriptions automatically, and close your operational gaps to thrive in a digital-first world.
        </p>

        <Link 
          href="/venue-login" 
          className="group relative px-6 py-3 font-semibold text-white bg-black/60 backdrop-blur-lg border border-zinc-700/50 rounded-xl hover:bg-white/10 hover:border-emerald-500/50 transition-all duration-300 overflow-hidden shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-emerald-500/0 hover:shadow-emerald-500/20"
        >
          <span className="relative z-10">Join The Ecosystem</span>
        </Link>
      </main>
    </div>
  );
}
