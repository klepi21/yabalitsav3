'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle, Zap, Sparkles, ArrowUpRight, Bell, CheckCircle2, CalendarDays } from 'lucide-react';
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
      <div className="lg:pl-[280px]">
        <main className="min-h-screen">
          {/* Top bar */}
          <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-zinc-200/50">
            <div className="px-8 py-4 flex items-center justify-between mx-auto">
              {/* Help/Guides */}
              <Link
                href="/management/guides"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-zinc-600 hover:text-emerald-600 transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-zinc-100 group-hover:bg-emerald-50 transition-colors">
                  <HelpCircle className="h-5 w-5" />
                </div>
                Οδηγίες Χρήσης
              </Link>

              {/* Right side: Notifications + Plan Status */}
              <div className="flex items-center gap-6">
                {/* Notification Bell */}
                <div className="relative notification-bell">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-zinc-500 hover:text-zinc-900 transition-all rounded-xl hover:bg-zinc-100 touch-target"
                  >
                    <Bell className="h-5 w-5" />
                    {pendingBookings.length > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold ring-2 ring-white">
                        {pendingBookings.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-14 w-80 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                        <h3 className="text-[15px] font-bold text-zinc-900">Ειδοποιήσεις</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Εκκρεμείς κρατήσεις που χρειάζονται έγκριση</p>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {pendingBookings.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                            <p className="mt-4 text-zinc-900 font-medium text-[15px]">Όλα εντάξει!</p>
                            <p className="text-zinc-500 text-xs mt-1">Δεν υπάρχουν νέες ειδοποιήσεις.</p>
                          </div>
                        ) : (
                          pendingBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="px-5 py-4 border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setShowNotifications(false);
                                router.push(`/management/bookings/${booking.id}`);
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-semibold text-zinc-900 truncate">
                                    {booking.userName || booking.userEmail || 'Άγνωστος'}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                                    <CalendarDays className="h-3 w-3" />
                                    {new Date(booking.startTime).toLocaleDateString('el-GR')} — {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-tight shrink-0">
                                  Εκκρεμεί
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {pendingBookings.length > 0 && (
                        <div className="px-5 py-3 border-t border-zinc-100 text-center bg-zinc-50/30">
                          <Link
                            href="/management/bookings"
                            onClick={() => setShowNotifications(false)}
                            className="text-[13px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            Προβολή όλων των κρατήσεων
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-zinc-200" />

                {/* Plan Status */}
                {venueData && (
                  <div className="flex items-center gap-4">
                    {venueData.plan === 'subscription' ? (
                      <>
                        {(venueData.daysRemaining ?? 0) > 7 ? (
                          <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-zinc-900">
                                {venueData.planType || 'Basic'} Plan
                              </span>
                              <span className="text-[11px] font-medium text-zinc-500">
                                {venueData.daysRemaining} ημέρες απομένουν
                              </span>
                            </div>
                          </div>
                        ) : (venueData.daysRemaining ?? 0) > 0 ? (
                          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                            <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/10" />
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-amber-900 uppercase tracking-tight">
                                Λήγει Σύντομα
                              </span>
                              <span className="text-[11px] font-medium text-amber-700">
                                {venueData.daysRemaining} ημέρες
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-red-500/10" />
                            <span className="text-[13px] font-bold text-red-700 uppercase tracking-tight">
                              Ληγμένο Πλάνο
                            </span>
                          </div>
                        )}

                        {(venueData.daysRemaining || 0) <= 7 ? (
                          <Link
                            href="/management/settings/renewal"
                            className="inline-flex items-center gap-2 text-[13px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                          >
                            <Zap className="h-4 w-4" />
                            Ανανέωση Τώρα
                          </Link>
                        ) : (
                          <Link
                            href="/management/settings/renewal"
                            className="inline-flex items-center gap-2 text-[13px] font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-5 py-2.5 rounded-xl transition-all active:scale-95"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                            Διαχείριση
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-zinc-400" />
                            <span className="text-[13px] font-bold text-zinc-900">
                              {venueData.plan === 'trial' ? 'Δωρεάν Δοκιμή' : 'Χωρίς Πλάνο'}
                            </span>
                          </div>
                        </div>
                        <Link
                          href="/management/settings/renewal"
                          className="inline-flex items-center gap-2 text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                        >
                          <Sparkles className="h-4 w-4" />
                          Ενεργοποίηση
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
