'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { cn, toGreekUpperCase } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function BookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPitch, setFilterPitch] = useState<string>('all');
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; status: 'pending' | 'confirmed' | 'completed' | 'cancelled' } | null>(null);

  const loadBookings = useCallback(async () => {
    if (!venueOwner || !user) return;

    try {
      setError(null);
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      const response = await fetch('/api/bookings/get-by-venue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: venueOwner.venueId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch bookings');
      }

      const data = await response.json();

      const convertedBookings = (data.bookings || []).map((booking: Record<string, unknown>) => ({
        ...booking,
        startTime: new Date(booking.startTime as string),
        endTime: new Date(booking.endTime as string),
        createdAt: new Date(booking.createdAt as string),
        updatedAt: new Date(booking.updatedAt as string),
      }));

      const convertedPitches = (data.pitches || []).map((pitch: Record<string, unknown>) => ({
        ...pitch,
        createdAt: new Date(pitch.createdAt as string),
        updatedAt: new Date(pitch.updatedAt as string),
      }));

      const convertedBlockedDates = (data.blockedDates || []).map((blocked: Record<string, unknown>) => ({
        ...blocked,
        date: new Date(blocked.date as string),
        createdAt: new Date(blocked.createdAt as string),
        updatedAt: new Date(blocked.updatedAt as string),
      }));

      setBookings(convertedBookings);
      setPitches(convertedPitches);
      setBlockedDates(convertedBlockedDates);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load bookings';
      setError(errorMessage);
      setBookings([]);
      setPitches([]);
      setBlockedDates([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadBookings();
  }, [user, venueOwner, authLoading, router, loadBookings, pathname]);

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

  const handleDeleteBooking = async (bookingId: string) => {
    setDeletingBookingId(bookingId);
    try {
      await bookingService.delete(bookingId);
      setBookings(bookings.filter(booking => booking.id !== bookingId));
    } catch (error) {
      console.error('Error deleting booking:', error);
      setError('Αποτυχία διαγραφής κράτησης');
    } finally {
      setDeletingBookingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    setUpdatingBookingId(bookingId);
    try {
      await bookingService.update(bookingId, { status: newStatus });
      setBookings(bookings.map(booking =>
        booking.id === bookingId
          ? { ...booking, status: newStatus }
          : booking
      ));
    } catch (error) {
      console.error('Error updating booking status:', error);
      setError('Αποτυχία ενημέρωσης κατάστασης κράτησης');
    } finally {
      setUpdatingBookingId(null);
      setStatusConfirm(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'ΕΠΙΒΕΒΑΙΩΜΕΝΗ', className: 'border-none text-emerald-700 bg-emerald-100 shadow-sm' },
      pending: { label: 'ΕΚΚΡΕΜΕΙ', className: 'border-none text-amber-700 bg-amber-100 shadow-sm' },
      completed: { label: 'ΟΛΟΚΛΗΡΩΜΕΝΗ', className: 'border-none text-zinc-600 bg-zinc-100 shadow-sm' },
      cancelled: { label: 'ΑΚΥΡΩΜΕΝΗ', className: 'border-none text-red-700 bg-red-100 shadow-sm' },
    };
    const { label, className } = config[status] || config.confirmed;
    return <Badge variant="outline" className={cn("px-4 py-1.5 rounded-xl font-black text-[10px] tracking-widest", className)}>{toGreekUpperCase(label)}</Badge>;
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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
            <Button variant="ghost" size="sm" onClick={() => { setError(null); loadBookings(); }} className="text-destructive/60 hover:text-destructive shrink-0">
              Δοκιμάστε ξανά
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
           <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
             <CalendarDays className="h-6 w-6 text-emerald-400" />
           </div>
           <div className="space-y-0.5">
             <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
               {toGreekUpperCase('Κρατήσεις')}
             </h1>
             <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                 {toGreekUpperCase('Διαχειριση και προγραμματισμος')}
               </p>
             </div>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/50 flex items-center shadow-inner backdrop-blur-sm">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-black transition-all active:scale-95",
                viewMode === 'calendar'
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-900/5"
                  : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {toGreekUpperCase('Ημερολόγιο')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-black transition-all active:scale-95",
                viewMode === 'list'
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-900/5"
                  : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              {toGreekUpperCase('Λίστα')}
            </button>
          </div>


          <Button asChild className="h-10 px-5 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-[12px] shadow-md transition-all active:scale-95 group">
            <Link href="/management/bookings/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              {toGreekUpperCase('Νέα Κράτηση')}
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Σύνολο', value: bookings.length, icon: CalendarDays, color: 'zinc' },
              { label: 'Εκκρεμείς', value: pendingCount, icon: Clock, color: 'amber' },
              { label: 'Επιβεβαιωμένες', value: confirmedCount, icon: CheckCircle, color: 'emerald' },
              { label: 'Σήμερα', value: todayCount, icon: Flag, color: 'blue' },
              { label: 'Ακυρωμένες', value: cancelledCount, icon: XCircle, color: 'red' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500">
                <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center mb-4 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 shadow-inner text-zinc-400">
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{stat.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400 mt-1">{toGreekUpperCase(stat.label)}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-zinc-50">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
                  <Input
                    type="text"
                    placeholder={toGreekUpperCase('Αναζητηση...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 pl-10 pr-4 rounded-lg bg-zinc-50 border-none font-bold text-xs placeholder:text-zinc-300 transition-all focus:bg-white uppercase shadow-inner"
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
                          "px-4 py-1.5 rounded-md text-[10px] font-black transition-all active:scale-95",
                          filterStatus === opt.value
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-600'
                        )}
                      >                        {toGreekUpperCase(opt.label)}
                      </button>
                    ))}
                  </div>

                  {pitches.length > 1 && (
                    <Select value={filterPitch} onValueChange={setFilterPitch}>
                      <SelectTrigger className="h-10 w-[180px] rounded-xl border-zinc-200 font-bold text-xs">
                        <SelectValue placeholder="Όλα τα γήπεδα" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="font-bold text-xs">Όλα τα γήπεδα</SelectItem>
                        {pitches.map((pitch) => (
                          <SelectItem key={pitch.id} value={pitch.id} className="font-bold text-xs">
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
                     <CalendarDays className="h-7 w-7 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Δεν βρέθηκαν κρατήσεις')}</h3>
                  <p className="text-zinc-500 mt-2 font-medium text-base">Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση σας.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 p-4">
                  {filteredBookings.map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    const startDate = new Date(booking.startTime);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={booking.id} className="group p-4 bg-white rounded-xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-1">
                            {/* Date Block */}
                            <div className={cn(
                              "shrink-0 w-14 h-16 flex flex-col items-center justify-center rounded-lg border-2 transition-all",
                              isToday 
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" 
                                : "bg-zinc-50 border-zinc-50 text-zinc-900"
                            )}>
                              <p className={cn("text-[7px] font-black uppercase tracking-wider", isToday ? "text-emerald-400" : "text-zinc-400")}>
                                {toGreekUpperCase(startDate.toLocaleDateString('el-GR', { weekday: 'short' }))}
                              </p>
                              <p className="text-xl font-black leading-none my-0.5">
                                {startDate.getDate()}
                              </p>
                              <p className={cn("text-[7px] font-black uppercase tracking-wider", isToday ? "text-emerald-400" : "text-zinc-500")}>
                                {toGreekUpperCase(startDate.toLocaleDateString('el-GR', { month: 'short' }))}
                              </p>
                            </div>                              <div className="space-y-3 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-zinc-900 truncate uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                                  {toGreekUpperCase(booking.userName) || toGreekUpperCase('ΑΓΝΩΣΤΟΣ ΠΕΛΑΤΗΣ')}
                                </h4>
                                {getStatusBadge(booking.status)}
                                {booking.notes && (
                                    <div className="px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-bold text-[7px] uppercase tracking-widest border border-orange-100">
                                      {toGreekUpperCase('Σημειωση')}
                                    </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 text-zinc-500">
                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 font-bold text-[9px] uppercase tracking-tight border border-zinc-100 group-hover:bg-white transition-colors">
                                  <Clock className="h-3 w-3 text-emerald-500/50" />
                                  {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {booking.userPhone && (
                                  <a href={`tel:${booking.userPhone}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 font-bold text-[9px] uppercase tracking-tight border border-zinc-100 hover:bg-white hover:text-emerald-600 transition-all">
                                    <Phone className="h-3 w-3 text-emerald-500/50" />
                                    {booking.userPhone}
                                  </a>
                                )}
                                {pitch && (
                                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 font-bold text-[9px] uppercase tracking-tight border border-zinc-100 group-hover:bg-white transition-colors">
                                    <Building2 className="h-3 w-3 text-emerald-500/50" />
                                    {toGreekUpperCase(pitch.name)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:justify-end gap-5 pt-2 lg:pt-0 border-t lg:border-none border-zinc-50">
                            <div className="text-left lg:text-right">
                              <p className="text-xl font-black text-zinc-900 tracking-tight">&euro;{booking.price?.toFixed(0) || '0'}</p>
                              {pitch && (
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                                  &euro;{(booking.price / parseInt(pitch.type.split('x')[0] || '10')).toFixed(0)} / ΑΤΟΜΟ
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                               <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-zinc-200 bg-zinc-50 hover:bg-white transition-all shadow-sm" asChild>
                                <Link href={`/management/bookings/${booking.id}`}>
                                  <Eye className="h-4 w-4 text-zinc-400" />
                                </Link></Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="h-8 px-3 rounded-lg border-zinc-200 font-bold gap-1.5 text-[10px] shadow-sm hover:shadow-md transition-all">
                                    ΚΑΤΑΣΤΑΣΗ
                                    <ChevronDown className="h-3 w-3 text-zinc-400" />
                                  </Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-zinc-100 text-zinc-700">
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'confirmed' })} className="rounded-lg px-3 py-3 font-bold text-sm cursor-pointer transition-colors hover:bg-emerald-50 text-zinc-700">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500 mr-3" />
                                    Επιβεβαίωση
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'completed' })} className="rounded-lg px-3 py-3 font-bold text-sm cursor-pointer transition-colors hover:bg-zinc-100 text-zinc-700">
                                    <div className="h-3 w-3 rounded-full bg-zinc-400 mr-3" />
                                    Ολοκλήρωση
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'cancelled' })} className="rounded-lg px-3 py-3 font-bold text-sm cursor-pointer transition-colors hover:bg-red-50 text-red-600">
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
                                    className="h-8 w-8 rounded-lg text-zinc-200 hover:bg-red-50 hover:text-red-500 transition-all border-none"
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
                                      <AlertDialogTitle className="text-xl font-black text-zinc-900">Διαγραφή Κράτησης;</AlertDialogTitle>
                                      <AlertDialogDescription className="text-base font-medium text-zinc-500 mt-2">
                                        Είστε σίγουροι ότι θέλετε να διαγράψετε την κράτηση του &quot;<span className="font-bold text-zinc-900">{toGreekUpperCase(booking.userName)}</span>&quot;;
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
                                      <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold text-zinc-400 flex-1 text-base" onClick={() => setDeleteConfirm(null)}>ΑΚΥΡΩΣΗ</Button>
                                      <Button className="h-12 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white flex-1 text-base shadow-lg shadow-red-200" onClick={() => handleDeleteBooking(booking.id)}>ΔΙΑΓΡΑΦΗ</Button>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
              <AlertDialogTitle className="text-2xl font-black text-zinc-900">Αλλαγή Κατάστασης;</AlertDialogTitle>
              <AlertDialogDescription className="text-[16px] font-medium text-zinc-500 mt-2">
                Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση της κράτησης σε <span className="font-black text-emerald-600">
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
