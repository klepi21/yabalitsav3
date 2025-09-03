'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export default function SidebarWrapper({ children }: SidebarWrapperProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [venueData, setVenueData] = useState<any>(null);
  
  // Don't show sidebar on public pages
  const isRootPage = pathname === '/';
  const isLoginPage = pathname === '/venue-login';
  const isForVenues = pathname === '/for-venues';
  const isBookingPage = pathname.startsWith('/book/');
  const isTermsPage = pathname === '/terms';
  const isPrivacyPage = pathname === '/privacy';
  
  // Fetch venue data for subscription info
  useEffect(() => {
    if (user?.uid) {
      const fetchVenueData = async () => {
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const venuesRef = collection(db, 'yabalitsa_venues');
          const q = query(venuesRef, where('ownerId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const venueDoc = querySnapshot.docs[0];
            setVenueData({ id: venueDoc.id, ...venueDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching venue data:', error);
        }
      };
      
      fetchVenueData();
    }
  }, [user?.uid]);
  
  if (isRootPage || isLoginPage || isForVenues || isBookingPage || isTermsPage || isPrivacyPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }
  
  // Show sidebar for management pages only
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {/* Top bar with Help/Guides button and Subscription Info */}
          <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 border-b">
            <div className="px-6 py-3 flex items-center justify-between">
              {/* Help/Guides button */}
              <Link
                href="/management/guides"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-green-700"
                title="Οδηγίες Χρήσης"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
                Οδηγίες
              </Link>
              
              {/* Subscription Days Remaining - Right Side */}
              {venueData && (
                <div className="flex items-center gap-3">
                  {/* Minimal Status Indicator */}
                  {venueData.daysRemaining > 5 ? (
                    // All OK - Dark green dot + days without background
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-800 rounded-full"></div>
                      <span className="text-sm text-gray-700">{venueData.daysRemaining} ημέρες συνδρομής</span>
                    </div>
                  ) : venueData.daysRemaining > 0 ? (
                    // Warning - Days remaining
                    <div className="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">
                      ⏰ {venueData.daysRemaining} ημέρες
                    </div>
                  ) : (
                    // Expired
                    <div className="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">
                      ⚠️ Έληξε
                    </div>
                  )}
                  
                  {/* Renewal Link when days <= 5 */}
                  {(venueData.daysRemaining || 0) <= 5 && (
                    <Link
                      href="/management/settings/renewal"
                      className="inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-colors"
                    >
                      🔄 Ανανέωση
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}