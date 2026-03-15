'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle, Zap, Sparkles, ArrowUpRight, Bell, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Badge } from '@/components/ui/badge';

interface VenueData {
  id: string;
  ownerId: string;
  plan?: string;
  planType?: string;
  daysRemaining?: number;
  [key: string]: unknown;
}

interface PendingBooking {
  id: string;
  userName: string;
  userEmail?: string;
  pitchId: string;
  pitchName?: string;
  startTime: string;
  status: string;
}

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export default function SidebarWrapper({ children }: SidebarWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, venueOwner } = useAuth();
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isPublicPage =
    pathname === '/' ||
    pathname === '/venue-login' ||
    pathname === '/for-venues' ||
    pathname.startsWith('/book/') ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/fse';

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
            setVenueData({ id: venueDoc.id, ...venueDoc.data() } as VenueData);
          }
        } catch (error) {
          console.error('Error fetching venue data:', error);
        }
      };

      fetchVenueData();
    }
  }, [user?.uid]);

  // Fetch pending bookings for notifications
  const fetchPendingBookings = useCallback(async () => {
    if (!venueOwner?.venueId || !user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/bookings/get-by-venue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ venueId: venueOwner.venueId }),
      });

      if (response.ok) {
        const data = await response.json();
        const pending = (data.bookings || [])
          .filter((b: PendingBooking) => b.status === 'pending')
          .slice(0, 5);
        setPendingBookings(pending);
      }
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
    }
  }, [venueOwner?.venueId, user]);

  useEffect(() => {
    if (!isPublicPage) {
      fetchPendingBookings();
    }
  }, [isPublicPage, fetchPendingBookings]);

  // Close notifications when clicking outside
  useEffect(() => {
    if (!showNotifications) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showNotifications]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <main className="min-h-screen">
          {/* Top bar */}
          <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-zinc-100">
            <div className="px-6 py-2.5 flex items-center justify-between">
              {/* Help/Guides */}
              <Link
                href="/management/guides"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                Οδηγίες
              </Link>

              {/* Right side: Notifications + Plan Status */}
              <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <div className="relative notification-bell">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-1.5 text-zinc-500 hover:text-zinc-700 transition-colors rounded-lg hover:bg-zinc-100"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {pendingBookings.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                        {pendingBookings.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-10 w-80 bg-white border border-zinc-100 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-100">
                        <h3 className="text-[13px] font-semibold text-zinc-900">Ειδοποιήσεις</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Κρατήσεις που χρειάζονται προσοχή</p>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {pendingBookings.length === 0 ? (
                          <div className="p-6 text-center">
                            <CheckCircle2 className="h-6 w-6 text-zinc-300 mx-auto" />
                            <p className="mt-2 text-zinc-400 text-[13px]">Όλα εντάξει!</p>
                          </div>
                        ) : (
                          pendingBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setShowNotifications(false);
                                router.push(`/management/bookings/${booking.id}`);
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-zinc-900 truncate">
                                    {booking.userName || booking.userEmail || 'Άγνωστος'}
                                  </p>
                                  <p className="text-xs text-zinc-400 mt-0.5">
                                    {new Date(booking.startTime).toLocaleDateString('el-GR')} — {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] ml-2 shrink-0">
                                  Εκκρεμεί
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {pendingBookings.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-zinc-100">
                          <Link
                            href="/management/bookings"
                            onClick={() => setShowNotifications(false)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            Προβολή όλων
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="h-5 w-px bg-zinc-150" />

                {/* Plan Status */}
                {venueData && (
                  <div className="flex items-center gap-2.5">
                    {venueData.plan === 'subscription' ? (
                      <>
                        {(venueData.daysRemaining ?? 0) > 7 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[13px] font-medium text-zinc-600">
                              {venueData.planType || 'Basic'} Plan
                            </span>
                            <span className="text-xs text-zinc-400">
                              {venueData.daysRemaining} ημέρες
                            </span>
                          </div>
                        ) : (venueData.daysRemaining ?? 0) > 0 ? (
                          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[13px] font-medium text-amber-700">
                              {venueData.planType || 'Basic'} — {venueData.daysRemaining} ημέρες
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 border border-red-100">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="text-[13px] font-medium text-red-700">
                              Πλάνο έληξε
                            </span>
                          </div>
                        )}

                        {(venueData.daysRemaining || 0) <= 7 ? (
                          <Link
                            href="#"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                          >
                            <Zap className="h-3 w-3" />
                            Ανανέωση
                          </Link>
                        ) : (
                          <Link
                            href="#"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-150 px-3 py-1.5 rounded-full transition-colors"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            Αναβάθμιση
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-100">
                          <div className="h-2 w-2 rounded-full bg-zinc-400" />
                          <span className="text-[13px] font-medium text-zinc-500">
                            {venueData.plan === 'trial' ? 'Δωρεάν Trial' : 'Χωρίς Πλάνο'}
                          </span>
                        </div>
                        <Link
                          href="#"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-full transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                          Ενεργοποίηση
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
