import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Instagram, Facebook } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Επικοινωνία | Yabalitsa',
  description: 'Επικοινωνήστε με την ομάδα του Yabalitsa. Είμαστε εδώ για να σας βοηθήσουμε να ψηφιοποιήσετε το αθλητικό σας κέντρο.',
  alternates: {
    canonical: 'https://www.yabalitsa.com/contact'
  }
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#040D12] text-white font-sans selection:bg-emerald-500/30">
      
      {/* HEADER exactly like homepage */}
      <header className="fixed top-0 w-full z-50 bg-[#040D12] border-b border-white/5 flex items-center justify-between text-[13px] font-medium tracking-wide">
        <div className="max-w-[1400px] mx-auto w-full px-6 py-5 flex items-center justify-between">
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
              <Link href="/#features" className="hover:text-emerald-400 transition">Λειτουργίες</Link>
              <Link href="/#academies" className="hover:text-emerald-400 transition">Ακαδημίες</Link>
              <Link href="/#pitches" className="hover:text-emerald-400 transition">Γήπεδα</Link>
              <Link href="/#reports" className="hover:text-emerald-400 transition">Αναφορές</Link>
              <Link href="/blog" className="hover:text-emerald-400 transition">Blog</Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Link href="/venue-login" className="hidden sm:flex px-4 py-2 rounded border border-zinc-600 bg-white/5 hover:bg-white/10 text-white transition">
                Σύνδεση
              </Link>
              <Link href="/for-venues" className="px-5 py-2 rounded bg-emerald-400 hover:bg-emerald-500 text-black font-bold transition">
                Ξεκινήστε δωρεάν
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-32 pb-24 px-6 min-h-[calc(100vh-100px)] flex items-center justify-center relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto w-full relative z-10 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight">
            Είμαστε εδώ <br className="hidden sm:block" />
            <span className="text-emerald-500">για εσάς</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-16">
            Θέλετε να μάθετε πώς το Yabalitsa μπορεί να βοηθήσει την εγκατάστασή σας;
            Επικοινωνήστε μαζί μας μέσω email ή ακολουθήστε μας στα social media.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Email Contact */}
            <a href="mailto:hello@yabalitsa.com" className="group p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Email</h3>
              <p className="text-zinc-400 text-sm">Πείτε μας ένα γεια!</p>
              <span className="mt-4 text-emerald-400 font-medium text-sm group-hover:text-emerald-300">hello@yabalitsa.com</span>
            </a>

            {/* Social Media - Instagram */}
            <a href="https://instagram.com/yabalitsa.app" target="_blank" rel="noopener noreferrer" className="group p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Instagram className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Instagram</h3>
              <p className="text-zinc-400 text-sm">Ακολουθήστε τα νέα μας</p>
              <span className="mt-4 text-emerald-400 font-medium text-sm group-hover:text-emerald-300">@yabalitsa.app</span>
            </a>

            {/* Social Media - Facebook */}
            <a href="https://facebook.com/yabalitsa" target="_blank" rel="noopener noreferrer" className="group p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all text-center flex flex-col items-center sm:col-span-2 md:col-span-1">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Facebook</h3>
              <p className="text-zinc-400 text-sm">Γίνετε μέλος της κοινότητας</p>
              <span className="mt-4 text-emerald-400 font-medium text-sm group-hover:text-emerald-300">Yabalitsa</span>
            </a>
          </div>
        </div>
      </main>

      {/* FOOTER exactly like homepage */}
      <footer className="border-t border-white/5 bg-[#010304] py-12 px-6 mt-0 relative z-10">
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
            <Link href="/contact" className="hover:text-emerald-400 transition">Contact Us</Link>
            <Link href="/blog" className="hover:text-emerald-400 transition">Blog / Άρθρα</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-emerald-400 transition">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
