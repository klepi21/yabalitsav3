'use client';
import { CalendarDays, QrCode, MailCheck, Repeat, Users, Lock } from 'lucide-react';
import Image from 'next/image';

const FEATURES = [
  {
    icon: CalendarDays,
    tone: 'bg-emerald-500/20 text-emerald-400',
    title: 'Ημερολόγιο χωρίς διπλοκρατήσεις',
    text: 'Όλα τα γήπεδά σας σε ένα ημερολόγιο, σε προβολή εβδομάδας ή ημέρας. Κάθε ώρα ελέγχεται αυτόματα πριν κλειστεί.',
  },
  {
    icon: QrCode,
    tone: 'bg-blue-500/20 text-blue-400',
    title: 'Δική σας σελίδα κρατήσεων',
    text: 'Οι παίκτες βλέπουν τις ελεύθερες ώρες και κλείνουν μόνοι τους, από link ή από το QR που κολλάτε στο γήπεδο.',
  },
  {
    icon: MailCheck,
    tone: 'bg-orange-500/20 text-orange-400',
    title: 'Επιβεβαίωση με email',
    text: 'Κάθε online κράτηση περνά από κωδικό επαλήθευσης, ώστε να έρχονται μόνο πραγματικοί πελάτες. Εσείς την εγκρίνετε με ένα πάτημα.',
  },
  {
    icon: Repeat,
    tone: 'bg-purple-500/20 text-purple-400',
    title: 'Σταθερές ομάδες',
    text: 'Η ομάδα που παίζει κάθε Τρίτη στις 21:00 κλείνεται μία φορά για όλες τις εβδομάδες, με επαναλαμβανόμενη κράτηση.',
  },
  {
    icon: Users,
    tone: 'bg-pink-500/20 text-pink-400',
    title: 'Πελάτες και είσπραξη',
    text: 'Ιστορικό για κάθε πελάτη και είσπραξη ανά παίκτη, για να ξέρετε ποιος πλήρωσε και τι απομένει.',
  },
  {
    icon: Lock,
    tone: 'bg-emerald-500/20 text-emerald-400',
    title: 'Έσοδα με PIN',
    text: 'Οι αναφορές εσόδων ανοίγουν μόνο με τον PIN σας, ακόμα κι αν το προσωπικό έχει πρόσβαση στο ημερολόγιο.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-32 w-full relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-overlay">
        <Image src="/bg_features.png" alt="" fill className="object-cover object-center" quality={60} sizes="100vw" />
      </div>
      <div className="absolute top-40 left-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10 w-full">
        <div className="text-center mb-20 relative z-10">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6">
            Ό,τι χρειάζεται για τις κρατήσεις.<br />
            <span className="text-emerald-400">Τίποτα παραπάνω.</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Αφήστε πίσω το τετράδιο και τα μηνύματα στο κινητό. Το Yabalitsa κρατά το πρόγραμμα του γηπέδου σας οργανωμένο, από τον υπολογιστή ή από το κινητό.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {FEATURES.map(({ icon: Icon, tone, title, text }) => (
            <div
              key={title}
              className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_-5px_rgba(116,238,22,0.1)]"
            >
              <div className={`h-12 w-12 rounded-xl ${tone} flex items-center justify-center mb-6`}>
                <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
