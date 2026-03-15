'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Separate useEffect for navigation to avoid setState during render
  useEffect(() => {
    if (countdown <= 0) {
      router.push('/management/settings');
    }
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <div className="text-4xl mb-4">🎉</div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Η πληρωμή ολοκληρώθηκε επιτυχώς!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Η συνδρομή σας ενεργοποιήθηκε και μπορείτε να συνεχίσετε να χρησιμοποιείτε την πλατφόρμα.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-800">
              <strong>Επόμενα βήματα:</strong>
              <ul className="mt-2 list-disc list-inside text-left space-y-1">
                <li>Ελέγξτε τα στοιχεία της συνδρομής σας στις ρυθμίσεις</li>
                <li>Θα λάβετε email επιβεβαίωσης</li>
                <li>Η συνδρομή σας θα ανανεωθεί αυτόματα</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/management/settings"
              className="w-full inline-flex justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Επιστροφή στις Ρυθμίσεις
            </Link>
            
            <Link
              href="/management"
              className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Πίσω στο Dashboard
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Αυτόματη μετάβαση σε {countdown} δευτερόλεπτα...
          </p>
        </div>
      </div>
    </div>
  );
}