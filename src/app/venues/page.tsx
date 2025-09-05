'use client';

import { Features } from '@/components/ui/features-6';
import { CyberneticBentoGrid } from '@/components/ui/cybernetic-bento-grid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VenuesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Features />
      <CyberneticBentoGrid />
      
      {/* Register Now Button Section */}
      <div className="py-16 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h3 className="text-2xl font-semibold mb-4 text-black">Έτοιμοι να ξεκινήσετε;</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Ενταχθείτε σε χιλιάδες γήπεδα που χρησιμοποιούν ήδη το Yabalitsa για να διαχειριστούν τις κρατήσεις τους και να αναπτύξουν την επιχείρησή τους.
          </p>
          <Link href="/for-venues">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
              Εγγραφή Τώρα
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
