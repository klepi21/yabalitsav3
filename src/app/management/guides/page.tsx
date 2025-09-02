'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function GuidesPage() {
  const { user, venueOwner, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !venueOwner) router.push('/venue-login');
  }, [user, venueOwner, isLoading, router]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Οδηγίες Χρήσης</h1>
      <div className="space-y-10 text-gray-800 leading-relaxed">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Εισαγωγή</h2>
          <p>
            Το Yabalitsa Management σάς βοηθά να διαχειριστείτε πλήρως τις εγκαταστάσεις σας: γήπεδα, κρατήσεις,
            πελάτες και αναφορές. Οι επιλογές πλοήγησης βρίσκονται στο αριστερό sidebar (π.χ. «Πίνακας Ελέγχου»,
            «Κρατήσεις», «Γήπεδα», «Πελάτες», «Αναφορές», «Ρυθμίσεις»).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Πίνακας Ελέγχου</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>«Γρήγορη Κράτηση»</strong>: Κουμπί επάνω δεξιά. Φόρμα με πεδία «Όνομα Πελάτη», «Τηλέφωνο», «Γήπεδο», «Ημερομηνία», «Ώρα» (slots) και «Σημειώσεις». Αποθήκευση με «Δημιουργία Κράτησης».</li>
            <li><strong>«Σημερινές Κρατήσεις»</strong>: Λίστα ταξινομημένη ανά ώρα. Για κάθε κράτηση εμφανίζονται «Πελάτης», «Ώρα», «Γήπεδο (τύπος)», «Τιμή» και «Κατάσταση».</li>
            <li><strong>Γρήγορα στατιστικά</strong>: «Σύνολο Κρατήσεων», «Live Αγώνες», «Σημερινές Κρατήσεις», «Σύνολο Πελατών».</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Κρατήσεις</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Μετάβαση από sidebar: «Κρατήσεις».</li>
            <li><strong>Ημερήσια/Εβδομαδιαία προβολή</strong>: Επιλογή view από τα tabs. Πλοήγηση με βελάκια «Προηγούμενη/Επόμενη» ή ημερολόγιο.</li>
            <li><strong>Νέα Κράτηση</strong>: Κουμπί «Νέα Κράτηση» ή κλικ σε κενό slot. Συμπληρώστε «Πελάτης», «Τηλέφωνο», «Γήπεδο», «Ημερομηνία», «Ώρα». Η τιμή προτείνεται από το γήπεδο.</li>
            <li><strong>Επαναλαμβανόμενη κράτηση</strong>: Επιλογή «Επαναλαμβανόμενη», ορίστε «Συχνότητα» (ημερήσια/εβδομαδιαία), «Διάστημα» (π.χ. ανά 1 εβδομάδα), «Επαναλήψεις» (π.χ. 10). Ο έλεγχος διαθεσιμότητας γίνεται για κάθε εμφανιζόμενη κράτηση.</li>
            <li><strong>Ολοκλήρωση/Ακύρωση</strong>: Στη λίστα/κάρτα κράτησης, κουμπί «Ολοκλήρωση» ή «Ακύρωση» με επιβεβαίωση.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Γήπεδα</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Μετάβαση από sidebar: «Γήπεδα». Κουμπί «Προσθήκη» για νέο γήπεδο.</li>
            <li><strong>Πεδία</strong>: «Όνομα», «Τύπος» (5x5, 6x6, ...), «Τιμή (€)», «Διάρκεια slot (λεπτά)», «Προεπιλεγμένα ωράρια».</li>
            <li><strong>Κλειστές Ημερομηνίες</strong>: Στην επεξεργασία γηπέδου, ενότητα «Κλειστές ημερομηνίες/περίοδοι». Κουμπιά «Προσθήκη»/«Διαγραφή». Οι κλειστές περίοδοι κρύβουν slots και εμποδίζουν νέες κρατήσεις.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Πελάτες</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Μετάβαση από sidebar: «Πελάτες». Προβολή/αναζήτηση πελατών που έχουν πραγματοποιήσει κρατήσεις.</li>
            <li>Πεδία προφίλ: «Όνομα», «Email», «Τηλέφωνο», ιστορικό κρατήσεων.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Αναφορές</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Μετάβαση από sidebar: «Αναφορές».</li>
            <li>Γραφήματα: Έσοδα ανά μήνα, κρατήσεις ανά περίοδο, απόδοση γηπέδου, κατανομή status.</li>
            <li>KPIs: Σύνολο εσόδων, αριθμός κρατήσεων, average ticket, occupancy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Ρυθμίσεις</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Στοιχεία επιχείρησης: «Επωνυμία», «Διεύθυνση», «Email», «Τηλέφωνο», «ΑΦΜ (10 ψηφία)», «Δ.Ο.Υ.».</li>
            <li>Κανόνες κρατήσεων: ελάχιστη προειδοποίηση, μέγιστες μέρες προκράτησης, επιτρεπόμενη ίδιας ημέρας.</li>
            <li>Ωράρια λειτουργίας: ανά ημέρα (ανοιχτό/κλειστό, ώρα έναρξης/λήξης).</li>
            <li>Χρήστες/Προσωπικό: δικαιώματα πρόσβασης (π.χ. owner/manager/staff).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">FSE (Football Search Engine)</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Το FSE είναι η σελίδα αναζήτησης στο root («/») με φίλτρα «Ημερομηνία», «Τύπος Γηπέδου», «Ώρα».</li>
            <li>Επιστρέφει μόνο διαθέσιμα γήπεδα/slots. Τα αποτελέσματα εμφανίζουν «Επωνυμία», «Διεύθυνση», «Τύπο», «Διάρκεια», «Τιμή».</li>
            <li>Το κουμπί «Κράτηση Τώρα» είναι απενεργοποιημένο μέχρι να ενεργοποιηθεί η ροή online κράτησης.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Trial & Συνδρομές</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Στην εγγραφή δημιουργείται πεδίο <code>daysRemaining</code> (=15) στο έγγραφο του venue για τη δοκιμαστική περίοδο.</li>
            <li>Μετά το trial, μπορείτε να επιλέξετε: «Πλήρες Διαχειριστικό (30€/μήνα)» ή «Premium (1€/ανά κράτηση στο FSE)».</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Συμβουλές</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Χρησιμοποιήστε 24ωρη μορφή ώρας για συνέπεια (π.χ. 20:00).</li>
            <li>Ελέγχετε τις «Κλειστές Ημερομηνίες» πριν ανοίξετε τις online κρατήσεις.</li>
            <li>Συμπληρώστε σωστά ΑΦΜ (10 ψηφία) και Δ.Ο.Υ. στις ρυθμίσεις για τιμολόγηση.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Υποστήριξη</h2>
          <p>Για βοήθεια, επικοινωνήστε μαζί μας: <a className="underline" href="mailto:support@yabalitsa.com">support@yabalitsa.com</a></p>
        </section>
      </div>
    </div>
  );
}


