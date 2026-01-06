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
  const isFSEPage = pathname === '/fse';
  
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
  
  if (isRootPage || isLoginPage || isForVenues || isBookingPage || isTermsPage || isPrivacyPage || isFSEPage) {
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
              
              {/* Plan Status - Right Side */}
              {venueData && (
                <div className="flex items-center gap-3">
                  {/* Plan Status Indicator */}
                  {venueData.plan === 'subscription' ? (
                    // Active Plan
                    <>
                      {venueData.daysRemaining > 7 ? (
                        // All OK - Green indicator
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">
                            {venueData.planType || 'Basic'} Plan
                          </span>
                          <span className="text-xs text-gray-500">
                            ({venueData.daysRemaining} ημέρες)
                          </span>
                        </div>
                      ) : venueData.daysRemaining > 0 ? (
                        // Warning - Expires soon
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200">
                          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-amber-800">
                            {venueData.planType || 'Basic'} - {venueData.daysRemaining} ημέρες
                          </span>
                        </div>
                      ) : (
                        // Expired
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-200">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-red-800">
                            Πλάνο έληξε
                          </span>
                        </div>
                      )}
                      
                      {/* Renewal/Upgrade Link */}
                      {(venueData.daysRemaining || 0) <= 7 ? (
                        <Link
                          href="#"
                          //href="/management/settings/renewal"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                        >
                          ⚡ Ανανέωση
                        </Link>
                      ) : (
                        <Link
                          //href="/management/settings/renewal"
                          href="#"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                          🚀 Αναβάθμιση
                        </Link>
                      )}
                    </>
                  ) : (
                    // Trial or No Plan
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-600">
                          {venueData.plan === 'trial' ? 'Δωρεάν Trial' : 'Χωρίς Πλάνο'}
                        </span>
                      </div>
                      <Link
                        //href="#"
                        href="/management/settings/renewal"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                      >
                        ✨ Ενεργοποίηση
                      </Link>
                    </div>
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