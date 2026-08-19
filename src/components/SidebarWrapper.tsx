'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Zap, Bell, User, Menu, LogOut, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePendingBookings } from '@/lib/queries';

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

/* Χάρτης διαδρομής -> τίτλος. Το top bar έδειχνε ΤΙΠΟΤΑ πριν:
   ο χρήστης δεν είχε καμία ένδειξη «πού βρίσκομαι». */
const ROUTE_TITLES: Array<[string, string]> = [
  ['/management/dashboard', 'Πίνακας ελέγχου'],
  ['/management/pitches', 'Γήπεδα'],
  ['/management/bookings', 'Κρατήσεις'],
  ['/management/booking/qr', 'QR Code'],
  ['/management/customers', 'Πελάτες'],
  ['/management/academy/users', 'Χρήστες ακαδημίας'],
  ['/management/academy/squads', 'Τμήματα'],
  ['/management/academy/user-groups', 'Κατηγορίες χρηστών'],
  ['/management/academy/training', 'Προπονήσεις'],
  ['/management/academy/payments', 'Πληρωμές ακαδημίας'],
  ['/management/academy/medical', 'Ιατρικά'],
  ['/management/academy/evaluations', 'Αξιολογήσεις'],
  ['/management/academy', 'Ακαδημία'],
  ['/management/tournaments', 'Τουρνουά'],
  ['/management/reports', 'Αναφορές'],
  ['/management/settings', 'Ρυθμίσεις'],
  ['/management/guides', 'Οδηγοί'],
  ['/management/admin-panel', 'Admin panel'],
];

const SECTION_PARENTS: Array<[string, { label: string; href: string }]> = [
  ['/management/academy/', { label: 'Ακαδημία', href: '/management/academy/users' }],
  ['/management/booking/', { label: 'Κρατήσεις', href: '/management/bookings' }],
];

function useBreadcrumb(pathname: string) {
  return useMemo(() => {
    const match = ROUTE_TITLES.find(([href]) => pathname === href || pathname.startsWith(href + '/'));
    const title = match ? match[1] : 'Διαχείριση';
    const isSubPage = match ? pathname !== match[0] : false;
    const parent = SECTION_PARENTS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
    return { title, isSubPage, parent, href: match?.[0] ?? '/management/dashboard' };
  }, [pathname]);
}

