'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function BookingQRPage() {
  const params = useSearchParams();
  const url = params.get('url') || '';

  const fullUrl = useMemo(() => {
    if (!url) return '';
    // Always use production domain for QR
    const BASE = 'https://yabalitsa.com';
    try {
      const isAbsolute = /^https?:\/\//i.test(url);
      if (isAbsolute) return url;
      return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  }, [url]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      {/* Print styles: show only the QR when printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-qr { display: block !important; }
          html, body { padding: 0; margin: 0; }
          img { max-width: 100%; height: auto; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-xl text-center">
        <h1 className="no-print text-2xl font-bold text-gray-900 mb-2">QR Κράτησης</h1>
        <p className="no-print text-gray-600 mb-4">Σκανάρετε το QR για να ανοίξει η σελίδα κράτησης του γηπέδου.</p>

        {fullUrl ? (
          <>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=${encodeURIComponent(fullUrl)}`}
              alt="QR για Σελίδα Κράτησης"
              className="print-qr mx-auto w-full max-w-md h-auto"
            />
            <div className="no-print mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Εκτύπωση QR
              </button>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              >
                Άνοιγμα Σελίδας Κράτησης
              </a>
            </div>
          </>
        ) : (
          <div className="no-print text-red-600">Δεν βρέθηκε URL.</div>
        )}
      </div>
    </div>
  );
}


