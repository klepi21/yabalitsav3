'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ForVenuesPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  const [form, setForm] = useState({
    // Owner
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
    // Venue
    venueName: '',
    venueAddress: '',
    venueEmail: '',
    venuePhone: '',
    venueAfm: '',
    venueDoy: '',
    // Plan
    plan: 'subscription',
    acceptTerms: false
  });

  // Derived password validation states (live feedback)
  const passHasMinLen = form.password.length >= 6;
  const passHasUpper = /[A-Z]/.test(form.password);
  const passHasSymbol = /[!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]/.test(form.password);
  const passMatches = form.password.length > 0 && form.password === form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // 1) Validate password, AFM, and terms
      // Password validation
      const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]).{6,}$/;
      if (!strong.test(form.password)) {
        throw new Error('Ο κωδικός πρέπει να έχει 6+ χαρακτήρες, 1 κεφαλαίο και 1 σύμβολο.');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('Οι κωδικοί δεν ταιριάζουν.');
      }
      // AFM validation (10 digits)
      const afmOk = /^\d{10}$/.test(form.venueAfm);
      if (!afmOk) {
        throw new Error('Το ΑΦΜ πρέπει να έχει 10 ψηφία.');
      }
      if (!form.acceptTerms) {
        throw new Error('Πρέπει να αποδεχθείς τους Όρους Χρήσης και την Πολιτική Απορρήτου.');
      }

      // 2) Create auth user
      const cred = await createUserWithEmailAndPassword(auth, form.ownerEmail, form.password);
      const uid = cred.user.uid;

      // 3) Create venue
      const venueDoc = await addDoc(collection(db, 'yabalitsa_venues'), {
        name: form.venueName,
        address: form.venueAddress,
        contactDetails: { email: '', phone: '' },
        ownerId: uid,
        plan: form.plan,
        tax: { afm: form.venueAfm, doy: form.venueDoy },
        daysRemaining: 15,
        lastDecrementAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4) Create venue owner profile
      await addDoc(collection(db, 'yabalitsa_venueOwners'), {
        venueId: venueDoc.id,
        email: form.ownerEmail,
        name: form.ownerName,
        phone: form.ownerPhone,
        role: 'owner',
        permissions: ['manage:all'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccess('ok');
      setShowCongrats(true);
      setForm({
        ownerName: '', ownerEmail: '', ownerPhone: '', password: '', confirmPassword: '',
        venueName: '', venueAddress: '', venueEmail: '', venuePhone: '', venueAfm: '', venueDoy: '',
        plan: 'subscription', acceptTerms: false
      });
    } catch (err: any) {
      setError(err?.message || 'Κάτι πήγε στραβά.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Image src="/yabalitsalogo.png" alt="Yabalitsa" width={140} height={48} className="h-12 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-black">Διαχειρίζεσαι γηπεδάκια;</h1>
          <p className="text-gray-800 mt-2">Το Yabalitsa σε βοηθά να διαχειριστείς κρατήσεις, πελάτες και έσοδα—εύκολα.</p>
        </div>

        {/* Pricing - Simple policy */}
        <div className="mb-12">
          <div className="rounded-xl border border-green-200 bg-green-50 text-green-900 p-4 text-sm">
            Δωρεάν για τις πρώτες 15 ημέρες. Ξεκίνα σήμερα χωρίς κόστος και επίλεξε μοντέλο χρέωσης αργότερα.
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 select-none pointer-events-none">
            <div className="rounded-xl border p-6 text-left border-gray-200 bg-white">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold text-black">Πλήρες Διαχειριστικό</h3>
                <div className="text-2xl font-bold text-green-700">30€ / μήνα</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                <li>• Πλήρης διαχείριση κρατήσεων, πελατών και εσόδων</li>
                <li>• Ημερολόγιο (daily/weekly), επαναλαμβανόμενες κρατήσεις</li>
                <li>• Κλειστές ημερομηνίες και ωράρια ανά γήπεδο</li>
                <li>• Αναφορές και dashboards</li>
                <li>• Πολλαπλά γήπεδα/εγκαταστάσεις</li>
                <li>• Προτεραιότητα υποστήριξης</li>
              </ul>
            </div>
            <div className="rounded-xl border p-6 text-left border-gray-200 bg-white">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold text-black">Premium</h3>
                <div className="text-2xl font-bold text-green-700">1€ / ανά κράτηση</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                <li>• Εμφάνιση στο FSE (Football Search Engine)</li>
                <li>• Αιτήματα/κρατήσεις που προέρχονται από την πλατφόρμα</li>
                <li>• Dashboard κρατήσεων</li>
                <li>• Χωρίς μηνιαία συνδρομή</li>
                <li>• Περιλαμβάνει όλα του «Πλήρες Διαχειριστικό»</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4 text-black">Εγγραφή Επιχείρησης</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-sm text-gray-500">Συμπλήρωσε τα στοιχεία σου. Θα δημιουργηθεί λογαριασμός ιδιοκτήτη και το γήπεδό σου.</div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ονοματεπώνυμο Ιδιοκτήτη</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.ownerName} onChange={e=>setForm({...form, ownerName:e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Ιδιοκτήτη</label>
              <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.ownerEmail} onChange={e=>setForm({...form, ownerEmail:e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Τηλέφωνο</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.ownerPhone} onChange={e=>setForm({...form, ownerPhone:e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Κωδικός</label>
              <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Επιβεβαίωση Κωδικού</label>
              <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.confirmPassword} onChange={e=>setForm({...form, confirmPassword:e.target.value})} required />
            </div>
            {/* Password rules checklist */}
            <div className="md:col-span-2 text-xs text-gray-600">
              <ul className="space-y-1">
                <li className={`flex items-center ${passHasMinLen ? 'text-green-700' : ''}`}>
                  <span className="mr-2">{passHasMinLen ? '✔️' : '•'}</span> Τουλάχιστον 6 χαρακτήρες
                </li>
                <li className={`flex items-center ${passHasUpper ? 'text-green-700' : ''}`}>
                  <span className="mr-2">{passHasUpper ? '✔️' : '•'}</span> Τουλάχιστον 1 κεφαλαίο γράμμα
                </li>
                <li className={`flex items-center ${passHasSymbol ? 'text-green-700' : ''}`}>
                  <span className="mr-2">{passHasSymbol ? '✔️' : '•'}</span> Τουλάχιστον 1 σύμβολο (!,@,#,...)
                </li>
                <li className={`flex items-center ${passMatches ? 'text-green-700' : ''}`}>
                  <span className="mr-2">{passMatches ? '✔️' : '•'}</span> Οι κωδικοί ταιριάζουν
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="md:col-span-2">
              <div className="border-t border-gray-200 my-2"></div>
              <h3 className="text-sm font-semibold text-black mt-2">Στοιχεία Γηπέδου</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Επωνυμία Εταιρείας</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueName} onChange={e=>setForm({...form, venueName:e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Διεύθυνση Γηπέδου</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueAddress} onChange={e=>setForm({...form, venueAddress:e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ΑΦΜ Επιχείρησης</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueAfm} onChange={e=>setForm({...form, venueAfm:e.target.value})} placeholder="10 ψηφία" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Δ.Ο.Υ.</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueDoy} onChange={e=>setForm({...form, venueDoy:e.target.value})} required />
            </div>
            {/* Optional venue contact fields removed for now; will be set inside management */}

            {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}
            {/* success handled by modal */}

            <div className="md:col-span-2 text-xs text-gray-600 flex items-start space-x-2">
              <input
                id="acceptTerms"
                type="checkbox"
                className="mt-0.5"
                checked={form.acceptTerms}
                onChange={(e)=>setForm({...form, acceptTerms: e.target.checked})}
              />
              <label htmlFor="acceptTerms" className="select-none">
                Αποδέχομαι τους <a href="#" className="underline">Όρους Χρήσης</a> και την <a href="#" className="underline">Πολιτική Απορρήτου</a>.
              </label>
            </div>

            <div className="md:col-span-2">
              <button type="submit" disabled={isSubmitting} className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-lg disabled:opacity-50">
                {isSubmitting ? 'Αποστολή...' : 'Ξεκίνα τώρα δωρεάν'}
              </button>
            </div>
          </form>
        </div>
        {showCongrats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Συγχαρητήρια!</h3>
              <p className="text-gray-600 mb-6">Η εγγραφή σας ολοκληρώθηκε. Μπορείτε να ξεκινήσετε να χρησιμοποιείτε το διαχειριστικό.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={()=>router.push('/management')} className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg font-medium">Μετάβαση στο Διαχειριστικό</button>
                <button onClick={()=>setShowCongrats(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-medium">Κλείσιμο</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


