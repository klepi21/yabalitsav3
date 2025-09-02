'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Tab } from '@headlessui/react';

export default function GuidesPage() {
  const { user, venueOwner, isLoading } = useAuth();
  const router = useRouter();

  // Define categories in the exact order they'll appear in tabs
  const categories = [
    {
      id: 'getting-started',
      name: 'Ξεκινώντας',
      icon: '🚀',
      description: 'Βασικές οδηγίες για να ξεκινήσετε με το Yabalitsa Management'
    },
    {
      id: 'bookings',
      name: 'Κρατήσεις',
      icon: '📅',
      description: 'Διαχείριση κρατήσεων και ημερολογίου'
    },
    {
      id: 'pitches',
      name: 'Γήπεδα',
      icon: '⚽',
      description: 'Ρύθμιση και διαχείριση γηπέδων'
    },
    {
      id: 'customers',
      name: 'Πελάτες',
      icon: '👥',
      description: 'Διαχείριση πελατολογίου'
    },
    {
      id: 'reports',
      name: 'Αναφορές',
      icon: '📊',
      description: 'Στατιστικά και αναφορές'
    },
    {
      id: 'settings',
      name: 'Ρυθμίσεις',
      icon: '⚙️',
      description: 'Ρυθμίσεις επιχείρησης'
    },
    {
      id: 'fse',
      name: 'FSE',
      icon: '🔍',
      description: 'Football Search Engine και online κρατήσεις'
    }
  ];

  useEffect(() => {
    if (isLoading) return;
    if (!user || !venueOwner) router.push('/venue-login');
  }, [user, venueOwner, isLoading, router]);

  if (isLoading || !venueOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Οδηγίες Χρήσης</h1>
      <p className="text-gray-600 mb-8">
        Αναλυτικός οδηγός για όλες τις λειτουργίες του Yabalitsa Management
      </p>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1">
          {categories.map((category) => (
            <Tab
              key={category.id}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                 ${selected
                  ? 'bg-white text-green-700 shadow'
                  : 'text-gray-700 hover:bg-white/[0.12] hover:text-green-600'
                }`
              }
            >
              <span className="flex items-center justify-center space-x-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </span>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-4">
          {/* 1. Getting Started Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Ξεκινώντας με το Yabalitsa Management</h2>
              <p className="text-gray-600">
                Το Yabalitsa Management σάς βοηθά να διαχειριστείτε πλήρως τις εγκαταστάσεις σας. 
                Ακολουθήστε αυτόν τον οδηγό για να ξεκινήσετε.
              </p>
              
              <div className="grid gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">1. Πλοήγηση στο Σύστημα</h3>
                  <p className="text-gray-600">
                    Το μενού πλοήγησης βρίσκεται στα αριστερά της οθόνης και περιλαμβάνει:
                  </p>
                  <ul className="ml-6 space-y-2 text-gray-600 list-disc">
                    <li><strong>Πίνακας Ελέγχου</strong> - Επισκόπηση και γρήγορες ενέργειες</li>
                    <li><strong>Κρατήσεις</strong> - Διαχείριση ημερολογίου και κρατήσεων</li>
                    <li><strong>Γήπεδα</strong> - Ρύθμιση γηπέδων και διαθεσιμότητας</li>
                    <li><strong>Πελάτες</strong> - Διαχείριση πελατολογίου</li>
                    <li><strong>Αναφορές</strong> - Στατιστικά και αναλύσεις</li>
                    <li><strong>Ρυθμίσεις</strong> - Παραμετροποίηση συστήματος</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">2. Πρώτα Βήματα</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                    <h4 className="font-medium mb-2">Συνιστώμενη σειρά ενεργειών:</h4>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Ρυθμίστε τα στοιχεία της επιχείρησής σας στις Ρυθμίσεις</li>
                      <li>Προσθέστε τα γήπεδά σας με τιμές και ωράρια</li>
                      <li>Εξοικειωθείτε με το ημερολόγιο κρατήσεων</li>
                      <li>Δοκιμάστε να καταχωρήσετε μια κράτηση</li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">3. Χρήσιμες Συμβουλές</h3>
                  <ul className="ml-6 space-y-2 text-gray-600 list-disc">
                    <li>Χρησιμοποιείτε πάντα 24ωρη μορφή ώρας (π.χ. 20:00)</li>
                    <li>Συμπληρώστε σωστά τα στοιχεία ΑΦΜ και ΔΟΥ για την τιμολόγηση</li>
                    <li>Ελέγχετε τακτικά τις αναφορές για την πορεία της επιχείρησης</li>
                    <li>Κρατάτε ενημερωμένα τα στοιχεία των πελατών</li>
                  </ul>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* 2. Bookings Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Διαχείριση Κρατήσεων</h2>
              <p className="text-gray-600">
                Το σύστημα κρατήσεων σας επιτρέπει να διαχειρίζεστε εύκολα το ημερολόγιο των γηπέδων σας.
                Δείτε αναλυτικά πώς να χρησιμοποιήσετε όλες τις λειτουργίες.
              </p>

              <div className="grid gap-8">
                {/* Quick Booking */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">⚡</span>
                    Γρήγορη Κράτηση
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Βήματα Γρήγορης Κράτησης:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-blue-800">
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
                  </div>
                </div>

                {/* Calendar Views */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">📅</span>
                    Προβολές Ημερολογίου
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Ημερήσια Προβολή</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Εμφανίζει όλα τα slots της ημέρας για κάθε γήπεδο</li>
                        <li>• Εύκολη επισκόπηση διαθεσιμότητας</li>
                        <li>• Drag & drop για μετακίνηση κρατήσεων</li>
                        <li>• Κλικ σε κενό slot για νέα κράτηση</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Εβδομαδιαία Προβολή</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Επισκόπηση ολόκληρης της εβδομάδας</li>
                        <li>• Φιλτράρισμα ανά γήπεδο</li>
                        <li>• Εύκολη πλοήγηση με βελάκια</li>
                        <li>• Προβολή συνολικών κρατήσεων/εσόδων</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Recurring Bookings */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🔄</span>
                    Επαναλαμβανόμενες Κρατήσεις
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Οδηγός Επαναλαμβανόμενων Κρατήσεων:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-yellow-800">
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
                    <div className="mt-4 text-yellow-700 text-sm">
                      <strong>Σημείωση:</strong> Αν κάποια ημερομηνία δεν είναι διαθέσιμη, θα ενημερωθείτε πριν την ολοκλήρωση.
                    </div>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💡</span>
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Επιβεβαιώνετε πάντα τα στοιχεία επικοινωνίας του πελάτη</li>
                      <li>✓ Χρησιμοποιείτε τις σημειώσεις για ειδικές απαιτήσεις</li>
                      <li>✓ Ελέγχετε τακτικά τις επαναλαμβανόμενες κρατήσεις</li>
                      <li>✓ Ενημερώνετε έγκαιρα την κατάσταση των κρατήσεων</li>
                      <li>✓ Αξιοποιήστε τα φίλτρα για καλύτερη οργάνωση</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* 3. Pitches Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Διαχείριση Γηπέδων</h2>
              <p className="text-gray-600">
                Ρυθμίστε και διαχειριστείτε τα γήπεδά σας με λεπτομέρεια. Καθορίστε τιμές, ωράρια, και ειδικές περιόδους.
              </p>

              <div className="grid gap-8">
                {/* Adding New Pitch */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">➕</span>
                    Προσθήκη Νέου Γηπέδου
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Βήματα Δημιουργίας:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-blue-800">
                      <li>Μεταβείτε στην ενότητα «Γήπεδα»</li>
                      <li>Κλικ στο κουμπί «+ Προσθήκη Γηπέδου»</li>
                      <li>Συμπληρώστε τα βασικά στοιχεία:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Όνομα γηπέδου (π.χ. "Γήπεδο 1")</li>
                          <li>Τύπος (5x5, 6x6, 7x7, 8x8, 11x11)</li>
                          <li>Τιμή ανά slot</li>
                          <li>Διάρκεια slot (60, 90, 120 λεπτά)</li>
                        </ul>
                      </li>
                      <li>Ορίστε τα προεπιλεγμένα ωράρια λειτουργίας</li>
                      <li>Αποθηκεύστε τις ρυθμίσεις</li>
                    </ol>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">⏰</span>
                    Ωράρια Λειτουργίας
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Προεπιλεγμένα Ωράρια</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Ορίστε ώρες έναρξης/λήξης ανά ημέρα</li>
                        <li>• Επιλέξτε κλειστές ημέρες</li>
                        <li>• Καθορίστε διαφορετικά ωράρια για αργίες</li>
                        <li>• Αυτόματος υπολογισμός διαθέσιμων slots</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Ειδικά Ωράρια</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Δημιουργία εξαιρέσεων για συγκεκριμένες ημέρες</li>
                        <li>• Προσωρινή αλλαγή ωραρίου</li>
                        <li>• Ορισμός εποχιακών ωραρίων</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Closed Dates */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🚫</span>
                    Κλειστές Ημερομηνίες
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Διαχείριση Κλειστών Περιόδων:</h4>
                    <div className="space-y-4">
                      <ul className="space-y-2 text-yellow-800">
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
                      <div className="text-yellow-700 text-sm">
                        <strong>Σημείωση:</strong> Οι κλειστές περίοδοι εμποδίζουν αυτόματα νέες κρατήσεις.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💰</span>
                    Τιμολόγηση
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Βασική Τιμολόγηση</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Ορισμός βασικής τιμής ανά slot</li>
                        <li>• Διαφορετικές τιμές ανά τύπο γηπέδου</li>
                        <li>• Αυτόματος υπολογισμός για διπλά slots</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Ειδικές Τιμές</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Εκπτώσεις για συγκεκριμένες ώρες</li>
                        <li>• Ειδικές τιμές για επαναλαμβανόμενες κρατήσεις</li>
                        <li>• Προσφορές για μη δημοφιλείς ώρες</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💡</span>
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Δώστε ξεκάθαρα ονόματα στα γήπεδα για εύκολη αναγνώριση</li>
                      <li>✓ Ενημερώνετε έγκαιρα τις κλειστές ημερομηνίες</li>
                      <li>✓ Διατηρείτε ενημερωμένες τις τιμές και τα ωράρια</li>
                      <li>✓ Χρησιμοποιείτε τις σημειώσεις για ειδικές συνθήκες</li>
                      <li>✓ Ελέγχετε τακτικά τη διαθεσιμότητα των γηπέδων</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* 4. Customers Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Διαχείριση Πελατών</h2>
              <p className="text-gray-600">
                Διαχειριστείτε αποτελεσματικά το πελατολόγιό σας και παρακολουθήστε το ιστορικό κρατήσεων.
              </p>

              <div className="grid gap-8">
                {/* Customer List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">📋</span>
                    Λίστα Πελατών
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Προβολή & Αναζήτηση</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Πλήρης λίστα πελατών με βασικά στοιχεία</li>
                        <li>• Γρήγορη αναζήτηση με όνομα ή τηλέφωνο</li>
                        <li>• Φιλτράρισμα βάσει συχνότητας επισκέψεων</li>
                        <li>• Ταξινόμηση με διάφορα κριτήρια</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Στοιχεία Πελάτη</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Προσωπικά στοιχεία (όνομα, τηλέφωνο, email)</li>
                        <li>• Ιστορικό κρατήσεων</li>
                        <li>• Συνολικά έσοδα από τον πελάτη</li>
                        <li>• Προτιμήσεις γηπέδων και ωρών</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Adding New Customer */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">➕</span>
                    Προσθήκη Νέου Πελάτη
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Βήματα Προσθήκης:</h4>
                    <ol className="list-decimal ml-4 space-y-2 text-blue-800">
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
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🔄</span>
                    Διαχείριση Στοιχείων
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Επεξεργασία Στοιχείων</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Ενημέρωση προσωπικών στοιχείων</li>
                        <li>• Προσθήκη/επεξεργασία σημειώσεων</li>
                        <li>• Καταγραφή προτιμήσεων</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Ιστορικό & Στατιστικά</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Προβολή όλων των κρατήσεων</li>
                        <li>• Ανάλυση συχνότητας επισκέψεων</li>
                        <li>• Προτιμώμενες ημέρες/ώρες</li>
                        <li>• Συνολικά έσοδα και τάσεις</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💡</span>
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Διατηρείτε ενημερωμένα τα στοιχεία επικοινωνίας</li>
                      <li>✓ Καταγράφετε ιδιαίτερες προτιμήσεις στις σημειώσεις</li>
                      <li>✓ Παρακολουθείτε το ιστορικό για καλύτερη εξυπηρέτηση</li>
                      <li>✓ Αξιοποιήστε τα στατιστικά για προσωποποιημένες προσφορές</li>
                      <li>✓ Σεβαστείτε το GDPR και την προστασία προσωπικών δεδομένων</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* 5. Reports Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Αναφορές & Στατιστικά</h2>
              <p className="text-gray-600">
                Αναλύστε την απόδοση της επιχείρησής σας με λεπτομερείς αναφορές και στατιστικά στοιχεία.
              </p>

              <div className="grid gap-8">
                {/* Revenue Reports */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💰</span>
                    Αναφορές Εσόδων
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Συνολικά Έσοδα</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Ημερήσια, εβδομαδιαία, μηνιαία έσοδα</li>
                        <li>• Σύγκριση με προηγούμενες περιόδους</li>
                        <li>• Ανάλυση ανά γήπεδο</li>
                        <li>• Μέση τιμή ανά κράτηση</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Γραφήματα Εσόδων</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Γραφική απεικόνιση τάσεων</li>
                        <li>• Συγκριτικά διαγράμματα</li>
                        <li>• Προβλέψεις εσόδων</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Booking Analytics */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">📊</span>
                    Ανάλυση Κρατήσεων
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Στατιστικά Κρατήσεων:</h4>
                    <ul className="space-y-2 text-blue-800">
                      <li>• Συνολικός αριθμός κρατήσεων
                        <ul className="list-disc ml-6 mt-1">
                          <li>Ανά περίοδο</li>
                          <li>Ανά γήπεδο</li>
                          <li>Ανά ώρα/ημέρα</li>
                        </ul>
                      </li>
                      <li>• Ποσοστό πληρότητας
                        <ul className="list-disc ml-6 mt-1">
                          <li>Συνολική πληρότητα</li>
                          <li>Ανά γήπεδο</li>
                          <li>Ανά χρονική ζώνη</li>
                        </ul>
                      </li>
                      <li>• Δημοφιλείς ώρες και ημέρες</li>
                      <li>• Ανάλυση ακυρώσεων</li>
                    </ul>
                  </div>
                </div>

                {/* Customer Analytics */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">👥</span>
                    Ανάλυση Πελατών
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Στατιστικά Πελατών</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Top πελάτες (συχνότητα/έσοδα)</li>
                        <li>• Νέοι vs επαναλαμβανόμενοι πελάτες</li>
                        <li>• Μέσος όρος κρατήσεων ανά πελάτη</li>
                        <li>• Ανάλυση συμπεριφοράς πελατών</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Τάσεις & Προβλέψεις</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Εποχιακές διακυμάνσεις</li>
                        <li>• Προβλέψεις ζήτησης</li>
                        <li>• Ανάλυση τιμολογιακής πολιτικής</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Coming Soon */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🔜</span>
                    Προσεχώς
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Μελλοντικές Λειτουργίες:</h4>
                    <ul className="space-y-2 text-yellow-800">
                      <li>• Εξαγωγή αναφορών σε Excel/PDF</li>
                      <li>• Προσαρμοσμένες αναφορές</li>
                      <li>• Αυτοματοποιημένη αποστολή email</li>
                      <li>• Κοινή χρήση με λογιστή/συνεργάτες</li>
                    </ul>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💡</span>
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Ελέγχετε τακτικά τις αναφορές για έγκαιρη λήψη αποφάσεων</li>
                      <li>✓ Συγκρίνετε δεδομένα με προηγούμενες περιόδους</li>
                      <li>✓ Αξιοποιήστε τα στατιστικά για βελτιστοποίηση τιμών</li>
                      <li>✓ Παρακολουθείτε τάσεις για καλύτερο προγραμματισμό</li>
                      <li>✓ Κρατάτε αρχείο εξαγόμενων αναφορών</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Remaining placeholder panels */}
          {/* 6. Settings Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Ρυθμίσεις Συστήματος</h2>
              <p className="text-gray-600">
                Διαμορφώστε το σύστημα σύμφωνα με τις ανάγκες της επιχείρησής σας.
              </p>

              <div className="grid gap-8">
                {/* Business Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🏢</span>
                    Στοιχεία Επιχείρησης
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Βασικές Πληροφορίες:</h4>
                    <ul className="space-y-2 text-blue-800">
                      <li>• Επωνυμία επιχείρησης</li>
                      <li>• Διεύθυνση γηπέδου</li>
                      <li>• Πόλη</li>
                      <li>• Στοιχεία επικοινωνίας:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Email επιχείρησης</li>
                          <li>Τηλέφωνο επικοινωνίας</li>
                        </ul>
                      </li>
                      <li>• Φορολογικά στοιχεία:
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
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">⏰</span>
                    Ωράριο Λειτουργίας
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Ρύθμιση Ωραρίου</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Καθορισμός ωρών ανά ημέρα</li>
                        <li>• Επιλογή κλειστών ημερών</li>
                        <li>• Ειδικά ωράρια αργιών</li>
                        <li>• Εποχιακές προσαρμογές</li>
          </ul>
                    </div>
                  </div>
                </div>

                {/* Booking Rules */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">📋</span>
                    Κανόνες Κρατήσεων
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Γενικοί Κανόνες</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Ελάχιστος χρόνος προειδοποίησης</li>
                        <li>• Μέγιστες ημέρες προκράτησης</li>
                        <li>• Πολιτική ακυρώσεων</li>
                        <li>• Κανόνες επαναλαμβανόμενων κρατήσεων</li>
          </ul>
                    </div>
                  </div>
                </div>

                {/* User Management */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">👥</span>
                    Διαχείριση Χρηστών
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Ρόλοι & Δικαιώματα:</h4>
                    <ul className="space-y-2 text-yellow-800">
                      <li>• Τύποι χρηστών:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Ιδιοκτήτης (πλήρη δικαιώματα)</li>
                          <li>Διαχειριστής</li>
                          <li>Υπάλληλος</li>
                        </ul>
                      </li>
                      <li>• Διαχείριση δικαιωμάτων πρόσβασης</li>
                      <li>• Προσθήκη/αφαίρεση χρηστών</li>
                      <li>• Καταγραφή ενεργειών χρηστών</li>
          </ul>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💡</span>
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Διατηρείτε ενημερωμένα τα στοιχεία της επιχείρησης</li>
                      <li>✓ Προσαρμόστε τους κανόνες κρατήσεων στις ανάγκες σας</li>
                      <li>✓ Ελέγχετε τακτικά τα δικαιώματα των χρηστών</li>
                      <li>✓ Ενημερώνετε έγκαιρα το ωράριο για ειδικές περιόδους</li>
          </ul>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* 7. FSE Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Football Search Engine (FSE)</h2>
              <p className="text-gray-600">
                Κατανοήστε πώς λειτουργεί το FSE και πώς μπορείτε να αξιοποιήσετε τις online κρατήσεις.
              </p>

              <div className="grid gap-8">
                {/* FSE Overview */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🔍</span>
                    Επισκόπηση FSE
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Τι είναι το FSE:</h4>
                    <ul className="space-y-2 text-blue-800">
                      <li>• Μηχανή αναζήτησης γηπέδων</li>
                      <li>• Φίλτρα αναζήτησης:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Ημερομηνία</li>
                          <li>Τύπος γηπέδου</li>
                          <li>Ώρα</li>
                          <li>Τοποθεσία</li>
                        </ul>
                      </li>
                      <li>• Εμφάνιση διαθέσιμων slots</li>
                      <li>• Online κρατήσεις</li>
          </ul>
                  </div>
                </div>

                {/* Online Bookings */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🌐</span>
                    Online Κρατήσεις
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Διαχείριση Online Κρατήσεων</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Αυτόματη ενημέρωση διαθεσιμότητας</li>
                        <li>• Επιβεβαίωση κρατήσεων</li>
                        <li>• Διαχείριση πληρωμών</li>
                        <li>• Αυτόματες ειδοποιήσεις</li>
          </ul>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💰</span>
                    Τιμολόγηση
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Πλήρες Διαχειριστικό:</h4>
                    <ul className="space-y-2 text-yellow-800">
                      <li>• 30€ / μήνα</li>
                      <li>• Περιλαμβάνει:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Πλήρης διαχείριση κρατήσεων</li>
                          <li>Διαχείριση πελατών και εσόδων</li>
                          <li>Ημερολόγιο (daily/weekly)</li>
                          <li>Επαναλαμβανόμενες κρατήσεις</li>
                          <li>Αναφορές και dashboards</li>
                          <li>Προτεραιότητα υποστήριξης</li>
                        </ul>
                      </li>
                      <li>• Δωρεάν δοκιμαστική περίοδος 15 ημερών</li>
          </ul>
                  </div>
                </div>

                {/* Visibility & Promotion */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">📢</span>
                    Προβολή & Προώθηση
                  </h3>
                  <div className="grid gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Βελτιστοποίηση Προβολής</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Ενημερωμένες φωτογραφίες</li>
                        <li>• Πλήρης περιγραφή εγκαταστάσεων</li>
                        <li>• Ανταγωνιστική τιμολόγηση</li>
                        <li>• Αξιολογήσεις πελατών</li>
          </ul>
                    </div>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">💡</span>
                    Συμβουλές & Καλές Πρακτικές
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Διατηρείτε ενημερωμένη τη διαθεσιμότητα</li>
                      <li>✓ Απαντάτε γρήγορα στις online κρατήσεις</li>
                      <li>✓ Προσφέρετε ανταγωνιστικές τιμές</li>
                      <li>✓ Ενθαρρύνετε τις αξιολογήσεις από πελάτες</li>
                    </ul>
                  </div>
                </div>
              </div>
      </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}