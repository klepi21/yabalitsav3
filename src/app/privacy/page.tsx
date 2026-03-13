'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Επιστροφή στην Αρχική
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Πολιτική Απορρήτου</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          
          {/* Introduction */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔒 Πολιτική Απορρήτου - Yabalitsa</h2>
            <p className="text-gray-600 leading-relaxed">
              Η προστασία των προσωπικών σας δεδομένων είναι προτεραιότητα για εμάς. Αυτή η πολιτική εξηγεί πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τις πληροφορίες σας.
            </p>
          </div>

          {/* What we collect */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Τι Δεδομένα Συλλέγουμε</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Για Ιδιοκτήτες Γηπέδων:</h4>
                <ul className="text-blue-700 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Στοιχεία ταυτοποίησης:</strong> Όνομα, email, τηλέφωνο</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Στοιχεία επιχείρησης:</strong> ΑΦΜ, Δ.Ο.Υ., διεύθυνση</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Πληροφορίες γηπέδων:</strong> Όνομα, διεύθυνση, πόλη</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Στατιστικά:</strong> Κρατήσεις, έσοδα, χρήση πλατφόρμας</span>
                  </li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">Για Πελάτες:</h4>
                <ul className="text-green-700 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span><strong>Στοιχεία επικοινωνίας:</strong> Όνομα, email, τηλέφωνο</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span><strong>Ιστορικό κρατήσεων:</strong> Ημερομηνίες, γήπεδα, τιμές</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span><strong>Προτιμήσεις:</strong> Τύποι γηπέδων, ώρες, πόλεις</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How we use data */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Πώς Χρησιμοποιούμε τα Δεδομένα</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Λειτουργία Πλατφόρμας:</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Δημιουργία και διαχείριση λογαριασμών</li>
                    <li>• Επεξεργασία κρατήσεων γηπέδων</li>
                    <li>• Διαχείριση πληρωμών και συνδρομών</li>
                    <li>• Παροχή τεχνικής υποστήριξης</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Βελτίωση Υπηρεσιών:</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Ανάλυση χρήσης και στατιστικά</li>
                    <li>• Εντοπισμός και διόρθωση σφαλμάτων</li>
                    <li>• Ανάπτυξη νέων χαρακτηριστικών</li>
                    <li>• Βελτίωση της εμπειρίας χρήστη</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Data sharing */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🤝 Διαμοιρασμός Δεδομένων</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                <strong>Δεν μοιραζόμαστε</strong> τα προσωπικά σας δεδομένα με τρίτους, εκτός από τις εξής περιπτώσεις:
              </p>
              <ul className="text-green-700 space-y-2">
                <li>• <strong>Με τη συγκατάθεσή σας</strong> - π.χ. για συνεργασίες με τρίτους</li>
                <li>• <strong>Για νομικούς λόγους</strong> - όταν απαιτείται από νόμο ή δικαστική απόφαση</li>
                <li>• <strong>Για την προστασία σας</strong> - σε περίπτωση ασφάλειας ή κατάχρησης</li>
                <li>• <strong>Με υπηρεσίες πληρωμών</strong> - μόνο τα απαραίτητα στοιχεία για επεξεργασία πληρωμών</li>
              </ul>
            </div>
          </div>

          {/* Data security */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🛡️ Ασφάλεια Δεδομένων</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Χρησιμοποιούμε <strong>βιομηχανικά πρότυπα ασφαλείας</strong> για την προστασία των δεδομένων σας:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Τεχνικά Μέτρα:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Κρυπτογράφηση δεδομένων (SSL/TLS)</li>
                    <li>• Ασφαλείς διακομιστές (Firebase)</li>
                    <li>• Κανονικές ενημερώσεις ασφαλείας</li>
                    <li>• Πρόσβαση μόνο από εξουσιοδοτημένο προσωπικό</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Οργανωτικά Μέτρα:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Εκπαίδευση προσωπικού για ασφάλεια</li>
                    <li>• Κανονικές εκτιμήσεις κινδύνου</li>
                    <li>• Πολιτική ελάχιστης πρόσβασης</li>
                    <li>• Κανονικές ελέγχους ασφαλείας</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Data retention */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">⏰ Διατήρηση Δεδομένων</h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Διατηρούμε τα δεδομένα σας μόνο για όσο χρόνο είναι απαραίτητο:
              </p>
              <ul className="text-purple-700 space-y-2">
                <li>• <strong>Λογαριασμοί:</strong> Ενεργούς λογαριασμούς διατηρούμε επ&apos; αόριστον</li>
                <li>• <strong>Κρατήσεις:</strong> Ιστορικό κρατήσεων για 3 χρόνια</li>
                <li>• <strong>Στατιστικά:</strong> Αναλυτικά δεδομένα για 1 χρόνο</li>
                <li>• <strong>Αρχεία:</strong> Δεδομένα που δεν χρησιμοποιούνται διαγράφονται αυτόματα</li>
              </ul>
            </div>
          </div>

          {/* User rights */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">👤 Δικαιώματα Χρηστών</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Έχετε τα εξής δικαιώματα σχετικά με τα δεδομένα σας:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Πρόσβαση και Έλεγχος:</h4>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• <strong>Πρόσβαση</strong> στα δεδομένα σας</li>
                    <li>• <strong>Διόρθωση</strong> ανακριβών πληροφοριών</li>
                    <li>• <strong>Διαγραφή</strong> λογαριασμού σας</li>
                    <li>• <strong>Εξαγωγή</strong> δεδομένων σε μηχανικά αναγνώσιμη μορφή</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Έλεγχος Επικοινωνίας:</h4>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• <strong>Επιλογή</strong> για marketing emails</li>
                    <li>• <strong>Ακύρωση</strong> συνδρομής σε newsletters</li>
                    <li>• <strong>Έλεγχος</strong> ειδοποιήσεων</li>
                    <li>• <strong>Προσαρμογή</strong> προτιμήσεων επικοινωνίας</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Cookies */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🍪 Cookies και Τεχνολογίες Παρακολούθησης</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες για:
              </p>
              <ul className="text-gray-700 space-y-2">
                <li>• <strong>Αυθεντικοποίηση:</strong> Διατήρηση της σύνδεσής σας</li>
                <li>• <strong>Προτιμήσεις:</strong> Αποθήκευση ρυθμίσεων και επιλογών</li>
                <li>• <strong>Ασφάλεια:</strong> Προστασία από επιθέσεις και κατάχρηση</li>
                <li>• <strong>Ανάλυση:</strong> Κατανόηση της χρήσης της πλατφόρμας</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Μπορείτε να απενεργοποιήσετε τα cookies στις ρυθμίσεις του browser σας, αλλά αυτό μπορεί να επηρεάσει τη λειτουργικότητα της πλατφόρμας.
              </p>
            </div>
          </div>

          {/* Third party services */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🔗 Υπηρεσίες Τρίτων</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Χρησιμοποιούμε τις εξής υπηρεσίες τρίτων για τη λειτουργία της πλατφόρμας:
              </p>
              <ul className="text-red-700 space-y-2">
                <li>• <strong>Firebase (Google):</strong> Hosting, βάση δεδομένων, authentication</li>
                <li>• <strong>Stripe:</strong> Επεξεργασία πληρωμών (όταν ενεργοποιηθεί)</li>
                <li>• <strong>Vercel:</strong> Hosting και deployment</li>
                <li>• <strong>Google Analytics:</strong> Ανάλυση επισκεψιμότητας (optional)</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Κάθε υπηρεσία τρίτου έχει τη δική της πολιτική απορρήτου και συμμορφώνεται με το GDPR.
              </p>
            </div>
          </div>

          {/* Children privacy */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">👶 Προστασία Ανηλίκων</h3>
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <p className="text-gray-700">
                Το Yabalitsa <strong>δεν απευθύνεται σε άτομα κάτω των 18 ετών</strong>. Δεν συλλέγουμε γνωστά προσωπικά δεδομένα από παιδιά. 
                Εάν ανακαλύψουμε ότι έχουμε συλλέξει δεδομένα από παιδί, τα διαγράφουμε άμεσα.
              </p>
            </div>
          </div>

          {/* Changes to policy */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 Αλλαγές στην Πολιτική</h3>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Μπορούμε να ενημερώσουμε αυτή την πολιτική απορρήτου κατά καιρούς. Σε περίπτωση σημαντικών αλλαγών:
              </p>
              <ul className="text-indigo-700 space-y-2">
                <li>• Θα σας ειδοποιήσουμε μέσω email</li>
                <li>• Θα εμφανίσουμε ειδοποίηση στην πλατφόρμα</li>
                <li>• Θα ενημερώσουμε την ημερομηνία &quot;Τελευταία ενημέρωση&quot;</li>
                <li>• Θα σας δώσουμε χρόνο να εξετάσετε τις αλλαγές</li>
              </ul>
            </div>
          </div>

          {/* Contact information */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📞 Επικοινωνία</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">
                Για οποιεσδήποτε ερωτήσεις σχετικά με αυτή την πολιτική απορρήτου ή τα δεδομένα σας:
              </p>
              <div className="text-center space-y-3">
                <Link 
                  href="/for-venues" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  🏟️ Εγγραφή για Γήπεδα
                </Link>
                <div className="text-sm text-gray-600">
                  <p>Email: privacy@yabalitsa.gr</p>
                  <p>Τηλέφωνο: +30 210 1234567</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')} | 
              <Link 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 ml-2"
              >
                Όροι Χρήσης
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
