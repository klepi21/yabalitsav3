'use client';

import { useState } from 'react';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import SupportEmail from '@/components/SupportEmail';

export default function ForVenuesPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setSuccess] = useState<string | null>(null);
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
    venueCity: 'Αθήνα', // Default to Athens
    venueEmail: '',
    venuePhone: '',
    venueAfm: '',
    venueDoy: '',
    // Plan
    plan: 'trial',
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
      console.log('Starting registration process...');
      // 1) Validate password, AFM, and terms
      // Password validation
      const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]).{6,}$/;
      if (!strong.test(form.password)) {
        throw new Error('Ο κωδικός πρέπει να έχει 6+ χαρακτήρες, 1 κεφαλαίο και 1 σύμβολο.');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('Οι κωδικοί δεν ταιριάζουν.');
      }
      // AFM validation (9 digits)
      const afmOk = /^\d{9}$/.test(form.venueAfm);
      if (!afmOk) {
        throw new Error('Το ΑΦΜ πρέπει να έχει 9 ψηφία.');
      }
      if (!form.acceptTerms) {
        throw new Error('Πρέπει να αποδεχθείς τους Όρους Χρήσης και την Πολιτική Απορρήτου.');
      }

      // 2) Create auth user
      console.log('Creating auth user...');
      const cred = await createUserWithEmailAndPassword(auth, form.ownerEmail, form.password);

      // 3) Get the ID token
      const idToken = await cred.user.getIdToken();

      // 4) Create venue via server-side API
      const venueResponse = await fetch('/api/venues/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          venueName: form.venueName,
          venueAddress: form.venueAddress,
          venueCity: form.venueCity,
          venueEmail: form.venueEmail,
          venuePhone: form.venuePhone,
          venueAfm: form.venueAfm,
          venueDoy: form.venueDoy,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          plan: form.plan
        })
      });

      if (!venueResponse.ok) {
        const errorData = await venueResponse.json();
        throw new Error(errorData.error || 'Failed to create venue');
      }

      await venueResponse.json();

      setSuccess('ok');
      setShowCongrats(true);
      console.log('Registration successful, showing modal.');
      setForm({
        ownerName: '', ownerEmail: '', ownerPhone: '', password: '', confirmPassword: '',
        venueName: '', venueAddress: '', venueCity: 'Αθήνα', venueEmail: '', venuePhone: '', venueAfm: '', venueDoy: '',
        plan: 'trial', acceptTerms: false
      });
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const code = (err as { code?: string })?.code || '';
      const firebaseErrors: Record<string, string> = {
        'auth/email-already-in-use': 'Αυτό το email χρησιμοποιείται ήδη. Δοκιμάστε να συνδεθείτε ή χρησιμοποιήστε άλλο email.',
        'auth/invalid-email': 'Μη έγκυρη διεύθυνση email.',
        'auth/weak-password': 'Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.',
        'auth/operation-not-allowed': 'Η εγγραφή δεν είναι διαθέσιμη αυτή τη στιγμή.',
        'auth/too-many-requests': 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.',
        'auth/network-request-failed': 'Πρόβλημα σύνδεσης. Ελέγξτε το internet σας.',
      };
      setError(firebaseErrors[code] || (err as Error)?.message || 'Κάτι πήγε στραβά.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Επιστροφή στην αρχική
          </Link>
          <div className="flex justify-center">
            <Image src="/yabalitsalogo.png" alt="Yabalitsa" width={140} height={48} className="h-12 w-auto" />
          </div>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-black">Διαχειρίζεσαι γηπεδάκια;</h1>
          <p className="text-gray-800 mt-2">Το Yabalitsa σε βοηθά να διαχειριστείς κρατήσεις, πελάτες και έσοδα—εύκολα.</p>
        </div>

        {/* Free Trial Info - Before Form */}
        <div className="mb-8">
          <div className="rounded-xl border border-green-200 bg-green-50 text-green-900 p-6 text-center">
            <h2 className="text-xl font-bold mb-2">🎉 Δωρεάν για τις πρώτες 15 ημέρες!</h2>
            <p className="text-gray-700">Ξεκίνα σήμερα χωρίς κόστος και επίλεξε το πλάνο που σου ταιριάζει μετά τις 15 ημέρες</p>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4 text-black">Εγγραφή Επιχείρησης</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 text-sm text-gray-500">Συμπλήρωσε τα στοιχεία σου. Θα δημιουργηθεί λογαριασμός ιδιοκτήτη και το γήπεδό σου.</div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ονοματεπώνυμο Ιδιοκτήτη</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Ιδιοκτήτη</label>
              <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Τηλέφωνο</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.ownerPhone} onChange={e => setForm({ ...form, ownerPhone: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Κωδικός</label>
              <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Επιβεβαίωση Κωδικού</label>
              <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
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
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueName} onChange={e => setForm({ ...form, venueName: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Διεύθυνση Γηπέδου</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueAddress} onChange={e => setForm({ ...form, venueAddress: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Πόλη</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={form.venueCity}
                onChange={e => setForm({ ...form, venueCity: e.target.value })}
                required
              >
                <option value="Αθήνα">Αθήνα</option>
                <option value="Θεσσαλονίκη">Θεσσαλονίκη</option>
                <option value="Πάτρα">Πάτρα</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ΑΦΜ Επιχείρησης</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueAfm} onChange={e => setForm({ ...form, venueAfm: e.target.value })} placeholder="9 ψηφία" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Δ.Ο.Υ.</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={form.venueDoy} onChange={e => setForm({ ...form, venueDoy: e.target.value })} required />
            </div>

            {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}

            <div className="md:col-span-2 text-xs text-gray-600 flex items-start space-x-2">
              <input
                id="acceptTerms"
                type="checkbox"
                className="mt-0.5"
                checked={form.acceptTerms}
                onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
              />
              <label htmlFor="acceptTerms" className="select-none">
                Αποδέχομαι τους <Link href="/terms" className="underline text-blue-600 hover:text-blue-800">Όρους Χρήσης</Link> και την <Link href="/privacy" className="underline text-blue-600 hover:text-blue-800">Πολιτική Απορρήτου</Link>.
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
                <button onClick={() => router.push('/management')} className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg font-medium">Μετάβαση στο Διαχειριστικό</button>
                <button onClick={() => setShowCongrats(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-medium">Κλείσιμο</button>
              </div>
            </div>
          </div>
        )}


        {/* Support Section */}
        <div className="text-center py-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Χρειάζεστε βοήθεια;
            </h3>
            <p className="text-gray-600 mb-4">
              Η ομάδα μας είναι εδώ για να σας βοηθήσει με οποιαδήποτε ερώτηση
            </p>
            <SupportEmail variant="highlighted" />
          </div>
        </div>

      </div>
    </div>
  );
}