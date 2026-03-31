import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, BarChart3, CheckCircle2, ArrowRight, Smartphone, LayoutDashboard, Target } from 'lucide-react';
import { ContactFooter } from '@/components/ui/contact-footer';

export const metadata: Metadata = {
  title: 'Διαχείριση Γηπέδου 5x5 | Σύγχρονο Λογισμικό Yabalitsa',
  description: 'Ανακαλύψτε το κορυφαίο λογισμικό για διαχείριση γηπέδου 5x5, 7x7 και αθλητικών εγκαταστάσεων. Ηλεκτρονικές κρατήσεις, συνδρομές ακαδημιών και reports.',
  alternates: {
    canonical: 'https://www.yabalitsa.com/logismiko-gipedou-5x5'
  }
};

export default function LogismikoGipedou5x5Page() {
  return (
    <div className="min-h-screen bg-white text-[#040D12] font-sans selection:bg-emerald-500/30">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/yabalo.png" alt="Yabalitsa Logo" width={140} height={28} className="cursor-pointer" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/venue-login" className="hidden sm:flex text-sm font-semibold text-zinc-600 hover:text-emerald-600 transition-colors">
              Σύνδεση
            </Link>
            <Link href="/for-venues" className="px-5 py-2.5 rounded-xl bg-[#040D12] hover:bg-zinc-800 text-white font-bold text-sm transition-all shadow-lg shadow-zinc-200">
              Ξεκινήστε Δωρεάν
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 overflow-hidden bg-[#F1F4F8]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-400/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-[1000px] mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-700 text-sm font-bold mb-8">
            <SparklesIcon className="w-4 h-4" />
            <span>Η Νο1 Πλατφόρμα στην Ελλάδα</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6 text-[#040D12]">
            Η Απόλυτη Διαχείριση <br className="hidden sm:block" />
            <span className="text-emerald-500">Γηπέδου 5x5</span> & Ακαδημίας
          </h1>
          
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Βάλτε τέλος στις διπλές κρατήσεις, τα χαμένα χαρτάκια και την πολύωρη τηλεφωνική επικοινωνία. 
            Το Yabalitsa είναι το εξειδικευμένο λογισμικό που σχεδιάστηκε για την πλήρη ψηφιακή διαχείριση σύγχρονων αθλητικών εγκαταστάσεων.
          </p>

          <Link href="/for-venues" className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 flex items-center gap-3">
            Δοκιμάστε το Δωρεάν για 15 Ημέρες <ArrowRight className="w-5 h-5" />
          </Link>
          
          <div className="flex items-center gap-6 mt-8 text-sm font-semibold text-zinc-500">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Δεν απαιτείται κάρτα</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Άμεση Ενεργοποίηση</span>
          </div>
        </div>
      </section>

      {/* BODY CONTENT - SEO FOCUSED */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 prose prose-lg prose-emerald text-zinc-600">
          
          <h2 className="text-3xl font-black text-[#040D12] mb-6">Τι είναι η Διαχείριση Γηπέδου 5x5 και γιατί χρειάζεστε Λογισμικό;</h2>
          <p>
            Η <strong>διαχείριση γηπέδου 5x5</strong> δεν αποτελεί πλέον μια απλή διαδικασία καταγραφής ονομάτων σε ένα τετράδιο. 
            Σε ένα άκρως ανταγωνιστικό περιβάλλον, οι ιδιοκτήτες αθλητικών εγκαταστάσεων και γηπέδων ποδοσφαίρου (5x5, 7x7, 11x11) 
            καλούνται να αντιμετωπίσουν καθημερινά μια σειρά προκλήσεων: ταυτόχρονες τηλεφωνικές κλήσεις, ακυρώσεις της τελευταίας στιγμής, 
            ανεξόφλητα υπόλοιπα από πελάτες ή ακαδημίες και κακή εξυπηρέτηση λόγω ανθρώπινων λαθών.
          </p>
          <p>
            Η υιοθέτηση ενός <strong>λογισμικού διαχείρισης γηπέδου (software management)</strong> όπως το Yabalitsa 
            αποτελεί τη μόνη αξιόπιστη λύση για να αυτοματοποιήσετε τη λειτουργία σας. Με το σωστό εργαλείο, κερδίζετε χρόνο, 
            μειώνετε τα λειτουργικά σας έξοδα και το κυριότερο: αυξάνετε τα έσοδα και την κερδοφορία της επιχείρησής σας, 
            καθώς δεν χάνετε πλέον καμία διαθέσιμη ώρα λόγω κακού προγραμματισμού.
          </p>

          <div className="my-16 grid grid-cols-1 md:grid-cols-3 gap-8 not-prose">
            <div className="bg-[#F1F4F8] p-8 rounded-3xl border border-zinc-100 relative">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 text-emerald-500">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#040D12] mb-3">Εύκολες Κρατήσεις</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Προβάλετε τη διαθεσιμότητα σε πραγματικό χρόνο και οργανώστε το ημερολόγιο χωρίς χαρτιά.
              </p>
            </div>
            <div className="bg-[#F1F4F8] p-8 rounded-3xl border border-zinc-100 relative">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 text-emerald-500">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#040D12] mb-3">Ακαδημίες & Συνδρομές</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Πλήρης έλεγχος των αθλητών, των μηνιαίων πληρωμών και του ιατρικού τους ιστορικού.
              </p>
            </div>
            <div className="bg-[#F1F4F8] p-8 rounded-3xl border border-zinc-100 relative">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 text-emerald-500">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#040D12] mb-3">Στατιστικά Εσόδων</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Δείτε άμεσα τα ημερήσια έσοδα, τα κέρδη και αναλύστε ποιες ώρες είναι περισσότερο κερδοφόρες.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-black text-[#040D12] mb-6">Τα Συχνότερα Προβλήματα που Λύνει το Yabalitsa</h2>
          
          <h3 className="text-xl font-bold text-[#040D12] mt-8 mb-4">1. Διπλές Κρατήσεις (Overbooking) & Ακυρώσεις</h3>
          <p>
            Δεν υπάρχει τίποτα χειρότερο για την εικόνα της εγκατάστασής σας από το να έρθουν δύο διαφορετικές παρέες 
            για να παίξουν την ίδια ακριβώς ώρα στο ίδιο γήπεδο. Με το <strong>έξυπνο ημερολόγιο κρατήσεων</strong> του Yabalitsa, 
            κάθε κράτηση (είτε μόνιμη, είτε μία φορά) αποθηκεύεται κεντρικά στο cloud, ενημερώνοντας το σύστημα σε δευτερόλεπτα 
            και αποτρέποντας από τη δημιουργία λαθών.
          </p>

          <h3 className="text-xl font-bold text-[#040D12] mt-8 mb-4">2. Χαμένα Έσοδα & Ανεξόφλητα Υπόλοιπα</h3>
          <p>
            Πόσες φορές ψάχνατε να βρείτε ποια ακαδημία δεν έχει πληρώσει τον τρέχοντα μήνα ή ποια παρέα έφυγε αφήνοντας 
            απλήρωτο το γήπεδο; Η πλατφόρμα μας σας παρέχει μία ξεκάθαρη εικόνα με το <strong>ποιος χρωστάει και πόσα</strong>, 
            δίνοντάς σας παράλληλα οικονομικές αναφορές (Reports) ανά μήνα και ανά πηγή εσόδων (Ακαδημίες ή Απλές Κρατήσεις).
          </p>

          <h3 className="text-xl font-bold text-[#040D12] mt-8 mb-4">3. Δυσκολία στην Οργάνωση της Αθλητικής Ακαδημίας</h3>
          <p>
            Αν διαθέτετε αθλητική ακαδημία (Ακαδημία Ποδοσφαίρου κ.ά.), τότε γνωρίζετε τον εφιάλτη της γραφειοκρατίας: 
            ιατρικά δελτία που λήγουν, επικοινωνία με τους προπονητές, δημιουργία γκρουπ προπόνησης (squads) και 
            έλεγχος των μηνιαίων συνδρομών. Το χαρακτηριστικό μας, <strong>Player Passport</strong>, δημιουργεί μια ψηφιακή 
            καρτέλα για κάθε αθλητή. Εκεί μπορείτε να βλέπετε τις συνδρομές του, τις αξιολογήσεις του, και να λαμβάνετε 
            ειδοποιήσεις όταν λήγει το ιατρικό του δελτίο!
          </p>

        </div>
      </section>

      {/* HIGHLIGHT FEATURES */}
      <section className="py-24 bg-[#040D12] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/5 blur-[150px] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
              Χαρακτηριστικά
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
              Ολοκληρωμένο Σύστημα<br /> για Κάθε Αθλητικό Κέντρο
            </h2>
            
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">Πίνακας Ελέγχου Αναφορών (Reports)</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Δείτε τα έσοδά σας, το ποσοστό πληρότητας των γηπέδων (5x5, 7x7) και συγκρίνετε απόδοση μήνα με το μήνα.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">Οργάνωση Squads & Προπονητών</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Χωρίστε τους αθλητές της ακαδημίας σας σε τμήματα, ορίστε προπονητές και διατηρήστε το ημερολόγιο προπονήσεων καθαρό.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">Πρόσβαση από Παντού (Cloud-Based)</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Διαχειριστείτε την επιχείρησή σας από οποιαδήποτε συσκευή: Υπολογιστή, Tablet ή και το Smartphone σας ενώ βρίσκεστε στο γήπεδο.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="relative">
             <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/50 shadow-2xl relative">
                <div className="absolute inset-x-0 top-0 h-12 border-b border-zinc-800 bg-zinc-900/80 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="pt-16 p-8 flex flex-col justify-center h-full gap-4 text-center">
                  <BarChart3 className="w-16 h-16 text-emerald-500/50 mx-auto" />
                  <h3 className="text-2xl font-bold text-white">Yabalitsa Dashboard</h3>
                  <p className="text-zinc-400">Διαθέσιμο με 15 Ημέρες Δωρεάν Δοκιμή</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-24 bg-[#F1F4F8]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-[#040D12] mb-6">
            Έτοιμοι να ψηφιοποιήσετε το Γήπεδό σας;
          </h2>
          <p className="text-lg text-zinc-600 mb-10 max-w-2xl mx-auto">
            Εκατοντάδες διαχειριστές εμπιστεύονται ήδη το <strong>λογισμικό διαχείρισης γηπέδου 5x5</strong> της Yabalitsa. 
            Αυξήστε τα έσοδά σας και κερδίστε χρόνο, σήμερα κιόλας.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/for-venues" className="px-10 py-5 bg-[#040D12] hover:bg-zinc-800 text-white font-black rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95 w-full sm:w-auto">
              Εγγραφή - 15 Ημέρες Δωρεάν
            </Link>
            <Link href="/for-venues" className="px-10 py-5 bg-white border border-zinc-200 hover:border-zinc-300 text-[#040D12] font-black rounded-2xl transition-all w-full sm:w-auto">
              Επικοινωνία μαζί μας
            </Link>
          </div>
        </div>
      </section>

      <ContactFooter />
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}
