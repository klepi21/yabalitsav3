'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Plus,
  Search,
  CalendarDays,
  Users,
  Trash2,
  CheckCircle,
  Flag,
  RefreshCw,
  Phone,
  Building2,
  Eye,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/lib/firebase-services';
import { Booking, Pitch, BlockedDate } from '@/types';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronDown, History } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBookings } from '@/lib/queries';
import { toast } from '@/lib/toast';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/pagination';

export default function BookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  // Το API φέρνει τους τελευταίους 3 μήνες. Ο χρήστης μπορεί να ζητήσει
  // ρητά όλο το ιστορικό — δεν το κατεβάζουμε «για καλό και για κακό».
  const [showFullHistory, setShowFullHistory] = useState(false);
  const historyRange = useMemo(
    () => (showFullHistory ? { from: '2000-01-01T00:00:00.000Z', to: '' } : undefined),
    [showFullHistory]
  );

  // Τα δεδομένα έρχονται από την κοινή cache: η σελίδα ζωγραφίζεται αμέσως
  // αν έχει ξαναφορτωθεί, και το φρέσκο έρχεται από πίσω. Το ίδιο κλειδί
  // μοιράζεται με το dashboard, οπότε δεν γίνεται διπλό request.
  const {
    bookings: rawBookings,
    pitches: rawPitches,
    blockedDates: rawBlockedDates,
    hasMore: hasOlderBookings,
    error: loadError,
    isLoading,
    refresh,
  } = useBookings(venueOwner?.venueId, historyRange);

  const bookings = useMemo<Booking[]>(
    () =>
      rawBookings.map((b) => ({
        ...(b as unknown as Booking),
        startTime: new Date(b.startTime as string),
        endTime: new Date(b.endTime as string),
        createdAt: new Date(b.createdAt as string),
        updatedAt: new Date(b.updatedAt as string),
      })),
    [rawBookings]
  );

  const pitches = useMemo<Pitch[]>(
    () =>
      rawPitches.map((p) => ({
        ...(p as unknown as Pitch),
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      })),
    [rawPitches]
  );

  const blockedDates = useMemo<BlockedDate[]>(
    () =>
      rawBlockedDates.map((b) => ({
        ...(b as unknown as BlockedDate),
        date: new Date(b.date as string),
        createdAt: new Date(b.createdAt as string),
        updatedAt: new Date(b.updatedAt as string),
      })),
    [rawBlockedDates]
  );

  const error = loadError ? (loadError as Error).message : null;
  const [searchTerm, setSearchTerm] = useState('');
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPitch, setFilterPitch] = useState<string>('all');
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; status: 'pending' | 'confirmed' | 'completed' | 'cancelled' } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, venueOwner, authLoading, router, pathname]);

  const filteredBookings = bookings
    .filter(booking => {
      const matchesSearch = !searchTerm ||
        booking.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.userPhone?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
      const matchesPitch = filterPitch === 'all' || booking.pitchId === filterPitch;
      return matchesSearch && matchesStatus && matchesPitch;
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      if (a.status === 'confirmed' && b.status !== 'confirmed' && b.status !== 'pending') return -1;
      if (a.status !== 'confirmed' && a.status !== 'pending' && b.status === 'confirmed') return 1;
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      return dateB.getTime() - dateA.getTime();
    });

  // Σελιδοποίηση ΠΑΝΩ από τα φίλτρα: η αναζήτηση εξακολουθεί να καλύπτει
  // όλο το φορτωμένο παράθυρο, αλλά το DOM κρατά μόνο μία σελίδα.
  const pagination = usePagination(filteredBookings, 25);

  const handleDeleteBooking = async (bookingId: string) => {
    setDeletingBookingId(bookingId);
    try {
      await bookingService.delete(bookingId);
      await refresh();
      toast.success('Η κράτηση διαγράφηκε');
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Αποτυχία διαγραφής', 'Η κράτηση δεν διαγράφηκε.');
    } finally {
      setDeletingBookingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    setUpdatingBookingId(bookingId);
    try {
      await bookingService.update(bookingId, { status: newStatus });
      await refresh();
      toast.success('Η κατάσταση ενημερώθηκε');
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Αποτυχία ενημέρωσης', 'Η κατάσταση της κράτησης δεν άλλαξε.');
    } finally {
      setUpdatingBookingId(null);
      setStatusConfirm(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'Επιβεβαιωμένη', className: 'border-none text-emerald-700 bg-emerald-100 shadow-sm' },
      pending: { label: 'Εκκρεμεί', className: 'border-none text-amber-700 bg-amber-100 shadow-sm' },
      completed: { label: 'Ολοκληρωμένη', className: 'border-none text-zinc-600 bg-zinc-100 shadow-sm' },
      cancelled: { label: 'Ακυρωμένη', className: 'border-none text-red-700 bg-red-100 shadow-sm' },
    };
    const { label, className } = config[status] || config.confirmed;
    return <Badge variant="outline" className={cn("px-4 py-1.5 rounded-xl font-semibold text-2xs", className)}>{label}</Badge>;
  };

  // Stats
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
  const todayCount = bookings.filter(b => {
    const today = new Date();
    const start = new Date(b.startTime);
    return start.toDateString() === today.toDateString();
  }).length;

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-zinc-200 rounded" />
              <div className="h-3 w-56 bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-48 rounded-xl bg-zinc-100" />
            <div className="h-10 w-32 rounded-lg bg-zinc-200" />
          </div>
        </div>
        {/* Calendar/content skeleton */}
        <div className="rounded-2xl bg-zinc-100 h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refresh()} className="text-destructive/60 hover:text-destructive shrink-0">
              Δοκιμάστε ξανά
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3">
           <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
             <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
           </div>
           <div className="space-y-0.5">
             <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
               {'Κρατήσεις'}
             </h1>
             <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-2xs sm:text-2xs font-semibold text-zinc-500 hidden sm:block">
                 {'Διαχειριση και προγραμματισμος'}
               </p>
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-2.5 overflow-x-auto">
          <div className="bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/50 flex items-center shadow-inner backdrop-blur-sm shrink-0">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-2xs sm:text-2xs font-semibold transition-all active:scale-95",
                viewMode === 'calendar'
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-900/5"
                  : "text-zinc-500 hover:text-zinc-600 hover:bg-white/50"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {'Ημερολόγιο'}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-2xs sm:text-2xs font-semibold transition-all active:scale-95",
                viewMode === 'list'
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-900/5"
                  : "text-zinc-500 hover:text-zinc-600 hover:bg-white/50"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              {'Λίστα'}
            </button>
          </div>


          <Button asChild className="h-10 px-3 sm:px-5 rounded-lg bg-zinc-900 hover:bg-black text-white font-medium text-2xs sm:text-2xs shadow-md transition-all active:scale-95 group shrink-0">
            <Link href="/management/bookings/new" className="flex items-center gap-1.5 sm:gap-2">
              <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{'Νέα Κράτηση'}</span>
              <span className="sm:hidden">{'Νέα'}</span>
            </Link></Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="premium-card overflow-hidden">
          <WeeklyCalendar
            bookings={bookings}
            pitches={pitches}
            blockedDates={blockedDates}
            onBookingClick={(booking) => router.push(`/management/bookings/${booking.id}`)}
            onSlotClick={(date, time) => {
              const formattedDate = date.toISOString().split('T')[0];
              router.push(`/management/bookings/new?date=${formattedDate}&time=${time}`);
            }}
            onDeleteBooking={handleDeleteBooking}
            deletingBookingId={deletingBookingId}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            updatingBookingId={updatingBookingId}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
            {[
              { label: 'Σύνολο', value: bookings.length, icon: CalendarDays, color: 'zinc' },
              { label: 'Εκκρεμείς', value: pendingCount, icon: Clock, color: 'amber' },
              { label: 'Επιβεβαιωμένες', value: confirmedCount, icon: CheckCircle, color: 'emerald' },
              { label: 'Σήμερα', value: todayCount, icon: Flag, color: 'blue' },
              { label: 'Ακυρωμένες', value: cancelledCount, icon: XCircle, color: 'red' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center p-3 sm:p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-zinc-50 flex items-center justify-center mb-2 sm:mb-4 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 shadow-inner text-zinc-500">
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors tracking-tight">{stat.value}</p>
                <p className="text-2xs sm:text-2xs font-semibold text-zinc-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-2 border-b border-zinc-50">
              <div className="flex flex-col gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input
                    type="text"
                    placeholder={'Αναζήτηση...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 pl-10 pr-4 rounded-lg bg-zinc-50 border-none font-medium text-xs placeholder:text-zinc-500 transition-all focus:bg-white shadow-inner"
                  />
                </div>                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-zinc-100 p-1 rounded-lg border border-zinc-200 flex items-center shadow-inner">
                    {[
                      { value: 'all', label: 'Όλες' },
                      { value: 'pending', label: 'Εκκρεμείς' },
                      { value: 'confirmed', label: 'Επιβεβαιωμένες' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterStatus(opt.value)}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-2xs font-semibold transition-all active:scale-95",
                          filterStatus === opt.value
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-600'
                        )}
                      >                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {pitches.length > 1 && (
                    <Select value={filterPitch} onValueChange={setFilterPitch}>
                      <SelectTrigger className="h-10 w-[180px] rounded-xl border-zinc-200 font-medium text-xs">
                        <SelectValue placeholder="Όλα τα γήπεδα" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="font-medium text-xs">Όλα τα γήπεδα</SelectItem>
                        {pitches.map((pitch) => (
                          <SelectItem key={pitch.id} value={pitch.id} className="font-medium text-xs">
                            {pitch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredBookings.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                     <CalendarDays className="h-7 w-7 text-zinc-400" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{'Δεν βρέθηκαν κρατήσεις'}</h3>
                  <p className="text-zinc-500 mt-2 font-medium text-base">Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση σας.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:gap-3 p-2 sm:p-4">
                  {pagination.items.map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    const startDate = new Date(booking.startTime);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={booking.id} className="group p-3 sm:p-4 bg-white rounded-xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                          <div className="flex items-start sm:items-center gap-3 sm:gap-6 flex-1">
                            {/* Date Block */}
                            <div className={cn(
                              "shrink-0 w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center rounded-lg border-2 transition-all",
                              isToday 
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" 
                                : "bg-zinc-50 border-zinc-50 text-zinc-900"
                            )}>
                              <p className={cn("text-2xs font-semibold", isToday ? "text-emerald-400" : "text-zinc-500")}>
                                {startDate.toLocaleDateString('el-GR', { weekday: 'short' })}
                              </p>
                              <p className="text-xl font-bold leading-none my-0.5">
                                {startDate.getDate()}
                              </p>
                              <p className={cn("text-2xs font-semibold", isToday ? "text-emerald-400" : "text-zinc-500")}>
                                {startDate.toLocaleDateString('el-GR', { month: 'short' })}
                              </p>
                            </div>                              <div className="space-y-3 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-semibold text-zinc-900 truncate tracking-tight group-hover:text-emerald-600 transition-colors">
                                  {booking.userName || 'Άγνωστος πελάτης'}
                                </h4>
                                {getStatusBadge(booking.status)}
                                {booking.notes && (
                                    <div className="px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-medium text-2xs border border-orange-100">
                                      {'Σημειωση'}
                                    </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 text-zinc-500">
                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 font-medium text-2xs tracking-tight border border-zinc-100 group-hover:bg-white transition-colors">
                                  <Clock className="h-3 w-3 text-emerald-500/50" />
                                  {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {booking.userPhone && (
                                  <a href={`tel:${booking.userPhone}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 font-medium text-2xs tracking-tight border border-zinc-100 hover:bg-white hover:text-emerald-600 transition-all">
                                    <Phone className="h-3 w-3 text-emerald-500/50" />
                                    {booking.userPhone}
                                  </a>
                                )}
                                {pitch && (
                                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 font-medium text-2xs tracking-tight border border-zinc-100 group-hover:bg-white transition-colors">
                                    <Building2 className="h-3 w-3 text-emerald-500/50" />
                                    {pitch.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-5 pt-2 lg:pt-0 border-t lg:border-none border-zinc-50">
                            <div className="text-left lg:text-right">
                              <p className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">&euro;{booking.price?.toFixed(0) || '0'}</p>
                              {pitch && (
                                <p className="text-2xs font-medium text-zinc-500">
                                  &euro;{(booking.price / parseInt(pitch.type.split('x')[0] || '10')).toFixed(0)} / άτομο
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                               <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-zinc-200 bg-zinc-50 hover:bg-white transition-all shadow-sm" asChild>
                                <Link href={`/management/bookings/${booking.id}`}>
                                  <Eye className="h-4 w-4 text-zinc-500" />
                                </Link></Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="h-8 px-3 rounded-lg border-zinc-200 font-medium gap-1.5 text-2xs shadow-sm hover:shadow-md transition-all">
                                    Κατάσταση
                                    <ChevronDown className="h-3 w-3 text-zinc-500" />
                                  </Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-zinc-100 text-zinc-700">
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'confirmed' })} className="rounded-lg px-3 py-3 font-semibold text-sm cursor-pointer transition-colors hover:bg-emerald-50 text-zinc-700">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500 mr-3" />
                                    Επιβεβαίωση
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'completed' })} className="rounded-lg px-3 py-3 font-semibold text-sm cursor-pointer transition-colors hover:bg-zinc-100 text-zinc-700">
                                    <div className="h-3 w-3 rounded-full bg-zinc-400 mr-3" />
                                    Ολοκλήρωση
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'cancelled' })} className="rounded-lg px-3 py-3 font-semibold text-sm cursor-pointer transition-colors hover:bg-red-50 text-red-600">
                                    <div className="h-3 w-3 rounded-full bg-red-500 mr-3" />
                                    Ακύρωση
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <AlertDialog open={deleteConfirm === booking.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all border-none"
                                    onClick={() => setDeleteConfirm(booking.id)}
                                    disabled={deletingBookingId === booking.id}
                                  >
                                    {deletingBookingId === booking.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl p-8 max-w-md border-zinc-100 shadow-2xl">
                                    <div className="h-14 w-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                      <Trash2 className="h-7 w-7 text-red-500" />
                                    </div>
                                    <AlertDialogHeader className="text-center">
                                      <AlertDialogTitle className="text-xl font-bold text-zinc-900">Διαγραφή Κράτησης;</AlertDialogTitle>
                                      <AlertDialogDescription className="text-base font-medium text-zinc-500 mt-2">
                                        Είστε σίγουροι ότι θέλετε να διαγράψετε την κράτηση του &quot;<span className="font-bold text-zinc-900">{booking.userName}</span>&quot;;
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
                                      <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold text-zinc-500 flex-1 text-base" onClick={() => setDeleteConfirm(null)}>Ακύρωση</Button>
                                      <Button className="h-12 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white flex-1 text-base shadow-lg shadow-red-200" onClick={() => handleDeleteBooking(booking.id)}>Διαγραφή</Button>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Pagination state={pagination} label="κρατήσεις" />

                  {/* Το API φέρνει τους τελευταίους 3 μήνες. Το παλαιότερο
                      ιστορικό κατεβαίνει μόνο αν ζητηθεί ρητά. */}
                  {hasOlderBookings && !showFullHistory && (
                    <div className="flex flex-col items-center gap-2 pt-4 pb-2">
                      <p className="text-xs text-zinc-600">
                        Εμφανίζονται οι κρατήσεις των τελευταίων 3 μηνών.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFullHistory(true)}
                        className="h-9 rounded-lg text-xs font-semibold"
                      >
                        <History className="h-3.5 w-3.5" />
                        Φόρτωση πλήρους ιστορικού
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Confirmation Dialog */}
      <AlertDialog open={!!statusConfirm} onOpenChange={(open: boolean) => !open && setStatusConfirm(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-w-md">
          <div className="p-8 pt-10">
            <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="h-8 w-8 text-emerald-600" />
            </div>
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-2xl font-bold text-zinc-900">Αλλαγή Κατάστασης;</AlertDialogTitle>
              <AlertDialogDescription className="text-base font-medium text-zinc-500 mt-2">
                Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση της κράτησης σε <span className="font-semibold text-emerald-600">
                  {statusConfirm?.status === 'confirmed' ? 'Επιβεβαιωμένη' : 
                   statusConfirm?.status === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη'}
                </span>;
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="p-8 pt-4 flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" className="h-12 rounded-xl font-bold text-zinc-500 flex-1" onClick={() => setStatusConfirm(null)}>Ακύρωση</Button>
              <Button className="h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1 shadow-lg shadow-emerald-100" onClick={() => statusConfirm && handleUpdateBookingStatus(statusConfirm.id, statusConfirm.status)}>
                Επιβεβαίωση
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
