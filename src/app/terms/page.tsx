'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#040D12]">
      {/* Header */}
      <div className="bg-[#0B151C] shadow-xl shadow-black/50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Επιστροφή στην Αρχική
            </Link>
            <h1 className="text-xl font-semibold text-zinc-100">Όροι Χρήσης</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#0B151C] rounded-lg shadow-xl shadow-black/50 border border-white/10 p-8">
          
          {/* Introduction */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Όροι Χρήσης & Συμβολαιογραφική Σύμβαση</h2>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <p className="text-blue-400 text-sm font-medium">
                <strong>⚠️ Σημαντικό:</strong> Αυτή η συμβολαιογραφική σύμβαση είναι νομικά δεσμευτική και ρυθμίζει τη σχέση μεταξύ της εταιρείας Yabalitsa και των επιχειρήσεων που χρησιμοποιούν την πλατφόρμα.
              </p>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Με την εγγραφή και χρήση της πλατφόρμας Yabalitsa, αποδέχεστε αυτούς τους όρους χρήσης που αποτελούν νομικά δεσμευτική συμβολαιογραφική σύμβαση.
            </p>
          </div>

          {/* Legal Definitions */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">📚 Νομικοί Ορισμοί</h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-b border-white/5lue-300 rounded-xl p-6 shadow-xl shadow-black/50">
              <div className="space-y-4">
                <div className="flex items-start p-3 bg-[#0B151C] rounded-lg border border-blue-500/20 shadow-xl shadow-black/50">
                  <span className="text-blue-400 text-lg font-bold mr-3">⚖️</span>
                  <div>
                    <span className="font-bold text-blue-400 text-base">&quot;Yabalitsa&quot;</span>
                    <span className="text-zinc-400 ml-2">σημαίνει η εταιρεία Yabalitsa, με έδρα την Ελλάδα, που παρέχει υπηρεσίες διαχείρισης γηπέδων ποδοσφαίρου.</span>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-[#0B151C] rounded-lg border border-blue-500/20 shadow-xl shadow-black/50">
                  <span className="text-blue-400 text-lg font-bold mr-3">🏢</span>
                  <div>
                    <span className="font-bold text-blue-400 text-base">&quot;Επιχείρηση&quot;</span>
                    <span className="text-zinc-400 ml-2">σημαίνει οποιαδήποτε νομική οντότητα που εγγράφεται και χρησιμοποιεί την πλατφόρμα.</span>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-[#0B151C] rounded-lg border border-blue-500/20 shadow-xl shadow-black/50">
                  <span className="text-blue-400 text-lg font-bold mr-3">💻</span>
                  <div>
                    <span className="font-bold text-blue-400 text-base">&quot;Πλατφόρμα&quot;</span>
                    <span className="text-zinc-400 ml-2">σημαίνει το διαδικτυακό σύστημα διαχείρισης γηπέδων που παρέχει η Yabalitsa.</span>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-[#0B151C] rounded-lg border border-blue-500/20 shadow-xl shadow-black/50">
                  <span className="text-blue-400 text-lg font-bold mr-3">🔧</span>
                  <div>
                    <span className="font-bold text-blue-400 text-base">&quot;Υπηρεσίες&quot;</span>
                    <span className="text-zinc-400 ml-2">σημαίνει όλες τις λειτουργίες που παρέχονται μέσω της πλατφόρμας.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What is Yabalitsa */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">🎯 Περιγραφή Υπηρεσιών - Yabalitsa</h3>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-zinc-400 leading-relaxed">
                Το <strong>Yabalitsa</strong> είναι μια <strong>διαδικτυακή πλατφόρμα διαχείρισης γηπέδων ποδοσφαίρου</strong> που επιτρέπει στους ιδιοκτήτες γηπέδων να:
              </p>
              <ul className="mt-3 space-y-2 text-zinc-400">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>Διαχειρίζονται κρατήσεις</strong> γηπέδων online</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>Προσθέτουν και επεξεργάζονται γήπεδα</strong> με λεπτομερείς πληροφορίες</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>Ορίζουν ώρες λειτουργίας</strong> και διαθεσιμότητα για κάθε γήπεδο</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>Διαχειρίζονται πελάτες</strong> και τις κρατήσεις τους</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>Παρακολουθούν έσοδα</strong> και στατιστικά κρατήσεων</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>Δημιουργούν αναφορές</strong> για τη λειτουργία του γηπέδου</span>
                </li>
              </ul>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">⚙️ Πώς λειτουργεί;</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-400 mb-2">Για τους Ιδιοκτήτες Γηπέδων:</h4>
                <ul className="text-sm text-emerald-300 space-y-1">
                  <li>• Εγγραφή και δημιουργία λογαριασμού</li>
                  <li>• Προσθήκη γηπέδων με λεπτομερείς πληροφορίες</li>
                  <li>• Ορισμός τιμών και ωρών λειτουργίας</li>
                  <li>• Διαχείριση κρατήσεων και πελατών</li>
                  <li>• Παρακολούθηση εσόδων και στατιστικών</li>
                </ul>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-purple-400 mb-2">Για τους Πελάτες:</h4>
                <ul className="text-sm text-purple-300 space-y-1">
                  <li>• Αναζήτηση διαθέσιμων γηπέδων</li>
                  <li>• Προβολή τιμών και διαθεσιμότητας</li>
                  <li>• Online κράτηση γηπέδων</li>
                  <li>• Επιβεβαίωση κρατήσεων</li>
                  <li>• Ιστορικό κρατήσεων</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">🚀 Χαρακτηριστικά της Πλατφόρμας</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#040D12] rounded-lg">
                <div className="text-2xl mb-2">📅</div>
                <h4 className="font-semibold text-zinc-100 mb-2">Διαχείριση Ημερολογίου</h4>
                <p className="text-sm text-zinc-400">Εβδομαδιαία και ημερήσια προβολή κρατήσεων με drag & drop</p>
              </div>
              <div className="text-center p-4 bg-[#040D12] rounded-lg">
                <div className="text-2xl mb-2">💰</div>
                <h4 className="font-semibold text-zinc-100 mb-2">Διαχείριση Εσόδων</h4>
                <p className="text-sm text-zinc-400">Παρακολούθηση εσόδων, έκθεση κερδών και στατιστικά</p>
              </div>
              <div className="text-center p-4 bg-[#040D12] rounded-lg">
                <div className="text-2xl mb-2">👥</div>
                <h4 className="font-semibold text-zinc-100 mb-2">Διαχείριση Πελατών</h4>
                <p className="text-sm text-zinc-400">Βάση δεδομένων πελατών με ιστορικό κρατήσεων</p>
              </div>
            </div>
          </div>

          {/* Subscription Plans */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">💳 Πλάνα Συνδρομής</h3>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-zinc-400 mb-3">
                Το Yabalitsa προσφέρει <strong>δωρεάν trial 15 ημερών</strong> για όλους τους νέους χρήστες. Μετά τη λήξη του trial, μπορείτε να επιλέξετε από τα εξής πλάνα:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-[#0B151C] rounded border">
                  <h5 className="font-semibold text-zinc-100">Basic</h5>
                  <p className="text-sm text-zinc-400">1 γήπεδο, απεριόριστες κρατήσεις</p>
                  <p className="text-lg font-bold text-emerald-400">€25/μήνα</p>
                </div>
                <div className="text-center p-3 bg-[#0B151C] rounded border">
                  <h5 className="font-semibold text-zinc-100">Pro</h5>
                  <p className="text-sm text-zinc-400">2-3 γήπεδα, απεριόριστες κρατήσεις</p>
                  <p className="text-lg font-bold text-emerald-400">€45/μήνα</p>
                </div>
                <div className="text-center p-3 bg-[#0B151C] rounded border">
                  <h5 className="font-semibold text-zinc-100">Enterprise</h5>
                  <p className="text-sm text-zinc-400">3+ γήπεδα, unique booking link</p>
                  <p className="text-lg font-bold text-emerald-400">€75/μήνα</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Terms and Stripe */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">💳 Οικονομικοί Όροι & Πληρωμές</h3>
            
            {/* Payment Processing */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zinc-100 mb-3">🏦 Επεξεργασία Πληρωμών (Stripe):</h4>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <ul className="text-emerald-300 space-y-2 text-sm">
                  <li>• <strong>Πληρωμές μέσω Stripe:</strong> Όλες οι πληρωμές επεξεργάζονται ασφαλώς μέσω του Stripe</li>
                  <li>• <strong>Ασφάλεια:</strong> Τα στοιχεία πιστωτικής κάρτας δεν αποθηκεύονται στην πλατφόρμα μας</li>
                  <li>• <strong>Εγκρίσεις:</strong> Οι πληρωμές εγκρίνονται άμεσα από τις τράπεζες</li>
                  <li>• <strong>Αποτυχίες:</strong> Σε περίπτωση αποτυχίας, η συνδρομή δεν ενεργοποιείται</li>
                </ul>
              </div>
            </div>

            {/* Billing and Invoicing */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zinc-100 mb-3">📄 Τιμολόγια & Χρέωση:</h4>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <ul className="text-blue-300 space-y-2 text-sm">
                  <li>• <strong>Τιμολόγια:</strong> Κόβονται μέχρι 15 ημέρες μετά την πληρωμή</li>
                  <li>• <strong>ΦΠΑ:</strong> Όλες οι τιμές περιλαμβάνουν 24% ΦΠΑ</li>
                  <li>• <strong>Περίοδος χρέωσης:</strong> Μηνιαία, εξαμηνιαία ή ετήσια ανάλογα με το πλάνο</li>
                  <li>• <strong>Αυτόματη ανανέωση:</strong> Η συνδρομή ανανεώνεται αυτόματα στο τέλος κάθε περιόδου</li>
                  <li>• <strong>Ακύρωση:</strong> Μπορείτε να ακυρώσετε οποιαδήποτε στιγμή (δεν επιστρέφονται χρήματα)</li>
                </ul>
              </div>
            </div>

            {/* Refunds and Disputes */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zinc-100 mb-3">🔄 Επιστροφές & Διαφορές:</h4>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <ul className="text-orange-300 space-y-2 text-sm">
                  <li>• <strong>Επιστροφές:</strong> Δεν παρέχονται επιστροφές για ήδη χρησιμοποιημένες υπηρεσίες</li>
                  <li>• <strong>Διαφορές:</strong> Οι διαφορές πληρωμών διευθετούνται μέσω του Stripe</li>
                  <li>• <strong>Αποζημίωση:</strong> Σε περίπτωση τεχνικών προβλημάτων, παρέχεται παράταση συνδρομής</li>
                  <li>• <strong>Force Majeure:</strong> Δεν υπάρχει ευθύνη για διακοπές λόγω force majeure</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal Rights and Obligations */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">⚖️ Νομικά Δικαιώματα & Υποχρεώσεις</h3>
            
            {/* Yabalitsa Rights */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zinc-100 mb-3">Δικαιώματα της Yabalitsa:</h4>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <ul className="text-red-300 space-y-2 text-sm">
                  <li>• <strong>Διακοπή υπηρεσιών</strong> σε περίπτωση παραβίασης των όρων</li>
                  <li>• <strong>Τροποποίηση τιμών</strong> και πλάνων συνδρομής με προειδοποίηση 30 ημερών</li>
                  <li>• <strong>Πρόσβαση στα δεδομένα</strong> για τεχνική υποστήριξη και βελτίωση υπηρεσιών</li>
                  <li>• <strong>Δημιουργία αντιγράφων ασφαλείας</strong> των δεδομένων για λόγους προστασίας</li>
                  <li>• <strong>Ενημέρωση της πλατφόρμας</strong> και των όρων χρήσης κατά καιρούς</li>
                </ul>
              </div>
            </div>

            {/* Business Obligations */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zinc-100 mb-3">Υποχρεώσεις των Επιχειρήσεων:</h4>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <ul className="text-blue-300 space-y-2 text-sm">
                  <li>• <strong>Παροχή ακριβών πληροφοριών</strong> κατά την εγγραφή και χρήση</li>
                  <li>• <strong>Σεβασμός των νόμων</strong> περί προστασίας προσωπικών δεδομένων (GDPR)</li>
                  <li>• <strong>Πληρωμή χρεώσεων</strong> εγκαίρως και συμμόρφωση με τα πλάνα συνδρομής</li>
                  <li>• <strong>Δεν παραβιάζουν</strong> τα δικαιώματα άλλων χρηστών ή της πλατφόρμας</li>
                  <li>• <strong>Ενημερώνουν άμεσα</strong> για οποιεσδήποτε αλλαγές στα στοιχεία τους</li>
                </ul>
              </div>
            </div>

            {/* User Responsibilities */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zinc-100 mb-3">📋 Ειδικές Υποχρεώσεις Χρηστών</h4>
              <div className="space-y-4">
                <div className="border-l-4 border-b border-white/5lue-500 pl-4">
                  <h4 className="font-semibold text-zinc-100 mb-2">Ιδιοκτήτες Γηπέδων:</h4>
                <ul className="text-zinc-400 space-y-1 text-sm">
                  <li>• Παροχή ακριβών πληροφοριών για τα γήπεδα</li>
                  <li>• Ενημέρωση διαθεσιμότητας και τιμών</li>
                  <li>• Σεβασμός των κρατήσεων των πελατών</li>
                  <li>• Διατήρηση της ποιότητας των γηπέδων</li>
                  <li>• Συμμόρφωση με τους νόμους περί επιχειρήσεων</li>
                </ul>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-zinc-100 mb-2">Πελάτες:</h4>
                <ul className="text-zinc-400 space-y-1 text-sm">
                  <li>• Σεβασμός των ωρών κράτησης</li>
                  <li>• Ενημέρωση για ακύρωση κράτησης</li>
                  <li>• Σεβασμός των κανόνων του γηπέδου</li>
                  <li>• Πληρωμή των χρεώσεων εγκαίρως</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

          {/* Prohibited Uses */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">🚫 Απαγορευμένες Χρήσεις</h3>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <ul className="text-red-300 space-y-2">
                <li>• Χρήση της πλατφόρμας για παράνομες δραστηριότητες</li>
                <li>• Παραποίηση πληροφοριών ή λογαριασμών</li>
                <li>• Ενόχληση άλλων χρηστών</li>
                <li>• Απόπειρα παραβίασης ασφαλείας της πλατφόρμας</li>
                <li>• Εμπορική εκμετάλλευση χωρίς άδεια</li>
              </ul>
            </div>
          </div>

          {/* Data and Privacy */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">🔒 Δεδομένα και Απόρρητο</h3>
            <div className="bg-[#040D12] border border-white/10 rounded-lg p-4">
              <p className="text-zinc-400 mb-3">
                Το Yabalitsa συλλέγει και επεξεργάζεται μόνο τα απαραίτητα δεδομένα για τη λειτουργία της πλατφόρμας:
              </p>
              <ul className="text-zinc-400 space-y-1 text-sm">
                <li>• Στοιχεία επικοινωνίας (όνομα, email, τηλέφωνο)</li>
                <li>• Πληροφορίες γηπέδων και κρατήσεων</li>
                <li>• Στατιστικά χρήσης και εσόδων</li>
                <li>• Τεχνικά δεδομένα για τη λειτουργία της πλατφόρμας</li>
              </ul>
              <p className="text-zinc-400 mt-3">
                <strong>Δεν μοιραζόμαστε</strong> τα προσωπικά σας δεδομένα με τρίτους χωρίς τη συγκατάθεσή σας.
              </p>
            </div>
          </div>

          {/* Intellectual Property */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">📝 Δικαιώματα Πνευματικής Ιδιοκτησίας</h3>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <ul className="text-purple-300 space-y-2 text-sm">
                <li>• <strong>Yabalitsa:</strong> Κατέχει όλα τα δικαιώματα πνευματικής ιδιοκτησίας της πλατφόρμας</li>
                <li>• <strong>Επιχειρήσεις:</strong> Διατηρούν τα δικαιώματα στα περιεχόμενά τους (γήπεδα, φωτογραφίες)</li>
                <li>• <strong>Απαγόρευση:</strong> Απαγορεύεται η αντιγραφή, διανομή ή τροποποίηση της πλατφόρμας</li>
                <li>• <strong>Branding:</strong> Δεν επιτρέπεται η χρήση του brand &quot;Yabalitsa&quot; χωρίς άδεια</li>
              </ul>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">⚠️ Περιορισμός Ευθύνης</h3>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <ul className="text-red-300 space-y-2 text-sm">
                <li>• <strong>Μέγιστη ευθύνη:</strong> Η ευθύνη της Yabalitsa περιορίζεται στο ποσό που πληρώσατε</li>
                <li>• <strong>Έμμεσες ζημιές:</strong> Δεν υπάρχει ευθύνη για έμμεσες ή συνεπακόλουθες ζημιές</li>
                <li>• <strong>Διακοπές υπηρεσιών:</strong> Δεν υπάρχει ευθύνη για προσωρινές διακοπές</li>
                <li>• <strong>Απώλεια δεδομένων:</strong> Δεν υπάρχει ευθύνη για απώλεια ή φθορά δεδομένων</li>
                <li>• <strong>Τρίτοι:</strong> Δεν υπάρχει ευθύνη για ενέργειες τρίτων (Stripe, hosting)</li>
              </ul>
            </div>
          </div>

          {/* Termination and Suspension */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">🚫 Διακοπή & Αναστολή Υπηρεσιών</h3>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <ul className="text-orange-300 space-y-2 text-sm">
                <li>• <strong>Αυτόματη διακοπή:</strong> Σε περίπτωση μη πληρωμής ή παραβίασης όρων</li>
                <li>• <strong>Προειδοποίηση:</strong> 7 ημέρες πριν τη διακοπή (εκτός από σοβαρές παραβιάσεις)</li>
                <li>• <strong>Πρόσβαση:</strong> Μετά τη διακοπή, χάνετε την πρόσβαση στα δεδομένα</li>
                <li>• <strong>Επιστροφή:</strong> Δεν επιστρέφονται χρήματα για ήδη χρησιμοποιημένες υπηρεσίες</li>
                <li>• <strong>Επανενεργοποίηση:</strong> Μπορείτε να επανενεργοποιήσετε με νέα εγγραφή</li>
              </ul>
            </div>
          </div>

          {/* Force Majeure and Technical Issues */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">🌪️ Force Majeure & Τεχνικά Προβλήματα</h3>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <ul className="text-amber-300 space-y-2 text-sm">
                <li>• <strong>Force Majeure:</strong> Διακοπές λόγω φυσικών καταστροφών, πολέμων, κυβερνητικών ενεργειών</li>
                <li>• <strong>Τεχνικά προβλήματα:</strong> Προσπάθεια επίλυσης εντός 24-48 ωρών</li>
                <li>• <strong>Maintenance:</strong> Προγραμματισμένες διακοπές με προειδοποίηση 48 ωρών</li>
                <li>• <strong>Αποζημίωση:</strong> Παράταση συνδρομής για διακοπές άνω των 24 ωρών</li>
                <li>• <strong>Backup:</strong> Δημιουργία αντιγράφων ασφαλείας κάθε 24 ώρες</li>
              </ul>
            </div>
          </div>

          {/* Governing Law and Jurisdiction */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">⚖️ Ισχύον Δίκαιο & Δικαιοδοσία</h3>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
              <ul className="text-indigo-300 space-y-2 text-sm">
                <li>• <strong>Ισχύον δίκαιο:</strong> Ελληνικό δίκαιο και EU regulations</li>
                <li>• <strong>Δικαιοδοσία:</strong> Ελληνικά δικαστήρια (Αθήνα)</li>
                <li>• <strong>Εναλλακτική επίλυση:</strong> Προσπάθεια επίλυσης διαφορών με διαπραγμάτευση</li>
                <li>• <strong>GDPR:</strong> Συμμόρφωση με τον Γενικό Κανονισμό Προστασίας Δεδομένων</li>
                <li>• <strong>Ευρωπαϊκό δίκαιο:</strong> Εφαρμογή όλων των σχετικών EU directives</li>
              </ul>
            </div>
          </div>

          {/* Changes to Terms */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">📝 Τροποποιήσεις Όρων</h3>
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4">
              <ul className="text-pink-300 space-y-2 text-sm">
                <li>• <strong>Ενημέρωση:</strong> Οι όροι μπορεί να τροποποιηθούν με προειδοποίηση 30 ημερών</li>
                <li>• <strong>Ειδοποίηση:</strong> Ειδοποίηση μέσω email και εντός της πλατφόρμας</li>
                <li>• <strong>Αποδοχή:</strong> Η συνέχιση χρήσης αποτελεί αποδοχή των νέων όρων</li>
                <li>• <strong>Απόρριψη:</strong> Αν απορρίψετε, πρέπει να διακόψετε τη χρήση</li>
                <li>• <strong>Ιστορικό:</strong> Διατηρείται ιστορικό όλων των εκδόσεων των όρων</li>
              </ul>
            </div>
          </div>

          {/* Contact and Support */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">📞 Επικοινωνία και Υποστήριξη</h3>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-zinc-400 mb-3">
                Για οποιεσδήποτε ερωτήσεις σχετικά με τους όρους χρήσης ή τη λειτουργία της πλατφόρμας:
              </p>
              <div className="text-center">
                <Link 
                  href="https://www.yabalitsa.com/for-venues" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] text-black font-medium rounded-lg transition-colors"
                >
                  🏟️ Εγγραφή για Γήπεδα
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-zinc-500">
              Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')} | 
              <Link 
                href="/privacy" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-400 ml-2"
              >
                Πολιτική Απορρήτου
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
