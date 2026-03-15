'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="max-w-6xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Οδηγίες Χρήσης</h1>
        <p className="text-muted-foreground mt-2">
          Αναλυτικός οδηγός για όλες τις λειτουργίες του Yabalitsa Management
        </p>
      </div>

      <Tabs defaultValue="getting-started">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="getting-started" className="gap-1.5">
            <Rocket className="h-4 w-4" />
            <span>Ξεκινώντας</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Κρατήσεις</span>
          </TabsTrigger>
          <TabsTrigger value="pitches" className="gap-1.5">
            <Goal className="h-4 w-4" />
            <span>Γήπεδα</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span>Πελάτες</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>Αναφορές</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            <span>Ρυθμίσεις</span>
          </TabsTrigger>
          <TabsTrigger value="fse" className="gap-1.5">
            <Search className="h-4 w-4" />
            <span>FSE</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Getting Started Panel */}
        <TabsContent value="getting-started">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Ξεκινώντας με το Yabalitsa Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Το Yabalitsa Management σάς βοηθά να διαχειριστείτε πλήρως τις εγκαταστάσεις σας.
                Ακολουθήστε αυτόν τον οδηγό για να ξεκινήσετε.
              </p>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">1. Πλοήγηση στο Σύστημα</h3>
                  <p className="text-muted-foreground">
                    Το μενού πλοήγησης βρίσκεται στα αριστερά της οθόνης και περιλαμβάνει:
                  </p>
                  <ul className="ml-6 space-y-2 text-muted-foreground list-disc">
                    <li><strong className="text-foreground">Πίνακας Ελέγχου</strong> - Επισκόπηση και γρήγορες ενέργειες</li>
                    <li><strong className="text-foreground">Κρατήσεις</strong> - Διαχείριση ημερολογίου και κρατήσεων</li>
                    <li><strong className="text-foreground">Γήπεδα</strong> - Ρύθμιση γηπέδων και διαθεσιμότητας</li>
                    <li><strong className="text-foreground">Πελάτες</strong> - Διαχείριση πελατολογίου</li>
                    <li><strong className="text-foreground">Αναφορές</strong> - Στατιστικά και αναλύσεις</li>
                    <li><strong className="text-foreground">Ρυθμίσεις</strong> - Παραμετροποίηση συστήματος</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">2. Πρώτα Βήματα</h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-foreground">
                    <h4 className="font-medium mb-2">Συνιστώμενη σειρά ενεργειών:</h4>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Ρυθμίστε τα στοιχεία της επιχείρησής σας στις Ρυθμίσεις</li>
                      <li>Προσθέστε τα γήπεδά σας με τιμές και ωράρια</li>
                      <li>Εξοικειωθείτε με το ημερολόγιο κρατήσεων</li>
                      <li>Δοκιμάστε να καταχωρήσετε μια κράτηση</li>
                    </ol>
                  </div>
                  <div className="mt-3">
                    <div className="rounded-xl overflow-hidden border border-border">
                      <Image src="/pinakaselegxou.png" alt="Πίνακας Ελέγχου" width={1280} height={720} className="w-full h-auto" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    3. Χρήσιμες Συμβουλές
                  </h3>
                  <ul className="ml-6 space-y-2 text-muted-foreground list-disc">
                    <li>Χρησιμοποιείτε πάντα 24ωρη μορφή ώρας (π.χ. 20:00)</li>
                    <li>Συμπληρώστε σωστά τα στοιχεία ΑΦΜ και ΔΟΥ για την τιμολόγηση</li>
                    <li>Ελέγχετε τακτικά τις αναφορές για την πορεία της επιχείρησης</li>
                    <li>Κρατάτε ενημερωμένα τα στοιχεία των πελατών</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Bookings Panel */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Διαχείριση Κρατήσεων</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Το σύστημα κρατήσεων σας επιτρέπει να διαχειρίζεστε εύκολα το ημερολόγιο των γηπέδων σας.
                Δείτε αναλυτικά πώς να χρησιμοποιήσετε όλες τις λειτουργίες.
              </p>

              <div className="grid gap-8">
                {/* Quick Booking */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Γρήγορη Κράτηση
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Βήματα Γρήγορης Κράτησης:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-blue-800 dark:text-blue-300">
                      <li>Κλικ στο κουμπί «+ Γρήγορη Κράτηση» στον Πίνακα Ελέγχου</li>
                      <li>Συμπληρώστε τα υποχρεωτικά πεδία:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Όνομα Πελάτη</li>
                          <li>Τηλέφωνο</li>
                          <li>Γήπεδο</li>
                          <li>Ημερομηνία</li>
                          <li>Ώρα (επιλογή από διαθέσιμα slots)</li>
                        </ul>
                      </li>
                      <li>Προαιρετικά προσθέστε σημειώσεις</li>
                      <li>Κλικ στο «Δημιουργία Κράτησης»</li>
                    </ol>
                    <div className="mt-3">
                      <div className="rounded-xl overflow-hidden border border-border">
                        <Image src="/newbook.png" alt="Γρήγορη Κράτηση" width={1280} height={720} className="w-full h-auto" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar Views */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Προβολές Ημερολογίου
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Ημερήσια Προβολή</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εμφανίζει όλα τα slots της ημέρας για κάθε γήπεδο</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εύκολη επισκόπηση διαθεσιμότητας</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Drag & drop για μετακίνηση κρατήσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Κλικ σε κενό slot για νέα κράτηση</li>
                      </ul>
                      <div className="mt-3">
                        <div className="rounded-xl overflow-hidden border border-border">
                          <Image src="/daily.png" alt="Ημερήσια Προβολή" width={1280} height={720} className="w-full h-auto" />
                        </div>
                      </div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Εβδομαδιαία Προβολή</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Επισκόπηση ολόκληρης της εβδομάδας</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Φιλτράρισμα ανά γήπεδο</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εύκολη πλοήγηση με βελάκια</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προβολή συνολικών κρατήσεων/εσόδων</li>
                      </ul>
                      <div className="mt-3">
                        <div className="rounded-xl overflow-hidden border border-border">
                          <Image src="/weekly.png" alt="Εβδομαδιαία Προβολή" width={1280} height={720} className="w-full h-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recurring Bookings */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Επαναλαμβανόμενες Κρατήσεις
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2">Οδηγός Επαναλαμβανόμενων Κρατήσεων:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-amber-800 dark:text-amber-300">
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
                    <div className="mt-4 text-amber-700 dark:text-amber-400 text-sm">
                      <strong>Σημείωση:</strong> Αν κάποια ημερομηνία δεν είναι διαθέσιμη, θα ενημερωθείτε πριν την ολοκλήρωση.
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Επιβεβαιώνετε πάντα τα στοιχεία επικοινωνίας του πελάτη</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Χρησιμοποιείτε τις σημειώσεις για ειδικές απαιτήσεις</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ελέγχετε τακτικά τις επαναλαμβανόμενες κρατήσεις</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ενημερώνετε έγκαιρα την κατάσταση των κρατήσεων</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Αξιοποιήστε τα φίλτρα για καλύτερη οργάνωση</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Pitches Panel */}
        <TabsContent value="pitches">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Διαχείριση Γηπέδων</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Ρυθμίστε και διαχειριστείτε τα γήπεδά σας με λεπτομέρεια. Καθορίστε τιμές, ωράρια, και ειδικές περιόδους.
              </p>

              <div className="grid gap-8">
                {/* Adding New Pitch */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    Προσθήκη Νέου Γηπέδου
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Βήματα Δημιουργίας:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-blue-800 dark:text-blue-300">
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
                    <div className="mt-3">
                      <div className="rounded-xl overflow-hidden border border-border">
                        <Image src="/newpitch.png" alt="Προσθήκη Νέου Γηπέδου" width={1280} height={720} className="w-full h-auto" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Ωράρια Λειτουργίας
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Προεπιλεγμένα Ωράρια</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ορίστε ώρες έναρξης/λήξης ανά ημέρα</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Επιλέξτε κλειστές ημέρες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Καθορίστε διαφορετικά ωράρια για αργίες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αυτόματος υπολογισμός διαθέσιμων slots</li>
                      </ul>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Ειδικά Ωράρια</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Δημιουργία εξαιρέσεων για συγκεκριμένες ημέρες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προσωρινή αλλαγή ωραρίου</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ορισμός εποχιακών ωραρίων</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Closed Dates */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Ban className="h-5 w-5 text-primary" />
                    Κλειστές Ημερομηνίες
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2">Διαχείριση Κλειστών Περιόδων:</h4>
                    <div className="space-y-4">
                      <ul className="space-y-2 text-amber-800 dark:text-amber-300">
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
                      <div className="text-amber-700 dark:text-amber-400 text-sm">
                        <strong>Σημείωση:</strong> Οι κλειστές περίοδοι εμποδίζουν αυτόματα νέες κρατήσεις.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Τιμολόγηση
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Βασική Τιμολόγηση</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ορισμός βασικής τιμής ανά slot</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Διαφορετικές τιμές ανά τύπο γηπέδου</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αυτόματος υπολογισμός για διπλά slots</li>
                      </ul>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Ειδικές Τιμές</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εκπτώσεις για συγκεκριμένες ώρες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ειδικές τιμές για επαναλαμβανόμενες κρατήσεις</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προσφορές για μη δημοφιλείς ώρες</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Δώστε ξεκάθαρα ονόματα στα γήπεδα για εύκολη αναγνώριση</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ενημερώνετε έγκαιρα τις κλειστές ημερομηνίες</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Διατηρείτε ενημερωμένες τις τιμές και τα ωράρια</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Χρησιμοποιείτε τις σημειώσεις για ειδικές συνθήκες</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ελέγχετε τακτικά τη διαθεσιμότητα των γηπέδων</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Customers Panel */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Διαχείριση Πελατών</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Διαχειριστείτε αποτελεσματικά το πελατολόγιό σας και παρακολουθήστε το ιστορικό κρατήσεων.
              </p>

              <div className="grid gap-8">
                {/* Customer List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Λίστα Πελατών
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Προβολή & Αναζήτηση</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Πλήρης λίστα πελατών με βασικά στοιχεία</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Γρήγορη αναζήτηση με όνομα ή τηλέφωνο</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Φιλτράρισμα βάσει συχνότητας επισκέψεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ταξινόμηση με διάφορα κριτήρια</li>
                      </ul>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Στοιχεία Πελάτη</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προσωπικά στοιχεία (όνομα, τηλέφωνο, email)</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ιστορικό κρατήσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Συνολικά έσοδα από τον πελάτη</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προτιμήσεις γηπέδων και ωρών</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Adding New Customer */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Προσθήκη Νέου Πελάτη
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Βήματα Προσθήκης:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-blue-800 dark:text-blue-300">
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
                  </div>
                </div>

                {/* Customer Management */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Διαχείριση Στοιχείων
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Επεξεργασία Στοιχείων</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ενημέρωση προσωπικών στοιχείων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προσθήκη/επεξεργασία σημειώσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Καταγραφή προτιμήσεων</li>
                      </ul>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Ιστορικό & Στατιστικά</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προβολή όλων των κρατήσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ανάλυση συχνότητας επισκέψεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προτιμώμενες ημέρες/ώρες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Συνολικά έσοδα και τάσεις</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Διατηρείτε ενημερωμένα τα στοιχεία επικοινωνίας</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Καταγράφετε ιδιαίτερες προτιμήσεις στις σημειώσεις</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Παρακολουθείτε το ιστορικό για καλύτερη εξυπηρέτηση</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Αξιοποιήστε τα στατιστικά για προσωποποιημένες προσφορές</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Σεβαστείτε το GDPR και την προστασία προσωπικών δεδομένων</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Reports Panel */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Αναφορές & Στατιστικά</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Αναλύστε την απόδοση της επιχείρησής σας με λεπτομερείς αναφορές και στατιστικά στοιχεία.
              </p>

              <div className="grid gap-8">
                {/* Revenue Reports */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Αναφορές Εσόδων
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Συνολικά Έσοδα</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ημερήσια, εβδομαδιαία, μηνιαία έσοδα</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Σύγκριση με προηγούμενες περιόδους</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ανάλυση ανά γήπεδο</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Μέση τιμή ανά κράτηση</li>
                      </ul>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Γραφήματα Εσόδων</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Γραφική απεικόνιση τάσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Συγκριτικά διαγράμματα</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προβλέψεις εσόδων</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Booking Analytics */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Ανάλυση Κρατήσεων
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Στατιστικά Κρατήσεων:</h4>
                    <ul className="space-y-2 text-blue-800 dark:text-blue-300">
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
                  </div>
                </div>

                {/* Customer Analytics */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Ανάλυση Πελατών
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Στατιστικά Πελατών</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Top πελάτες (συχνότητα/έσοδα)</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Νέοι vs επαναλαμβανόμενοι πελάτες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Μέσος όρος κρατήσεων ανά πελάτη</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ανάλυση συμπεριφοράς πελατών</li>
                      </ul>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Τάσεις & Προβλέψεις</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εποχιακές διακυμάνσεις</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προβλέψεις ζήτησης</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ανάλυση τιμολογιακής πολιτικής</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Coming Soon */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    Προσεχώς
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2">Μελλοντικές Λειτουργίες:</h4>
                    <ul className="space-y-2 text-amber-800 dark:text-amber-300">
                      <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εξαγωγή αναφορών σε Excel/PDF</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Προσαρμοσμένες αναφορές</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αυτοματοποιημένη αποστολή email</li>
                      <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Κοινή χρήση με λογιστή/συνεργάτες</li>
                    </ul>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ελέγχετε τακτικά τις αναφορές για έγκαιρη λήψη αποφάσεων</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Συγκρίνετε δεδομένα με προηγούμενες περιόδους</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Αξιοποιήστε τα στατιστικά για βελτιστοποίηση τιμών</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Παρακολουθείτε τάσεις για καλύτερο προγραμματισμό</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Κρατάτε αρχείο εξαγόμενων αναφορών</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Settings Panel */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Ρυθμίσεις Συστήματος</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Διαμορφώστε το σύστημα σύμφωνα με τις ανάγκες της επιχείρησής σας.
              </p>

              <div className="grid gap-8">
                {/* Business Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Στοιχεία Επιχείρησης
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Βασικές Πληροφορίες:</h4>
                    <ul className="space-y-2 text-blue-800 dark:text-blue-300">
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
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Ωράριο Λειτουργίας
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Ρύθμιση Ωραρίου</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Καθορισμός ωρών ανά ημέρα</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Επιλογή κλειστών ημερών</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ειδικά ωράρια αργιών</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Εποχιακές προσαρμογές</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Διατηρείτε ενημερωμένα τα στοιχεία της επιχείρησης</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Προσαρμόστε τους κανόνες κρατήσεων στις ανάγκες σας</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ελέγχετε τακτικά τα δικαιώματα των χρηστών</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ενημερώνετε έγκαιρα το ωράριο για ειδικές περιόδους</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. FSE Panel */}
        <TabsContent value="fse">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Football Search Engine (FSE)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Κατανοήστε πώς λειτουργεί το FSE και πώς μπορείτε να αξιοποιήσετε τις online κρατήσεις.
              </p>

              <div className="grid gap-8">
                {/* FSE Overview */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Επισκόπηση FSE
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Τι είναι το FSE:</h4>
                    <ul className="space-y-2 text-blue-800 dark:text-blue-300">
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
                  </div>
                </div>

                {/* Online Bookings */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Online Κρατήσεις
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Διαχείριση Online Κρατήσεων</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αυτόματη ενημέρωση διαθεσιμότητας</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Επιβεβαίωση κρατήσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Διαχείριση πληρωμών</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αυτόματες ειδοποιήσεις</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Τιμολόγηση
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2">Πλήρες Διαχειριστικό:</h4>
                    <ul className="space-y-2 text-amber-800 dark:text-amber-300">
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
                  </div>
                </div>

                {/* Visibility & Promotion */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Προβολή & Προώθηση
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Βελτιστοποίηση Προβολής</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ενημερωμένες φωτογραφίες</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Πλήρης περιγραφή εγκαταστάσεων</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Ανταγωνιστική τιμολόγηση</li>
                        <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 shrink-0" /> Αξιολογήσεις πελατών</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Διατηρείτε ενημερωμένη τη διαθεσιμότητα</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Απαντάτε γρήγορα στις online κρατήσεις</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Προσφέρετε ανταγωνιστικές τιμές</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Ενθαρρύνετε τις αξιολογήσεις από πελάτες</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
