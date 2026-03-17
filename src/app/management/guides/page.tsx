'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toGreekUpperCase } from '@/lib/utils';
import Image from 'next/image';
import {
  Loader2,
  Rocket,
  Calendar,
  Goal,
  Users,
  BarChart3,
  Settings,
  Search,
  Zap,
  CalendarDays,
  RefreshCw,
  Lightbulb,
  PlusCircle,
  Clock,
  Ban,
  Euro,
  ClipboardList,
  PieChart,
  UserPlus,
  Globe,
  Megaphone,
  Building2,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Trophy,
  Dumbbell,
  FileText,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-100/50 bg-white p-3 ${className}`}>
      {children}
    </div>
  );
}

function StepBox({ color, icon: Icon, title, children }: { color: 'blue' | 'amber' | 'emerald'; icon: React.ElementType; title: string; children: React.ReactNode }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-100/50', title: 'text-blue-900', text: 'text-blue-800', icon: 'bg-blue-100 text-blue-600' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-100/50', title: 'text-amber-900', text: 'text-amber-800', icon: 'bg-amber-100 text-amber-600' },
    emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-100/50', title: 'text-emerald-900', text: 'text-emerald-800', icon: 'bg-emerald-100 text-emerald-600' },
  };
  const c = colorMap[color];
  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-3.5`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center justify-center w-6 h-6 rounded-md ${c.icon}`}>
          <Icon className="h-3 w-3" />
        </div>
        <h4 className={`text-xs font-black uppercase tracking-tight ${c.title}`}>{toGreekUpperCase(title)}</h4>
      </div>
      <div className={`text-[11px] leading-relaxed font-medium ${c.text}`}>{children}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-100/50 bg-zinc-50/30 p-4">
      <h4 className="text-xs font-black text-zinc-900 mb-2 uppercase tracking-tight">{toGreekUpperCase(title)}</h4>
      <div className="text-[11px] leading-relaxed text-zinc-500 font-medium">{children}</div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, color = 'emerald' }: { icon: React.ElementType; title: string; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600',
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${colorMap[color] || colorMap.emerald}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-sm font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase(title)}</h3>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-zinc-500">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-zinc-400" />
          <span className="text-[11px] leading-tight">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TipsList({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-zinc-700">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
            <span className="text-[11px] font-bold leading-tight">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GuidesPage() {
  const { user, venueOwner, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !venueOwner) router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
  }, [user, venueOwner, isLoading, router, pathname]);

  if (isLoading || !venueOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">
      <div className="flex items-center gap-2.5 pb-1 border-b border-zinc-50">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 text-white shadow-sm">
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
            {toGreekUpperCase('Οδηγίες Χρήσης')}
          </h1>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">
            {toGreekUpperCase('Αναλυτικός οδηγός για όλες τις λειτουργίες')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="getting-started">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-zinc-100/80 p-1 rounded-xl">
          <TabsTrigger value="getting-started" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Rocket className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Ξεκινώντας')}</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Κρατήσεις')}</span>
          </TabsTrigger>
          <TabsTrigger value="pitches" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Goal className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Γήπεδα')}</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Πελάτες')}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Αναφορές')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Settings className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Ρυθμίσεις')}</span>
          </TabsTrigger>
          <TabsTrigger value="academy" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Ακαδημία')}</span>
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Trophy className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Τουρνουά')}</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Dumbbell className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('Προπονήσεις')}</span>
          </TabsTrigger>
          <TabsTrigger value="fse" className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Search className="h-3.5 w-3.5" />
            <span>{toGreekUpperCase('FSE')}</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Getting Started Panel */}
        <TabsContent value="getting-started">
          <SectionCard>
            <div className="mb-5 pb-5 border-b border-zinc-50">
                <h2 className="text-base font-black tracking-tight text-zinc-900 mb-0.5 uppercase">
                {toGreekUpperCase('Ξεκινώντας')}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                {toGreekUpperCase('Το Yabalitsa Management σάς βοηθά να διαχειριστείτε πλήρως τις εγκαταστάσεις σας.')}
                </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <SectionHeading icon={Rocket} title="1. Πλοήγηση στο Σύστημα" color="blue" />
                <p className="text-sm text-zinc-500 ml-[42px]">
                  Το μενού πλοήγησης βρίσκεται στα αριστερά της οθόνης και περιλαμβάνει:
                </p>
                <ul className="ml-[42px] space-y-2 text-sm text-zinc-500 list-disc pl-4">
                  <li><span className="font-medium text-zinc-700">Πίνακας Ελέγχου</span> - Επισκόπηση και γρήγορες ενέργειες</li>
                  <li><span className="font-medium text-zinc-700">Κρατήσεις</span> - Διαχείριση ημερολογίου και κρατήσεων</li>
                  <li><span className="font-medium text-zinc-700">Γήπεδα</span> - Ρύθμιση γηπέδων και διαθεσιμότητας</li>
                  <li><span className="font-medium text-zinc-700">Πελάτες</span> - Διαχείριση πελατολογίου</li>
                  <li><span className="font-medium text-zinc-700">Ακαδημία</span> - Αθλητές, προπονητές, γονείς, τμήματα, προπονήσεις</li>
                  <li><span className="font-medium text-zinc-700">Τουρνουά</span> - Πρωταθλήματα, ομάδες, βαθμολογίες, αγώνες</li>
                  <li><span className="font-medium text-zinc-700">Αναφορές</span> - Στατιστικά και αναλύσεις</li>
                  <li><span className="font-medium text-zinc-700">Ρυθμίσεις</span> - Παραμετροποίηση, υποστήριξη Telegram</li>
                </ul>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Zap} title="2. Πρώτα Βήματα" color="amber" />
                <StepBox color="emerald" icon={CheckCircle2} title="Συνιστώμενη σειρά ενεργειών:">
                  <ol className="list-decimal ml-4 space-y-1.5 text-sm">
                    <li>Ρυθμίστε τα στοιχεία της επιχείρησής σας στις Ρυθμίσεις</li>
                    <li>Προσθέστε τα γήπεδά σας με τιμές και ωράρια</li>
                    <li>Εξοικειωθείτε με το ημερολόγιο κρατήσεων</li>
                    <li>Δοκιμάστε να καταχωρήσετε μια κράτηση</li>
                    <li>Δημιουργήστε τμήματα και αθλητές στην Ακαδημία</li>
                    <li>Καταγράψτε προπονήσεις και απουσιολόγιο</li>
                    <li>Διοργανώστε τουρνουά με αυτόματη βαθμολογία</li>
                  </ol>
                </StepBox>
                <div className="rounded-xl overflow-hidden border border-zinc-100/60">
                  <Image src="/pinakaselegxou.png" alt="Πίνακας Ελέγχου" width={1280} height={720} className="w-full h-auto" />
                </div>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="3. Χρήσιμες Συμβουλές" color="amber" />
                <TipsList items={[
                  'Χρησιμοποιείτε πάντα 24ωρη μορφή ώρας (π.χ. 20:00)',
                  'Συμπληρώστε σωστά τα στοιχεία ΑΦΜ και ΔΟΥ για την τιμολόγηση',
                  'Ελέγχετε τακτικά τις αναφορές για την πορεία της επιχείρησης',
                  'Κρατάτε ενημερωμένα τα στοιχεία των πελατών',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 2. Bookings Panel */}
        <TabsContent value="bookings">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Διαχείριση Κρατήσεων</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Το σύστημα κρατήσεων σας επιτρέπει να διαχειρίζεστε εύκολα το ημερολόγιο των γηπέδων σας.
            </p>

            <div className="space-y-8">
              {/* Quick Booking */}
              <div className="space-y-3">
                <SectionHeading icon={Zap} title="Γρήγορη Κράτηση" color="blue" />
                <StepBox color="blue" icon={Zap} title="Βήματα Γρήγορης Κράτησης:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Κλικ στο κουμπί «+ Γρήγορη Κράτηση» στον Πίνακα Ελέγχου</li>
                    <li>Συμπληρώστε τα υποχρεωτικά πεδία:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Όνομα Πελάτη</li>
                        <li>Τηλέφωνο</li>
                        <li>Γήπεδο</li>
                        <li>Ημερομηνία & Ώρα</li>
                      </ul>
                    </li>
                    <li>Επιλέξτε τη διάρκεια (μονό ή διπλό slot)</li>
                    <li>Επιβεβαιώστε την τιμή</li>
                    <li>Αποθηκεύστε την κράτηση</li>
                  </ol>
                </StepBox>
              </div>

              {/* Calendar Views */}
              <div className="space-y-3">
                <SectionHeading icon={CalendarDays} title="Προβολές Ημερολογίου" color="emerald" />
                <div className="grid gap-4">
                  <InfoCard title="Ημερήσια Προβολή">
                    <BulletList items={[
                      'Εμφανίζει όλα τα slots της ημέρας για κάθε γήπεδο',
                      'Εύκολη επισκόπηση διαθεσιμότητας',
                      'Drag & drop για μετακίνηση κρατήσεων',
                      'Κλικ σε κενό slot για νέα κράτηση',
                    ]} />
                    <div className="mt-3 rounded-xl overflow-hidden border border-zinc-100/60">
                      <Image src="/daily.png" alt="Ημερήσια Προβολή" width={1280} height={720} className="w-full h-auto" />
                    </div>
                  </InfoCard>
                  <InfoCard title="Εβδομαδιαία Προβολή">
                    <BulletList items={[
                      'Επισκόπηση ολόκληρης της εβδομάδας',
                      'Φιλτράρισμα ανά γήπεδο',
                      'Εύκολη πλοήγηση με βελάκια',
                      'Προβολή συνολικών κρατήσεων/εσόδων',
                    ]} />
                    <div className="mt-3 rounded-xl overflow-hidden border border-zinc-100/60">
                      <Image src="/weekly.png" alt="Εβδομαδιαία Προβολή" width={1280} height={720} className="w-full h-auto" />
                    </div>
                  </InfoCard>
                </div>
              </div>

              {/* Recurring Bookings */}
              <div className="space-y-3">
                <SectionHeading icon={RefreshCw} title="Επαναλαμβανόμενες Κρατήσεις" color="amber" />
                <StepBox color="amber" icon={RefreshCw} title="Οδηγός Επαναλαμβανόμενων Κρατήσεων:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Επιλέξτε «Επαναλαμβανόμενη» στη φόρμα κράτησης</li>
                    <li>Ορίστε τη συχνότητα:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Ημερήσια (κάθε Χ ημέρες)</li>
                        <li>Εβδομαδιαία (κάθε Χ εβδομάδες)</li>
                      </ul>
                    </li>
                    <li>Καθορίστε τον αριθμό επαναλήψεων</li>
                    <li>Το σύστημα θα ελέγξει τη διαθεσιμότητα για όλες τις ημερομηνίες</li>
                    <li>Επιβεβαιώστε τη δημιουργία των κρατήσεων</li>
                  </ol>
                  <div className="mt-3 text-sm opacity-80">
                    <strong>Σημείωση:</strong> Αν κάποια ημερομηνία δεν είναι διαθέσιμη, θα ενημερωθείτε πριν την ολοκλήρωση.
                  </div>
                </StepBox>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές & Καλές Πρακτικές" color="amber" />
                <TipsList items={[
                  'Επιβεβαιώνετε πάντα τα στοιχεία επικοινωνίας του πελάτη',
                  'Χρησιμοποιείτε τις σημειώσεις για ειδικές απαιτήσεις',
                  'Ελέγχετε τακτικά τις επαναλαμβανόμενες κρατήσεις',
                  'Ενημερώνετε έγκαιρα την κατάσταση των κρατήσεων',
                  'Αξιοποιήστε τα φίλτρα για καλύτερη οργάνωση',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 3. Pitches Panel */}
        <TabsContent value="pitches">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Διαχείριση Γηπέδων</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Ρυθμίστε και διαχειριστείτε τα γήπεδά σας με λεπτομέρεια. Καθορίστε τιμές, ωράρια, και ειδικές περιόδους.
            </p>

            <div className="space-y-8">
              {/* Adding New Pitch */}
              <div className="space-y-3">
                <SectionHeading icon={PlusCircle} title="Προσθήκη Νέου Γηπέδου" color="blue" />
                <StepBox color="blue" icon={PlusCircle} title="Βήματα Δημιουργίας:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Μεταβείτε στην ενότητα «Γήπεδα»</li>
                    <li>Κλικ στο κουμπί «+ Προσθήκη Γηπέδου»</li>
                    <li>Συμπληρώστε τα βασικά στοιχεία:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Όνομα γηπέδου (π.χ. &quot;Γήπεδο 1&quot;)</li>
                        <li>Τύπος (5x5, 6x6, 7x7, 8x8, 11x11)</li>
                        <li>Τιμή ανά slot</li>
                        <li>Διάρκεια slot (60, 90, 120 λεπτά)</li>
                      </ul>
                    </li>
                    <li>Ορίστε τα προεπιλεγμένα ωράρια λειτουργίας</li>
                    <li>Αποθηκεύστε τις ρυθμίσεις</li>
                  </ol>
                  <div className="mt-3 rounded-xl overflow-hidden border border-zinc-100/60">
                    <Image src="/newpitch.png" alt="Προσθήκη Νέου Γηπέδου" width={1280} height={720} className="w-full h-auto" />
                  </div>
                </StepBox>
              </div>

              {/* Operating Hours */}
              <div className="space-y-3">
                <SectionHeading icon={Clock} title="Ωράρια Λειτουργίας" color="emerald" />
                <div className="grid gap-4">
                  <InfoCard title="Προεπιλεγμένα Ωράρια">
                    <BulletList items={[
                      'Ορίστε ώρες έναρξης/λήξης ανά ημέρα',
                      'Επιλέξτε κλειστές ημέρες',
                      'Καθορίστε διαφορετικά ωράρια για αργίες',
                      'Αυτόματος υπολογισμός διαθέσιμων slots',
                    ]} />
                  </InfoCard>
                  <InfoCard title="Ειδικά Ωράρια">
                    <BulletList items={[
                      'Δημιουργία εξαιρέσεων για συγκεκριμένες ημέρες',
                      'Προσωρινή αλλαγή ωραρίου',
                      'Ορισμός εποχιακών ωραρίων',
                    ]} />
                  </InfoCard>
                </div>
              </div>

              {/* Closed Dates */}
              <div className="space-y-3">
                <SectionHeading icon={Ban} title="Κλειστές Ημερομηνίες" color="amber" />
                <StepBox color="amber" icon={Ban} title="Διαχείριση Κλειστών Περιόδων:">
                  <div className="space-y-4 text-sm">
                    <ul className="space-y-2">
                      <li>1. Μεταβείτε στην επεξεργασία γηπέδου</li>
                      <li>2. Επιλέξτε την ενότητα «Κλειστές Ημερομηνίες»</li>
                      <li>3. Προσθέστε νέα περίοδο με:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Ημερομηνία έναρξης</li>
                          <li>Ημερομηνία λήξης</li>
                          <li>Αιτία (προαιρετικά)</li>
                        </ul>
                      </li>
                    </ul>
                    <div className="text-sm opacity-80">
                      <strong>Σημείωση:</strong> Οι κλειστές περίοδοι εμποδίζουν αυτόματα νέες κρατήσεις.
                    </div>
                  </div>
                </StepBox>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <SectionHeading icon={Euro} title="Τιμολόγηση" color="emerald" />
                <div className="grid gap-4">
                  <InfoCard title="Βασική Τιμολόγηση">
                    <BulletList items={[
                      'Ορισμός βασικής τιμής ανά slot',
                      'Διαφορετικές τιμές ανά τύπο γηπέδου',
                      'Αυτόματος υπολογισμός για διπλά slots',
                    ]} />
                  </InfoCard>
                  <InfoCard title="Ειδικές Τιμές">
                    <BulletList items={[
                      'Εκπτώσεις για συγκεκριμένες ώρες',
                      'Ειδικές τιμές για επαναλαμβανόμενες κρατήσεις',
                      'Προσφορές για μη δημοφιλείς ώρες',
                    ]} />
                  </InfoCard>
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές & Καλές Πρακτικές" color="amber" />
                <TipsList items={[
                  'Δώστε ξεκάθαρα ονόματα στα γήπεδα για εύκολη αναγνώριση',
                  'Ενημερώνετε έγκαιρα τις κλειστές ημερομηνίες',
                  'Διατηρείτε ενημερωμένες τις τιμές και τα ωράρια',
                  'Χρησιμοποιείτε τις σημειώσεις για ειδικές συνθήκες',
                  'Ελέγχετε τακτικά τη διαθεσιμότητα των γηπέδων',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 4. Customers Panel */}
        <TabsContent value="customers">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Διαχείριση Πελατών</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Διαχειριστείτε αποτελεσματικά το πελατολόγιό σας και παρακολουθήστε το ιστορικό κρατήσεων.
            </p>

            <div className="space-y-8">
              {/* Customer List */}
              <div className="space-y-3">
                <SectionHeading icon={ClipboardList} title="Λίστα Πελατών" color="blue" />
                <div className="grid gap-4">
                  <InfoCard title="Προβολή & Αναζήτηση">
                    <BulletList items={[
                      'Πλήρης λίστα πελατών με βασικά στοιχεία',
                      'Γρήγορη αναζήτηση με όνομα ή τηλέφωνο',
                      'Φιλτράρισμα βάσει συχνότητας επισκέψεων',
                      'Ταξινόμηση με διάφορα κριτήρια',
                    ]} />
                  </InfoCard>
                  <InfoCard title="Στοιχεία Πελάτη">
                    <BulletList items={[
                      'Προσωπικά στοιχεία (όνομα, τηλέφωνο, email)',
                      'Ιστορικό κρατήσεων',
                      'Συνολικά έσοδα από τον πελάτη',
                      'Προτιμήσεις γηπέδων και ωρών',
                    ]} />
                  </InfoCard>
                </div>
              </div>

              {/* Adding New Customer */}
              <div className="space-y-3">
                <SectionHeading icon={UserPlus} title="Προσθήκη Νέου Πελάτη" color="emerald" />
                <StepBox color="blue" icon={UserPlus} title="Βήματα Προσθήκης:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Κλικ στο κουμπί «+ Νέος Πελάτης»</li>
                    <li>Συμπληρώστε τα υποχρεωτικά πεδία:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Ονοματεπώνυμο</li>
                        <li>Τηλέφωνο επικοινωνίας</li>
                        <li>Email (προαιρετικό)</li>
                      </ul>
                    </li>
                    <li>Προσθέστε προαιρετικές σημειώσεις</li>
                    <li>Αποθηκεύστε τα στοιχεία</li>
                  </ol>
                </StepBox>
              </div>

              {/* Customer Management */}
              <div className="space-y-3">
                <SectionHeading icon={RefreshCw} title="Διαχείριση Στοιχείων" color="amber" />
                <div className="grid gap-4">
                  <InfoCard title="Επεξεργασία Στοιχείων">
                    <BulletList items={[
                      'Ενημέρωση προσωπικών στοιχείων',
                      'Προσθήκη/επεξεργασία σημειώσεων',
                      'Καταγραφή προτιμήσεων',
                    ]} />
                  </InfoCard>
                  <InfoCard title="Ιστορικό & Στατιστικά">
                    <BulletList items={[
                      'Προβολή όλων των κρατήσεων',
                      'Ανάλυση συχνότητας επισκέψεων',
                      'Προτιμώμενες ημέρες/ώρες',
                      'Συνολικά έσοδα και τάσεις',
                    ]} />
                  </InfoCard>
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές & Καλές Πρακτικές" color="amber" />
                <TipsList items={[
                  'Διατηρείτε ενημερωμένα τα στοιχεία επικοινωνίας',
                  'Καταγράφετε ιδιαίτερες προτιμήσεις στις σημειώσεις',
                  'Παρακολουθείτε το ιστορικό για καλύτερη εξυπηρέτηση',
                  'Αξιοποιήστε τα στατιστικά για προσωποποιημένες προσφορές',
                  'Σεβαστείτε το GDPR και την προστασία προσωπικών δεδομένων',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 5. Reports Panel */}
        <TabsContent value="reports">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Αναφορές & Στατιστικά</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Αναλύστε την απόδοση της επιχείρησής σας με λεπτομερείς αναφορές και στατιστικά στοιχεία.
            </p>

            <div className="space-y-8">
              {/* Revenue Reports */}
              <div className="space-y-3">
                <SectionHeading icon={Euro} title="Αναφορές Εσόδων" color="emerald" />
                <div className="grid gap-4">
                  <InfoCard title="Συνολικά Έσοδα">
                    <BulletList items={[
                      'Ημερήσια, εβδομαδιαία, μηνιαία έσοδα',
                      'Σύγκριση με προηγούμενες περιόδους',
                      'Ανάλυση ανά γήπεδο',
                      'Μέση τιμή ανά κράτηση',
                    ]} />
                  </InfoCard>
                  <InfoCard title="Γραφήματα Εσόδων">
                    <BulletList items={[
                      'Γραφική απεικόνιση τάσεων',
                      'Συγκριτικά διαγράμματα',
                      'Προβλέψεις εσόδων',
                    ]} />
                  </InfoCard>
                </div>
              </div>

              {/* Booking Analytics */}
              <div className="space-y-3">
                <SectionHeading icon={PieChart} title="Ανάλυση Κρατήσεων" color="blue" />
                <StepBox color="blue" icon={PieChart} title="Στατιστικά Κρατήσεων:">
                  <ul className="space-y-2 text-sm">
                    <li>Συνολικός αριθμός κρατήσεων
                      <ul className="list-disc ml-6 mt-1">
                        <li>Ανά περίοδο</li>
                        <li>Ανά γήπεδο</li>
                        <li>Ανά ώρα/ημέρα</li>
                      </ul>
                    </li>
                    <li>Ποσοστό πληρότητας
                      <ul className="list-disc ml-6 mt-1">
                        <li>Συνολική πληρότητα</li>
                        <li>Ανά γήπεδο</li>
                        <li>Ανά χρονική ζώνη</li>
                      </ul>
                    </li>
                    <li>Δημοφιλείς ώρες και ημέρες</li>
                    <li>Ανάλυση ακυρώσεων</li>
                  </ul>
                </StepBox>
              </div>

              {/* Customer Analytics */}
              <div className="space-y-3">
                <SectionHeading icon={Users} title="Ανάλυση Πελατών" color="amber" />
                <div className="grid gap-4">
                  <InfoCard title="Στατιστικά Πελατών">
                    <BulletList items={[
                      'Top πελάτες (συχνότητα/έσοδα)',
                      'Νέοι vs επαναλαμβανόμενοι πελάτες',
                      'Μέσος όρος κρατήσεων ανά πελάτη',
                      'Ανάλυση συμπεριφοράς πελατών',
                    ]} />
                  </InfoCard>
                  <InfoCard title="Τάσεις & Προβλέψεις">
                    <BulletList items={[
                      'Εποχιακές διακυμάνσεις',
                      'Προβλέψεις ζήτησης',
                      'Ανάλυση τιμολογιακής πολιτικής',
                    ]} />
                  </InfoCard>
                </div>
              </div>

              {/* Coming Soon */}
              <div className="space-y-3">
                <SectionHeading icon={ArrowRight} title="Προσεχώς" color="amber" />
                <StepBox color="amber" icon={ArrowRight} title="Μελλοντικές Λειτουργίες:">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εξαγωγή αναφορών σε Excel/PDF</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προσαρμοσμένες αναφορές</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αυτοματοποιημένη αποστολή email</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Κοινή χρήση με λογιστή/συνεργάτες</li>
                  </ul>
                </StepBox>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές & Καλές Πρακτικές" color="amber" />
                <TipsList items={[
                  'Ελέγχετε τακτικά τις αναφορές για έγκαιρη λήψη αποφάσεων',
                  'Συγκρίνετε δεδομένα με προηγούμενες περιόδους',
                  'Αξιοποιήστε τα στατιστικά για βελτιστοποίηση τιμών',
                  'Παρακολουθείτε τάσεις για καλύτερο προγραμματισμό',
                  'Κρατάτε αρχείο εξαγόμενων αναφορών',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 6. Settings Panel */}
        <TabsContent value="settings">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Ρυθμίσεις Συστήματος</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Διαμορφώστε το σύστημα σύμφωνα με τις ανάγκες της επιχείρησής σας.
            </p>

            <div className="space-y-8">
              {/* Business Details */}
              <div className="space-y-3">
                <SectionHeading icon={Building2} title="Στοιχεία Επιχείρησης" color="blue" />
                <StepBox color="blue" icon={Building2} title="Βασικές Πληροφορίες:">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Επωνυμία επιχείρησης</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Διεύθυνση γηπέδου</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Πόλη</li>
                    <li>Στοιχεία επικοινωνίας:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Email επιχείρησης</li>
                        <li>Τηλέφωνο επικοινωνίας</li>
                      </ul>
                    </li>
                    <li>Φορολογικά στοιχεία:
                      <ul className="list-disc ml-6 mt-1">
                        <li>ΑΦΜ (9 ψηφία)</li>
                        <li>ΔΟΥ</li>
                      </ul>
                    </li>
                  </ul>
                </StepBox>
              </div>

              {/* Operating Hours */}
              <div className="space-y-3">
                <SectionHeading icon={Clock} title="Ωράριο Λειτουργίας" color="emerald" />
                <InfoCard title="Ρύθμιση Ωραρίου">
                  <BulletList items={[
                    'Καθορισμός ωρών ανά ημέρα',
                    'Επιλογή κλειστών ημερών',
                    'Ειδικά ωράρια αργιών',
                    'Εποχιακές προσαρμογές',
                  ]} />
                </InfoCard>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές & Καλές Πρακτικές" color="amber" />
                <TipsList items={[
                  'Διατηρείτε ενημερωμένα τα στοιχεία της επιχείρησης',
                  'Προσαρμόστε τους κανόνες κρατήσεων στις ανάγκες σας',
                  'Ελέγχετε τακτικά τα δικαιώματα των χρηστών',
                  'Ενημερώνετε έγκαιρα το ωράριο για ειδικές περιόδους',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 7. Academy Panel */}
        <TabsContent value="academy">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Ακαδημία</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Ολοκληρωμένη διαχείριση ακαδημίας — αθλητές, προπονητές, γονείς, τμήματα και έγγραφα.
            </p>

            <div className="space-y-8">
              <div className="space-y-3">
                <SectionHeading icon={Users} title="Κατηγορίες Χρηστών" color="blue" />
                <InfoCard title="Δυναμικές Κατηγορίες">
                  <BulletList items={[
                    'Αθλητής — ανάθεση σε πολλαπλά τμήματα, σύνδεση με γονέα',
                    'Γονέας — στοιχεία επικοινωνίας, σύνδεση με αθλητές',
                    'Προπονητής — ειδικότητα, δίπλωμα, ανάθεση τμημάτων',
                    'Διαχειριστής — πρόσβαση σε όλα τα δεδομένα',
                    'Δημιουργήστε δικές σας κατηγορίες με custom πεδία',
                  ]} />
                </InfoCard>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Trophy} title="Τμήματα (Squads)" color="emerald" />
                <StepBox color="emerald" icon={Trophy} title="Διαχείριση Τμημάτων:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Δημιουργήστε τμήματα με ηλικιακή κατηγορία (U6-U21, Ανδρών)</li>
                    <li>Αναθέστε προπονητές σε κάθε τμήμα</li>
                    <li>Προσθέστε αθλητές — κάθε αθλητής μπορεί να ανήκει σε πολλαπλά τμήματα</li>
                    <li>Από τη σελίδα τμήματος βλέπετε αθλητές, προπονητές και προπονήσεις</li>
                  </ol>
                </StepBox>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={FileText} title="Έγγραφα PDF" color="amber" />
                <InfoCard title="Ανέβασμα Αρχείων">
                  <BulletList items={[
                    'Ανεβάστε PDF αρχεία σε κάθε χρήστη (ιατρικά, συμβόλαια κ.λπ.)',
                    'Μέγιστο μέγεθος: 10MB ανά αρχείο',
                    'Απεριόριστος αριθμός αρχείων ανά χρήστη',
                    'Κατεβάστε ή διαγράψτε αρχεία ανά πάσα στιγμή',
                  ]} />
                </InfoCard>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές" color="amber" />
                <TipsList items={[
                  'Συνδέστε πάντα τους αθλητές με τους γονείς τους',
                  'Χρησιμοποιήστε τα τμήματα για οργανωμένη διαχείριση',
                  'Ανεβάστε ιατρικά πιστοποιητικά ως PDF στο προφίλ κάθε αθλητή',
                  'Δημιουργήστε custom κατηγορίες αν χρειάζεστε (π.χ. Φυσιοθεραπευτής)',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 8. Tournaments Panel */}
        <TabsContent value="tournaments">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Τουρνουά & Πρωταθλήματα</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Διοργανώστε τουρνουά με ομάδες, παίκτες, βαθμολογία και αυτόματη κλήρωση αγώνων.
            </p>

            <div className="space-y-8">
              <div className="space-y-3">
                <SectionHeading icon={Trophy} title="Δημιουργία Τουρνουά" color="blue" />
                <StepBox color="blue" icon={Trophy} title="Βήματα:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Μεταβείτε στα Τουρνουά → Νέο Τουρνουά</li>
                    <li>Συμπληρώστε: Όνομα, Τύπος (League/Knockout/Group+Knockout)</li>
                    <li>Επιλέξτε τύπο γηπέδου και γήπεδο</li>
                    <li>Ορίστε αγωνιστικές ημερομηνίες</li>
                    <li>Για League: επιλέξτε μονό (1×) ή διπλό (2×) γύρο</li>
                  </ol>
                </StepBox>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Users} title="Ομάδες & Παίκτες" color="emerald" />
                <InfoCard title="Διαχείριση Ομάδων">
                  <BulletList items={[
                    'Προσθέστε ομάδες με αρχηγό (όνομα, τηλέφωνο, email)',
                    'Κάθε ομάδα έχει ρόστερ παικτών με θέση (GK/DEF/MID/FWD)',
                    'Αριθμός φανέλας και σημαία αρχηγού',
                    'Στατιστικά ανά παίκτη: γκολ, ασίστ, κίτρινες, κόκκινες',
                  ]} />
                </InfoCard>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={CalendarDays} title="Αγώνες & Βαθμολογία" color="amber" />
                <StepBox color="amber" icon={CalendarDays} title="Διεξαγωγή Αγώνων:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Αυτόματη κλήρωση αγώνων (round-robin ή knockout bracket)</li>
                    <li>Προγραμματισμός αγώνων — αυτόματη δημιουργία Κλειστής Ημερομηνίας</li>
                    <li>Καταχώρηση σκορ → αυτόματη ανανέωση βαθμολογίας</li>
                    <li>Βαθμολογία: 3 βαθμοί νίκη, 1 ισοπαλία</li>
                    <li>Στατιστικά: σκόρερ, ασίστ, top scorers</li>
                  </ol>
                </StepBox>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές" color="amber" />
                <TipsList items={[
                  'Ξεκινήστε από Draft → Registration → Active',
                  'Προσθέστε πρώτα τις ομάδες, μετά κάντε κλήρωση αγώνων',
                  'Μετά την καταχώρηση σκορ, τα στατιστικά ενημερώνονται αυτόματα',
                  'Η ακύρωση αγώνα αφαιρεί αυτόματα την Κλειστή Ημερομηνία',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 9. Training Panel */}
        <TabsContent value="training">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Προπονήσεις</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Πρόγραμμα προπονήσεων, απουσιολόγιο και στατιστικά παρουσιών.
            </p>

            <div className="space-y-8">
              <div className="space-y-3">
                <SectionHeading icon={Dumbbell} title="Δημιουργία Προπόνησης" color="blue" />
                <StepBox color="blue" icon={Dumbbell} title="Βήματα:">
                  <ol className="list-decimal ml-4 space-y-2 text-sm">
                    <li>Ακαδημία → Προπονήσεις → Νέα Προπόνηση</li>
                    <li>Επιλέξτε τύπο: Προπόνηση, Φιλικό, Φυσική Κατάσταση, Τακτική, Αποκατάσταση</li>
                    <li>Ορίστε τμήμα, προπονητή, βοηθούς προπονητές</li>
                    <li>Καθορίστε ημερομηνία, ώρα έναρξης/λήξης</li>
                    <li>Προσθέστε ασκήσεις με χρονική διάρκεια</li>
                    <li>Γράψτε σημειώσεις προπονητή</li>
                  </ol>
                </StepBox>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={ClipboardList} title="Απουσιολόγιο" color="emerald" />
                <InfoCard title="Καταγραφή Παρουσιών">
                  <BulletList items={[
                    'Ανοίξτε μια προπόνηση → Tab «Απουσιολόγιο»',
                    'Φορτώνονται αυτόματα οι αθλητές του τμήματος',
                    'Επιλέξτε κατάσταση: Παρών, Απών, Αργοπορία, Τραυματίας',
                    'Προσθέστε σημείωση ανά αθλητή (προαιρετικό)',
                    'Γρήγορα κουμπιά: «Όλοι Παρόντες» / «Όλοι Απόντες»',
                  ]} />
                </InfoCard>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={BarChart3} title="Στατιστικά Παρουσιών" color="amber" />
                <InfoCard title="Αναλυτικά Στοιχεία">
                  <BulletList items={[
                    'Ποσοστό παρουσίας (%) ανά αθλητή',
                    'Top 5 κορυφαίες / χαμηλότερες παρουσίες',
                    'Φίλτρα: Τμήμα, Εβδομάδα, Μήνας, 3 μήνες, 6 μήνες',
                    'Πίνακας αθλητών: Παρών, Απών, Αργοπορία, Τραυματίας, progress bar',
                    'Μέσος όρος αθλητών ανά προπόνηση',
                  ]} />
                </InfoCard>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές" color="amber" />
                <TipsList items={[
                  'Συμπληρώνετε το απουσιολόγιο αμέσως μετά κάθε προπόνηση',
                  'Χρησιμοποιήστε τα στατιστικά για να εντοπίσετε αθλητές με χαμηλή παρουσία',
                  'Προσθέστε ασκήσεις στην προπόνηση για καλύτερο αρχείο',
                  'Ελέγξτε τα μηνιαία στατιστικά για εικόνα του τμήματος',
                  'Σημαδέψτε προπόνηση ως «Ολοκληρωμένη» αφού τελειώσει',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* 10. FSE Panel */}
        <TabsContent value="fse">
          <SectionCard>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">Football Search Engine (FSE)</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Κατανοήστε πώς λειτουργεί το FSE και πώς μπορείτε να αξιοποιήσετε τις online κρατήσεις.
            </p>

            <div className="space-y-8">
              {/* FSE Overview */}
              <div className="space-y-3">
                <SectionHeading icon={Search} title="Επισκόπηση FSE" color="blue" />
                <StepBox color="blue" icon={Search} title="Τι είναι το FSE:">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Μηχανή αναζήτησης γηπέδων</li>
                    <li>Φίλτρα αναζήτησης:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Ημερομηνία</li>
                        <li>Τύπος γηπέδου</li>
                        <li>Ώρα</li>
                        <li>Τοποθεσία</li>
                      </ul>
                    </li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εμφάνιση διαθέσιμων slots</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Online κρατήσεις</li>
                  </ul>
                </StepBox>
              </div>

              {/* Online Bookings */}
              <div className="space-y-3">
                <SectionHeading icon={Globe} title="Online Κρατήσεις" color="emerald" />
                <InfoCard title="Διαχείριση Online Κρατήσεων">
                  <BulletList items={[
                    'Αυτόματη ενημέρωση διαθεσιμότητας',
                    'Επιβεβαίωση κρατήσεων',
                    'Διαχείριση πληρωμών',
                    'Αυτόματες ειδοποιήσεις',
                  ]} />
                </InfoCard>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <SectionHeading icon={Euro} title="Τιμολόγηση" color="amber" />
                <StepBox color="amber" icon={Euro} title="Πλήρες Διαχειριστικό:">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> 30{'\u20AC'} / μήνα</li>
                    <li>Περιλαμβάνει:
                      <ul className="list-disc ml-6 mt-1">
                        <li>Πλήρης διαχείριση κρατήσεων</li>
                        <li>Διαχείριση πελατών και εσόδων</li>
                        <li>Ημερολόγιο (daily/weekly)</li>
                        <li>Επαναλαμβανόμενες κρατήσεις</li>
                        <li>Αναφορές και dashboards</li>
                        <li>Προτεραιότητα υποστήριξης</li>
                      </ul>
                    </li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Δωρεάν δοκιμαστική περίοδος 15 ημερών</li>
                  </ul>
                </StepBox>
              </div>

              {/* Visibility & Promotion */}
              <div className="space-y-3">
                <SectionHeading icon={Megaphone} title="Προβολή & Προώθηση" color="emerald" />
                <InfoCard title="Βελτιστοποίηση Προβολής">
                  <BulletList items={[
                    'Ενημερωμένες φωτογραφίες',
                    'Πλήρης περιγραφή εγκαταστάσεων',
                    'Ανταγωνιστική τιμολόγηση',
                    'Αξιολογήσεις πελατών',
                  ]} />
                </InfoCard>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                <SectionHeading icon={Lightbulb} title="Συμβουλές & Καλές Πρακτικές" color="amber" />
                <TipsList items={[
                  'Διατηρείτε ενημερωμένη τη διαθεσιμότητα',
                  'Απαντάτε γρήγορα στις online κρατήσεις',
                  'Προσφέρετε ανταγωνιστικές τιμές',
                  'Ενθαρρύνετε τις αξιολογήσεις από πελάτες',
                ]} />
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
