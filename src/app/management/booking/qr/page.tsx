'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useMemo, Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Loader2, QrCode, Download, Printer, ExternalLink, Copy, Check } from 'lucide-react';
import { toGreekUpperCase } from '@/lib/utils';

function QRInner() {
  const params = useSearchParams();
  const { venueOwner, bookingsEnabled } = useAuth();
  const [venueName, setVenueName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const paramUrl = params.get('url') || '';

  useEffect(() => {
    async function fetchVenue() {
      if (venueOwner?.venueId) {
        try {
          const venue = await venueService.getById(venueOwner.venueId);
          if (venue) {
            setVenueName(venue.name);
          }
        } catch (error) {
          console.error('Error fetching venue:', error);
        }
      }
      setLoading(false);
    }
    fetchVenue();
  }, [venueOwner?.venueId]);

  const venueSlug = useMemo(() => {
    if (!venueName) return '';
    return venueName.toLowerCase().replace(/\s+/g, '');
  }, [venueName]);

  const fullUrl = useMemo(() => {
    const url = paramUrl || (venueSlug ? `/book/${venueSlug}` : '');
    if (!url) return '';
    const BASE = 'https://yabalitsa.com';
    try {
      const isAbsolute = /^https?:\/\//i.test(url);
      if (isAbsolute) return url;
      return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  }, [paramUrl, venueSlug]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(fullUrl)}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-booking-${venueSlug || 'yabalitsa'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Φορτωση...')}</p>
      </div>
    );
  }

  if (!bookingsEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-[2rem] bg-zinc-200 mb-4">
            <QrCode className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900">{toGreekUpperCase('Online Κρατήσεις Απενεργοποιημένες')}</h2>
          <p className="text-sm text-zinc-400">
            Οι online κρατήσεις είναι απενεργοποιημένες για το venue σας.
            Ενεργοποιήστε τις από τον Πίνακα Ελέγχου για να δημιουργήσετε QR Code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 md:p-12 overflow-hidden relative">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-qr { display: block !important; margin: 0 auto; width: 300px !important; height: 300px !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] -mr-64 -mt-64 no-print" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] -ml-64 -mb-64 no-print" />

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        <div className="text-center space-y-2 no-print">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-[2rem] bg-zinc-900 shadow-xl shadow-zinc-200 mb-4 animate-bounce-slow">
            <QrCode className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight flex items-center justify-center gap-3">
            QR <span className="text-emerald-500">BOOKING</span>
          </h1>
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">{toGreekUpperCase('Δημιουργία κωδικού για τη σελίδα σας')}</p>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl shadow-zinc-200 p-8 md:p-12 border border-black/[0.03] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

          <div className="relative flex flex-col items-center gap-8">
            {fullUrl ? (
              <>
                {/* QR Container */}
                <div className="relative p-6 bg-white rounded-[2rem] border border-zinc-100 shadow-xl group-hover:scale-[1.02] transition-transform duration-700">
                  <Image
                    src={qrImageUrl}
                    alt="QR Booking"
                    width={400}
                    height={400}
                    className="w-full max-w-[280px] h-auto rounded-xl print-qr"
                    unoptimized
                  />
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-zinc-900 text-white text-[10px] font-black rounded-full shadow-lg no-print">
                    SCAN ME
                  </div>
                </div>

                {/* URL Display */}
                <div className="w-full no-print">
                  <div className="flex items-center gap-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group/link">
                    <div className="flex-1 truncate">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-0.5 tracking-widest">{toGreekUpperCase('Σύνδεσμος Κράτησης')}</p>
                      <p className="text-xs font-black text-zinc-900 truncate">{fullUrl}</p>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-100 rounded-xl hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-100 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Main Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full no-print pt-4 border-t border-zinc-50">
                  <button
                    onClick={handleDownload}
                    className="h-14 flex items-center justify-center gap-3 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-zinc-200 group/btn"
                  >
                    <Download className="h-4 w-4 text-emerald-400 group-hover:animate-bounce" />
                    {toGreekUpperCase('Κατέβασμα QR')}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="h-14 flex items-center justify-center gap-3 bg-white text-zinc-900 border border-zinc-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all active:scale-95 shadow-sm group/btn"
                  >
                    <Printer className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900" />
                    {toGreekUpperCase('Εκτύπωση')}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                  <QrCode className="h-8 w-8 text-red-500 opacity-20" />
                </div>
                <p className="text-zinc-400 font-bold uppercase tracking-widest">{toGreekUpperCase('Δεν βρέθηκε URL κράτησης')}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] font-bold text-zinc-400 no-print uppercase tracking-widest leading-relaxed">
          {toGreekUpperCase('Τοποθετήστε τον κωδικό στην είσοδο του γηπέδου')}<br />
          {toGreekUpperCase('για να διευκολύνετε τις κρατήσεις των πελατών σας')}
        </p>
      </div>
    </div>
  );
}

export default function BookingQRPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Φόρτωση...</div>}>
      <QRInner />
    </Suspense>
  );
}


