'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Zap, Bell, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Badge } from '@/components/ui/badge';
import { toGreekUpperCase, cn } from '@/lib/utils';

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A]">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <main className="min-h-screen">
          {/* Top bar - Modern Donezo Style */}
          <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#181A1B]/90 backdrop-blur-xl border-b border-zinc-100/80">
            <div className="px-6 py-4 flex items-center justify-end gap-8 mx-auto">
              


              {/* Right Side Actions */}
              <div className="flex items-center gap-2">


                {/* Theme Toggle */}
                {mounted && (
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100"
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                )}

                {/* Notifications */}
                <div className="relative notification-bell">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {pendingBookings.length > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-14 w-80 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                        <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ειδοποιήσεις')}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">ΕΚΚΡΕΜΕΙΣ ΚΡΑΤΗΣΕΙΣ</p>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {pendingBookings.length === 0 ? (
                          <div className="p-8 text-center text-zinc-300">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-tight">ΟΛΑ ΕΝΤΑΞΕΙ!</p>
                          </div>
                        ) : (
                          pendingBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="px-5 py-3 border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setShowNotifications(false);
                                router.push(`/management/bookings/${booking.id}`);
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-zinc-900 truncate">
                                    {booking.userName || 'Άγνωστος'}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-tight">
                                    {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[9px] font-black uppercase">
                                  NEW
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Plan Indicator */}
                {venueData && (
                  <button 
                    onClick={() => router.push('/management/settings')}
                    className={cn(
                      "hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-[11px] transition-all active:scale-95",
                      (venueData.daysRemaining ?? 0) <= 7 
                        ? "bg-amber-50 border-amber-100 text-amber-600 shadow-sm shadow-amber-100" 
                        : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-100"
                    )}
                  >
                    <Zap className={cn("h-3.5 w-3.5", (venueData.daysRemaining ?? 0) <= 7 ? "text-amber-500" : "text-emerald-500")} />
                    <span className="uppercase tracking-tight">
                      {(venueData.daysRemaining ?? 0) <= 7 ? toGreekUpperCase('Ανανέωση') : `${venueData.planType || 'BASIC'}`}
                    </span>
                  </button>
                )}

                {/* Vertical Divider */}
                <div className="w-px h-8 bg-zinc-100 mx-2" />

                {/* User Profile Section */}
                <div className="flex items-center gap-3 pl-2 group cursor-pointer hover:bg-zinc-50 p-1.5 rounded-2xl transition-all">
                  <div className="flex flex-col text-right hidden sm:flex">
                    <span className="text-[13px] font-black text-zinc-900 leading-none">
                      {venueOwner?.name || 'User'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 mt-1 truncate max-w-[120px]">
                      {user?.email}
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                    {user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
