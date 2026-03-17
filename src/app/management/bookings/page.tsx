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
  Pencil,
  AlertCircle,
  Clock,
  Euro,
  XCircle,
  Filter,
  X,
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    <div className="space-y-10 pb-20">
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <div>
                <p className="text-red-700 font-black text-lg uppercase tracking-tight">{toGreekUpperCase('Σφάλμα Συστήματος')}</p>
                <p className="text-red-600 font-bold">{error}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { setError(null); loadBookings(); }} 
              className="h-14 px-8 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-black uppercase tracking-widest text-xs"
            >
              {toGreekUpperCase('Δοκιμάστε ξανά')}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
           <div className="h-20 w-20 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0">
             <CalendarDays className="h-10 w-10 text-emerald-400" />
           </div>
           <div className="space-y-1">
             <h1 className="text-5xl font-black tracking-tight text-zinc-900 uppercase">
               {toGreekUpperCase('Κρατήσεις')}
             </h1>
             <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
               {toGreekUpperCase('ΔΙΑΧΕΙΡΙΣΗ ΚΑΙ ΠΡΟΓΡΑΜΜΑΤΙΣΜΟΣ')}
             </p>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-zinc-100 p-2 rounded-[1.75rem] border border-zinc-200 flex items-center shadow-inner">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-2xl text-[14px] font-black transition-all active:scale-95",
                viewMode === 'calendar'
                  ? "bg-white text-emerald-600 shadow-xl scale-105"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <CalendarDays className="h-6 w-6" />
              {toGreekUpperCase('Ημερολόγιο')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-2xl text-[14px] font-black transition-all active:scale-95",
                viewMode === 'list'
                  ? "bg-white text-emerald-600 shadow-xl scale-105"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Users className="h-6 w-6" />
              {toGreekUpperCase('Λίστα')}
            </button>
          </div>

          <Button asChild className="h-20 px-10 rounded-[1.75rem] bg-zinc-900 hover:bg-black text-white font-black text-xl shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
            <Link href="/management/bookings/new" className="flex items-center gap-4">
              <Plus className="h-8 w-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              {toGreekUpperCase('Νέα Κράτηση')}
            </Link>
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-xl overflow-hidden p-8">
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
        <div className="space-y-12">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4 shadow-inner text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                <CalendarDays className="h-8 w-8" />
              </div>
              <p className="text-4xl font-black text-zinc-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{bookings.length}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">{toGreekUpperCase('Σύνολο')}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:shadow-xl hover:border-amber-100 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4 shadow-inner text-zinc-300 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
                <Clock className="h-8 w-8" />
              </div>
              <p className="text-4xl font-black text-zinc-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight">{pendingCount}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">{toGreekUpperCase('Εκκρεμείς')}</p>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4 shadow-inner text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                <CheckCircle className="h-8 w-8" />
              </div>
              <p className="text-4xl font-black text-zinc-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{confirmedCount}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">{toGreekUpperCase('Επιβεβαιωμένες')}</p>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:shadow-xl hover:border-blue-100 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4 shadow-inner text-zinc-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                <Flag className="h-8 w-8" />
              </div>
              <p className="text-4xl font-black text-zinc-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{todayCount}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">{toGreekUpperCase('Σήμερα')}</p>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:shadow-xl hover:border-red-100 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4 shadow-inner text-zinc-300 group-hover:bg-red-50 group-hover:text-red-500 transition-all">
                <XCircle className="h-8 w-8" />
              </div>
              <p className="text-4xl font-black text-zinc-900 group-hover:text-red-600 transition-colors uppercase tracking-tight">{cancelledCount}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">{toGreekUpperCase('Ακυρωμένες')}</p>
            </div>
          </div>

          <div className="rounded-[3rem] border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <div className="p-10 border-b border-zinc-50 bg-zinc-50/50">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div className="relative flex-1 group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
                  <Input
                    type="text"
                    placeholder={toGreekUpperCase('Αναζήτηση με όνομα ή τηλέφωνο...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-20 pl-16 pr-8 rounded-[1.5rem] bg-white border-zinc-100 font-black text-xl placeholder:text-zinc-300 transition-all focus:ring-4 focus:ring-emerald-500/10 uppercase"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-6">
                  <div className="bg-zinc-100 p-2 rounded-[1.5rem] border border-zinc-200 flex items-center shadow-inner">
                    {[
                      { value: 'all', label: 'Όλες' },
                      { value: 'pending', label: 'Εκκρεμείς' },
                      { value: 'confirmed', label: 'Επιβεβαιωμένες' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterStatus(opt.value)}
                        className={cn(
                          "px-8 py-4 rounded-xl text-[14px] font-black transition-all active:scale-95",
                          filterStatus === opt.value
                            ? 'bg-white text-zinc-900 shadow-xl scale-105'
                            : 'text-zinc-400 hover:text-zinc-600'
                        )}
                      >
                        {toGreekUpperCase(opt.label)}
                      </button>
                    ))}
                  </div>

                  {pitches.length > 1 && (
                    <Select value={filterPitch} onValueChange={setFilterPitch}>
                      <SelectTrigger className="h-14 w-[240px] rounded-2xl border-zinc-200 font-black text-[13px] bg-white uppercase tracking-widest">
                        <SelectValue placeholder={toGreekUpperCase('Όλα τα γήπεδα')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl p-2">
                        <SelectItem value="all" className="font-black text-xs uppercase p-3 rounded-xl">{toGreekUpperCase('Όλα τα γήπεδα')}</SelectItem>
                        {pitches.map((pitch) => (
                          <SelectItem key={pitch.id} value={pitch.id} className="font-black text-xs uppercase p-3 rounded-xl">
                            {toGreekUpperCase(pitch.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="divide-y divide-zinc-50">
              {filteredBookings.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CalendarDays className="h-12 w-12 text-zinc-300" />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Δεν βρέθηκαν κρατήσεις')}</h3>
                  <p className="text-zinc-500 mt-3 font-medium text-lg">Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση σας.</p>
                  <Button 
                    variant="outline" 
                    className="mt-10 h-16 px-10 rounded-2xl border-zinc-200 font-black text-xs uppercase tracking-widest hover:bg-zinc-50"
                    onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterPitch('all'); }}
                  >
                    {toGreekUpperCase('Καθαρισμός Φίλτρων')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 p-10">
                  {filteredBookings.map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    const startDate = new Date(booking.startTime);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={booking.id} className="group p-10 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300 active:scale-[0.99]">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-10 flex-1">
                            {/* Date Block */}
                            <div className={cn(
                              "shrink-0 w-24 h-28 flex flex-col items-center justify-center rounded-[2rem] border-2 transition-all",
                              isToday 
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-2xl shadow-zinc-200 scale-110 z-10" 
                                : "bg-zinc-50 border-zinc-50 text-zinc-900 shadow-inner"
                            )}>
                              <p className={cn("text-[11px] font-black uppercase tracking-[0.2em]", isToday ? "text-emerald-400" : "text-zinc-400")}>
                                {toGreekUpperCase(startDate.toLocaleDateString('el-GR', { weekday: 'short' }))}
                              </p>
                              <p className="text-4xl font-black leading-none my-2">
                                {startDate.getDate()}
                              </p>
                              <p className={cn("text-[11px] font-black uppercase tracking-widest", isToday ? "text-emerald-400" : "text-zinc-500")}>
                                {toGreekUpperCase(startDate.toLocaleDateString('el-GR', { month: 'short' }))}
                              </p>
                            </div>

                            <div className="space-y-6 flex-1 min-w-0">
                              <div className="flex items-center gap-5 flex-wrap">
                                <h4 className="text-3xl font-black text-zinc-900 truncate uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                                  {toGreekUpperCase(booking.userName) || toGreekUpperCase('ΑΓΝΩΣΤΟΣ ΠΕΛΑΤΗΣ')}
                                </h4>
                                {getStatusBadge(booking.status)}
                                {booking.notes && (
                                    <div className="p-1.5 px-3 rounded-xl bg-orange-100 text-orange-700 font-black text-[10px] uppercase tracking-widest border border-orange-200 shadow-sm">
                                      {toGreekUpperCase('ΣΗΜΕΙΩΣΗ')}
                                    </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-zinc-500">
                                <span className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-50 font-black text-[14px] uppercase tracking-widest border border-zinc-100 shadow-inner group-hover:bg-white transition-colors">
                                  <Clock className="h-6 w-6 text-emerald-500/50" />
                                  {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {booking.userPhone && (
                                  <a href={`tel:${booking.userPhone}`} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-50 font-black text-[14px] uppercase tracking-widest border border-zinc-100 shadow-inner hover:bg-white hover:text-emerald-600 transition-all">
                                    <Phone className="h-6 w-6 text-emerald-500/50" />
                                    {booking.userPhone}
                                  </a>
                                )}
                                {pitch && (
                                  <span className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-50 font-black text-[14px] uppercase tracking-widest border border-zinc-100 shadow-inner group-hover:bg-white transition-colors">
                                    <Building2 className="h-6 w-6 text-emerald-500/50" />
                                    {toGreekUpperCase(pitch.name)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:justify-end gap-10 pt-8 lg:pt-0 border-t lg:border-none border-zinc-50">
                            <div className="text-left lg:text-right min-w-[120px]">
                              <p className="text-4xl font-black text-zinc-900 tracking-tighter">&euro;{booking.price?.toFixed(0) || '0'}</p>
                              {pitch && (
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                  &euro;{(booking.price / parseInt(pitch.type.split('x')[0] || '10')).toFixed(0)} / {toGreekUpperCase('ΑΤΟΜΟ')}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                               <Button variant="outline" size="icon" className="h-16 w-16 rounded-2xl border-zinc-100 bg-zinc-50 hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-90" asChild>
                                <Link href={`/management/bookings/${booking.id}`}>
                                  <Eye className="h-7 w-7" />
                                </Link>
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="h-16 px-8 rounded-2xl border-zinc-100 font-black gap-4 text-[13px] bg-white shadow-sm hover:shadow-md transition-all active:scale-95 uppercase tracking-widest">
                                    {toGreekUpperCase('Κατάσταση')}
                                    <ChevronDown className="h-5 w-5 text-zinc-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 p-3 rounded-[2rem] shadow-2xl border-zinc-100 text-zinc-700 animate-in zoom-in-95 duration-200">
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'confirmed' })} className="rounded-xl px-4 py-4 font-black text-[13px] uppercase tracking-widest cursor-pointer transition-colors hover:bg-emerald-50 text-emerald-700">
                                    <div className="h-4 w-4 rounded-full bg-emerald-500 mr-4 shadow-sm" />
                                    {toGreekUpperCase('Επιβεβαίωση')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'completed' })} className="rounded-xl px-4 py-4 font-black text-[13px] uppercase tracking-widest cursor-pointer transition-colors hover:bg-zinc-50 text-zinc-600">
                                    <div className="h-4 w-4 rounded-full bg-zinc-400 mr-4 shadow-sm" />
                                    {toGreekUpperCase('Ολοκλήρωση')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'cancelled' })} className="rounded-xl px-4 py-4 font-black text-[13px] uppercase tracking-widest cursor-pointer transition-colors hover:bg-red-50 text-red-600">
                                    <div className="h-4 w-4 rounded-full bg-red-500 mr-4 shadow-sm" />
                                    {toGreekUpperCase('Ακύρωση')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <AlertDialog open={deleteConfirm === booking.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-16 w-16 rounded-2xl text-zinc-200 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
                                    onClick={() => setDeleteConfirm(booking.id)}
                                    disabled={deletingBookingId === booking.id}
                                  >
                                    {deletingBookingId === booking.id ? (
                                      <Loader2 className="h-7 w-7 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-7 w-7" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[3rem] p-12 max-w-md border-zinc-100 shadow-2xl overflow-hidden">
                                     <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                                     <div className="h-24 w-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                      <Trash2 className="h-12 w-12 text-red-500" />
                                    </div>
                                    <AlertDialogHeader className="text-center">
                                      <AlertDialogTitle className="text-3xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Διαγραφή Κράτησης;')}</AlertDialogTitle>
                                      <AlertDialogDescription className="text-xl font-medium text-zinc-500 mt-4 leading-relaxed">
                                        Είστε σίγουροι ότι θέλετε να διαγράψετε την κράτηση του &quot;<span className="font-black text-zinc-900">{toGreekUpperCase(booking.userName)}</span>&quot;;
                                        <br /><span className="text-red-500 text-sm font-black mt-2 inline-block">AYTH Η ΕΝΕΡΓΕΙΑ ΕΙΝΑΙ ΟΡΙΣΤΙΚΗ</span>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-12 flex flex-col sm:flex-row gap-4">
                                      <Button variant="ghost" className="h-16 px-8 rounded-2xl font-black text-zinc-400 flex-1 text-xs uppercase tracking-widest" onClick={() => setDeleteConfirm(null)}>
                                        {toGreekUpperCase('Ακύρωση')}
                                      </Button>
                                      <Button className="h-16 px-8 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white flex-1 text-xs uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all" onClick={() => handleDeleteBooking(booking.id)}>
                                        {toGreekUpperCase('Διαγραφή')}
                                      </Button>
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
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Dialog */}
      <AlertDialog open={!!statusConfirm} onOpenChange={(open: boolean) => !open && setStatusConfirm(null)}>
        <AlertDialogContent className="rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden max-w-md">
          <div className="p-12">
            <div className="h-20 w-20 bg-emerald-50 rounded-[1.75rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <RefreshCw className="h-10 w-10 text-emerald-600" />
            </div>
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-3xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Αλλαγή Κατάστασης;')}</AlertDialogTitle>
              <AlertDialogDescription className="text-xl font-medium text-zinc-500 mt-4 leading-relaxed">
                Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση της κράτησης σε <span className="font-black text-emerald-600 block mt-2 text-2xl">
                  {toGreekUpperCase(statusConfirm?.status === 'confirmed' ? 'Επιβεβαιωμένη' : 
                   statusConfirm?.status === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη')}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-12 flex flex-col sm:flex-row gap-4">
              <Button variant="ghost" className="h-16 rounded-2xl font-black text-zinc-400 flex-1 text-xs uppercase tracking-widest" onClick={() => setStatusConfirm(null)}>
                {toGreekUpperCase('Ακύρωση')}
              </Button>
              <Button className="h-16 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white flex-1 text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all" onClick={() => statusConfirm && handleUpdateBookingStatus(statusConfirm.id, statusConfirm.status)}>
                {toGreekUpperCase('Επιβεβαίωση')}
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