export default function SidebarWrapper({ children }: SidebarWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, venueOwner, signOut } = useAuth();
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Στοχευμένο query: status=pending, limit 5 — αντί για ολόκληρη τη
  // συλλογή. Το αποτέλεσμα είναι μοιρασμένο στην cache, οπότε η αλλαγή
  // σελίδας δεν προκαλεί νέο request.
  const { pending } = usePendingBookings(venueOwner?.venueId);
  const pendingBookings = pending as unknown as PendingBooking[];
  const { title, isSubPage, parent, href } = useBreadcrumb(pathname);

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

  if (isPublicPage) {
    return <>{children}</>;
  }

  const initials = (venueOwner?.name || user?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const daysRemaining = venueData?.daysRemaining ?? 0;
  const isExpiring = daysRemaining <= 7;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="lg:pl-[260px]">
        <main className="min-h-screen">
          <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-border">
            <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
              {/* Το κουμπί μενού ζει ΜΕΣΑ στο header, δεν επιπλέει από πάνω του. */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Άνοιγμα μενού πλοήγησης"
                className="lg:hidden -ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Πού βρίσκομαι */}
              <div className="min-w-0 flex-1">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
                  {parent && (
                    <>
                      <Link
                        href={parent.href}
                        className="hidden sm:block text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
                      >
                        {parent.label}
                      </Link>
                      <ChevronRight className="hidden sm:block h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                    </>
                  )}
                  {isSubPage ? (
                    <>
                      <Link
                        href={href}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
                      >
                        {title}
                      </Link>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-semibold text-zinc-900 truncate">Λεπτομέρειες</span>
                    </>
                  ) : (
                    <h1 className="text-base font-semibold text-zinc-900 truncate">{title}</h1>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Πλάνο συνδρομής */}
                {venueData && (
                  <button
                    onClick={() => router.push('/management/settings')}
                    className={cn(
                      'hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors',
                      isExpiring
                        ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                        : 'bg-zinc-50 border-border text-zinc-700 hover:bg-zinc-100'
                    )}
                  >
                    <Zap className={cn('h-3.5 w-3.5', isExpiring ? 'text-amber-600' : 'text-emerald-600')} />
                    {/* Πριν έδειχνε το αποθηκευμένο planType, που είναι
                        στιγμιότυπο τη στιγμή της αγοράς και ξεπερνιόταν
                        σιωπηλά όταν άλλαζε το μέγεθος — με αποτέλεσμα να
                        διαφωνεί με τη σελίδα συνδρομής. Η κατάσταση είναι
                        και πιο χρήσιμη πληροφορία από το όνομα ζώνης. */}
                    {isExpiring
                      ? `Ανανέωση σε ${daysRemaining} ημ.`
                      : venueData.plan === 'trial'
                        ? `Δοκιμή • ${daysRemaining} ημ.`
                        : `Συνδρομή • ${daysRemaining} ημ.`}
                  </button>
                )}

                {/* Ειδοποιήσεις — Radix popover: κλείνει με Esc, σωστό aria, focus trap */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      aria-label={
                        pendingBookings.length > 0
                          ? `Ειδοποιήσεις, ${pendingBookings.length} εκκρεμείς κρατήσεις`
                          : 'Ειδοποιήσεις'
                      }
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                    >
                      <Bell className="h-5 w-5" />
                      {pendingBookings.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-2xs font-bold text-white ring-2 ring-white">
                          {pendingBookings.length}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-zinc-900">Ειδοποιήσεις</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Εκκρεμείς κρατήσεις προς έγκριση</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {pendingBookings.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="h-7 w-7 mx-auto mb-3 text-zinc-300" aria-hidden="true" />
                          <p className="text-sm font-medium text-zinc-700">Καμία εκκρεμότητα</p>
                          <p className="text-xs text-zinc-500 mt-1">Θα ειδοποιηθείτε μόλις έρθει νέα κράτηση.</p>
                        </div>
                      ) : (
                        pendingBookings.map((booking) => (
                          <button
                            key={booking.id}
                            onClick={() => router.push(`/management/bookings/${booking.id}`)}
                            className="w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-zinc-50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 truncate">
                                  {booking.userName || 'Άγνωστος πελάτης'}
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {new Date(booking.startTime).toLocaleString('el-GR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-amber-800 text-2xs font-semibold shrink-0"
                              >
                                Εκκρεμεί
                              </Badge>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {pendingBookings.length > 0 && (
                      <Link
                        href="/management/bookings"
                        className="block px-4 py-3 text-center text-xs font-semibold text-emerald-700 hover:bg-zinc-50 border-t border-border transition-colors"
                      >
                        Όλες οι κρατήσεις
                      </Link>
                    )}
                  </PopoverContent>
                </Popover>

                <div className="hidden sm:block w-px h-6 bg-border mx-1" />

                {/* Λογαριασμός — πριν έδειχνε κλικαρίσιμο αλλά δεν έκανε τίποτα. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Μενού λογαριασμού"
                      className="flex items-center gap-2.5 h-10 pl-1 pr-1.5 sm:pr-2 rounded-lg hover:bg-zinc-100 transition-colors"
                    >
                      <span className="hidden md:flex flex-col items-end leading-tight">
                        <span className="text-sm font-medium text-zinc-900 max-w-[140px] truncate">
                          {venueOwner?.name || 'Λογαριασμός'}
                        </span>
                        <span className="text-2xs text-zinc-500 max-w-[140px] truncate">{user?.email}</span>
                      </span>
                      <span className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center overflow-hidden shrink-0">
                        {user?.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                        ) : initials ? (
                          <span className="text-xs font-semibold">{initials}</span>
                        ) : (
                          <User className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {venueOwner?.name || 'Λογαριασμός'}
                      </p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{user?.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/management/settings')}>
                      <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                      Ρυθμίσεις
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Αποσύνδεση
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="max-w-[1600px] mx-auto p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
