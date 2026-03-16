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
      confirmed: { label: 'Επιβεβαιωμένη', className: 'border-emerald-200/60 text-emerald-700 bg-emerald-50' },
      pending: { label: 'Εκκρεμεί', className: 'border-amber-200/60 text-amber-700 bg-amber-50' },
      completed: { label: 'Ολοκληρωμένη', className: 'border-zinc-200/60 text-zinc-600 bg-zinc-50' },
      cancelled: { label: 'Ακυρωμένη', className: 'border-red-200/60 text-red-700 bg-red-50' },
    };
    const { label, className } = config[status] || config.confirmed;
    return <Badge variant="outline" className={`text-[11px] ${className}`}>{label}</Badge>;
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-200">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">{toGreekUpperCase('Κρατήσεις')}</h1>
          </div>
          <p className="text-[16px] font-medium text-zinc-500">Διαχείριση και προγραμματισμός των κρατήσεων σας.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                viewMode === 'calendar'
                  ? "bg-white text-emerald-600 shadow-sm border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Ημερολόγιο
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                viewMode === 'list'
                  ? "bg-white text-emerald-600 shadow-sm border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Users className="h-4 w-4" />
              Λίστα
            </button>
          </div>
          <Button className="h-12 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" asChild>
            <Link href="/management/bookings/new">
              <Plus className="h-5 w-5 mr-2" />
              Νέα Κράτηση
            </Link>
          </Button>
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
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="premium-card p-6 flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-3">
                <CalendarDays className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-2xl font-black text-zinc-900">{bookings.length}</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Σύνολο</p>
            </div>
            
            <div className="premium-card p-6 flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-zinc-900">{pendingCount}</p>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-1">Εκκρεμείς</p>
            </div>

            <div className="premium-card p-6 flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-zinc-900">{confirmedCount}</p>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1">Επιβεβαιωμένες</p>
            </div>

            <div className="premium-card p-6 flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                <Flag className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-zinc-900">{todayCount}</p>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">Σήμερα</p>
            </div>

            <div className="premium-card p-6 flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-black text-zinc-900">{cancelledCount}</p>
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">Ακυρωμένες</p>
            </div>
          </div>

          <Card className="premium-card overflow-hidden border-0">
            <CardHeader className="p-8 pb-4 bg-zinc-50/50 border-b border-zinc-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Αναζήτηση με όνομα ή τηλέφωνο..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-xl border-zinc-200 focus:ring-emerald-500"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white p-1 rounded-xl border border-zinc-200 flex items-center">
                    {[
                      { value: 'all', label: 'Όλες' },
                      { value: 'pending', label: 'Εκκρεμείς' },
                      { value: 'confirmed', label: 'Επιβεβαιωμένες' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterStatus(opt.value)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                          filterStatus === opt.value
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-600'
                        )}
                      >
                        {toGreekUpperCase(opt.label)}
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
                <div className="p-20 text-center">
                  <div className="h-20 w-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CalendarDays className="h-10 w-10 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Δεν βρέθηκαν κρατήσεις</h3>
                  <p className="text-zinc-500 mt-2">Δοκιμάστε να αλλάξετε τα φίλτρα ή την αναζήτηση σας.</p>
                  <Button 
                    variant="outline" 
                    className="mt-8 h-12 px-8 rounded-xl font-bold"
                    onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterPitch('all'); }}
                  >
                    Καθαρισμός Φίλτρων
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredBookings.map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    const startDate = new Date(booking.startTime);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={booking.id} className="group p-8 hover:bg-zinc-50 transition-all duration-200">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                          <div className="flex items-center gap-6 flex-1">
                            {/* Date Block */}
                            <div className={cn(
                              "shrink-0 w-16 h-20 flex flex-col items-center justify-center rounded-2xl border transition-all",
                              isToday 
                                ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-100 scale-110 z-10" 
                                : "bg-white border-zinc-100 text-zinc-900"
                            )}>
                              <p className={cn("text-[10px] font-black uppercase tracking-tighter", isToday ? "text-emerald-100" : "text-zinc-500")}>
                                {startDate.toLocaleDateString('el-GR', { weekday: 'short' })}
                              </p>
                              <p className="text-2xl font-black leading-none my-1">
                                {startDate.getDate()}
                              </p>
                              <p className={cn("text-[10px] font-bold", isToday ? "text-emerald-100" : "text-zinc-500")}>
                                {startDate.toLocaleDateString('el-GR', { month: 'short' })}
                              </p>
                            </div>

                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="text-[18px] font-bold text-zinc-900 truncate flex items-center gap-2">
                                  {booking.userName || 'Άγνωστος Πελάτης'}
                                  {booking.notes && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-100">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="rounded-xl border-zinc-200 shadow-xl p-4 max-w-xs">
                                          <p className="text-xs font-bold text-zinc-900 mb-1">Σημειώσεις</p>
                                          <p className="text-xs text-zinc-600 leading-relaxed font-medium">{booking.notes}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </h4>
                                {getStatusBadge(booking.status)}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-zinc-500 font-medium">
                                <span className="flex items-center gap-2 bg-zinc-100 px-2.5 py-1 rounded-lg text-zinc-700">
                                  <Clock className="h-4 w-4" />
                                  {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {booking.userPhone && (
                                  <span className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-emerald-600" />
                                    {booking.userPhone}
                                  </span>
                                )}
                                {pitch && (
                                  <span className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-zinc-400" />
                                    {pitch.name}
                                    <Badge variant="outline" className="text-[10px] font-black h-5 border-zinc-200">
                                      {pitch.type}
                                    </Badge>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:justify-end gap-10">
                            <div className="text-right">
                              <p className="text-2xl font-black text-zinc-900">&euro;{booking.price?.toFixed(2) || '0.00'}</p>
                              {pitch && (
                                <p className="text-xs font-bold text-zinc-400">
                                  &euro;{(booking.price / parseInt(pitch.type.split('x')[0] || '10')).toFixed(0)} / άτομο
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                               <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-zinc-200 hover:bg-zinc-50 transition-all" asChild>
                                <Link href={`/management/bookings/${booking.id}`}>
                                  <Eye className="h-5 w-5" />
                                </Link>
                              </Button>
                              
                              <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-zinc-200 hover:bg-zinc-50 transition-all" asChild>
                                <Link href={`/management/bookings/${booking.id}/edit`}>
                                  <Pencil className="h-5 w-5" />
                                </Link>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="h-12 px-4 rounded-xl border-zinc-200 font-bold gap-2">
                                    Κατάσταση
                                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-0">
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'confirmed' })} className="rounded-xl px-4 py-3 font-bold cursor-pointer transition-colors hover:bg-emerald-50 text-zinc-700">
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-3" />
                                    Επιβεβαίωση
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'completed' })} className="rounded-xl px-4 py-3 font-bold cursor-pointer transition-colors hover:bg-zinc-100 text-zinc-700">
                                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-400 mr-3" />
                                    Ολοκλήρωση
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusConfirm({ id: booking.id, status: 'cancelled' })} className="rounded-xl px-4 py-3 font-bold cursor-pointer transition-colors hover:bg-red-50 text-red-600">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 mr-3" />
                                    Ακύρωση
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <AlertDialog open={deleteConfirm === booking.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                    onClick={() => setDeleteConfirm(booking.id)}
                                    disabled={deletingBookingId === booking.id}
                                  >
                                    {deletingBookingId === booking.id ? (
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-5 w-5" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-w-md">
                                  <div className="p-8 pt-10">
                                    <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                      <Trash2 className="h-8 w-8 text-red-500" />
                                    </div>
                                    <AlertDialogHeader className="text-center">
                                      <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή Κράτησης;</AlertDialogTitle>
                                      <AlertDialogDescription className="text-[16px] font-medium text-zinc-500 mt-2">
                                        Είστε σίγουροι ότι θέλετε να διαγράψετε την κράτηση του &quot;<span className="font-bold text-zinc-900">{booking.userName}</span>&quot;;
                                        <br />Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="p-8 pt-4 flex flex-col sm:flex-row gap-3">
                                      <Button variant="ghost" className="h-12 rounded-xl font-bold text-zinc-500 flex-1" onClick={() => setDeleteConfirm(null)}>Ακύρωση</Button>
                                      <Button className="h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white flex-1" onClick={() => handleDeleteBooking(booking.id)}>Διαγραφή</Button>
                                    </AlertDialogFooter>
                                  </div>
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
