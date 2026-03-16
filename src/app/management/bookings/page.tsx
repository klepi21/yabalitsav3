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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Κρατήσεις</h1>
          <p className="text-sm text-zinc-500 mt-1">Διαχείριση κρατήσεων για το γήπεδό σας</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === 'calendar'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Ημερολόγιο
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === 'list'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Λίστα
            </button>
          </div>
          <Button asChild>
            <Link href="/management/bookings/new">
              <Plus className="h-4 w-4" />
              Νέα Κράτηση
            </Link>
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <WeeklyCalendar
          bookings={bookings}
          pitches={pitches}
          blockedDates={blockedDates}
          onBookingClick={(booking) => router.push(`/management/bookings/${booking.id}`)}
          onSlotClick={(date, time) => {
            router.push(`/management/bookings/new?date=${date}&time=${time}`);
          }}
          onDeleteBooking={handleDeleteBooking}
          deletingBookingId={deletingBookingId}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          updatingBookingId={updatingBookingId}
        />
      ) : (
        <>
          {/* Stats + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-900">{bookings.length}</p>
                  <p className="text-[11px] text-zinc-400">Σύνολο</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-900">{pendingCount}</p>
                  <p className="text-[11px] text-zinc-400">Εκκρεμείς</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-900">{confirmedCount}</p>
                  <p className="text-[11px] text-zinc-400">Επιβεβαιωμένες</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Flag className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-900">{todayCount}</p>
                  <p className="text-[11px] text-zinc-400">Σήμερα</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-900">{cancelledCount}</p>
                  <p className="text-[11px] text-zinc-400">Ακυρωμένες</p>
                </div>
              </div>
            </div>

            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Αναζήτηση κρατήσεων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-[13px] text-zinc-500">
              <Filter className="h-3.5 w-3.5" />
              Φίλτρα:
            </div>

            {/* Status filter */}
            <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
              {[
                { value: 'all', label: 'Όλες' },
                { value: 'pending', label: 'Εκκρεμείς' },
                { value: 'confirmed', label: 'Επιβεβαιωμένες' },
                { value: 'completed', label: 'Ολοκληρωμένες' },
                { value: 'cancelled', label: 'Ακυρωμένες' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150 ${
                    filterStatus === opt.value
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pitch filter */}
            {pitches.length > 1 && (
              <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
                <button
                  onClick={() => setFilterPitch('all')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150 ${
                    filterPitch === 'all'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Όλα τα γήπεδα
                </button>
                {pitches.map((pitch) => (
                  <button
                    key={pitch.id}
                    onClick={() => setFilterPitch(pitch.id)}
                    className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150 ${
                      filterPitch === pitch.id
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {pitch.name}
                  </button>
                ))}
              </div>
            )}

            {/* Clear filters */}
            {(filterStatus !== 'all' || filterPitch !== 'all') && (
              <button
                onClick={() => { setFilterStatus('all'); setFilterPitch('all'); }}
                className="flex items-center gap-1 text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="h-3 w-3" />
                Καθαρισμός
              </button>
            )}
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
                  <CalendarDays className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-sm font-medium text-zinc-900 mb-1">
                  {searchTerm ? 'Δεν βρέθηκαν κρατήσεις' : 'Δεν υπάρχουν κρατήσεις ακόμα'}
                </h3>
                <p className="text-[13px] text-zinc-400 mb-5">
                  {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε δημιουργώντας την πρώτη σας κράτηση.'}
                </p>
                {!searchTerm && (
                  <div className="flex justify-center gap-3">
                    <Button size="sm" asChild>
                      <Link href="/management/bookings/new">
                        <Plus className="h-4 w-4" />
                        Δημιουργία Κράτησης
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900" asChild>
                      <Link href="/management/bookings/new?recurring=true">
                        <RefreshCw className="h-4 w-4" />
                        Επαναλαμβανόμενη
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => {
                const pitch = pitches.find(p => p.id === booking.pitchId);
                const startDate = new Date(booking.startTime);
                const endDate = new Date(booking.endTime);
                const isToday = startDate.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={booking.id}
                    className="group rounded-xl border border-zinc-100/60 bg-white p-5 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Date block */}
                        <div className={`shrink-0 w-14 text-center rounded-xl p-2 ${isToday ? 'bg-emerald-50 border border-emerald-200/60' : 'bg-zinc-50 border border-zinc-100'}`}>
                          <p className={`text-[11px] font-medium uppercase ${isToday ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            {startDate.toLocaleDateString('el-GR', { weekday: 'short' })}
                          </p>
                          <p className={`text-xl font-bold ${isToday ? 'text-emerald-700' : 'text-zinc-900'}`}>
                            {startDate.getDate()}
                          </p>
                          <p className={`text-[10px] ${isToday ? 'text-emerald-500' : 'text-zinc-400'}`}>
                            {startDate.toLocaleDateString('el-GR', { month: 'short' })}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[15px] font-semibold text-zinc-900">
                              {booking.userName || 'Άγνωστος Πελάτης'}
                            </h4>
                            {getStatusBadge(booking.status)}
                            {isToday && (
                              <Badge variant="outline" className="text-[11px] border-emerald-200/60 text-emerald-600 bg-emerald-50">
                                Σήμερα
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                              <Clock className="h-3.5 w-3.5" />
                              {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {endDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                              <Phone className="h-3.5 w-3.5" />
                              {booking.userPhone || '—'}
                            </span>
                            {pitch && (
                              <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                                <Building2 className="h-3.5 w-3.5" />
                                {pitch.name}
                                <Badge variant="outline" className="text-[10px] border-zinc-200/60 text-zinc-400 ml-0.5">
                                  {pitch.type}
                                </Badge>
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
                              <Euro className="h-3.5 w-3.5 text-zinc-400" />
                              {booking.price?.toFixed(2) || '0.00'}
                            </span>
                          </div>

                          {booking.notes && (
                            <p className="mt-1.5 text-[12px] text-zinc-400 truncate max-w-md">
                              {booking.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-zinc-100/60 flex flex-wrap items-center gap-2">
                      <Button size="sm" className="h-8 text-xs" asChild>
                        <Link href={`/management/bookings/${booking.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Προβολή
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900" asChild>
                        <Link href={`/management/bookings/${booking.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Επεξεργασία
                        </Link>
                      </Button>
                      {booking.status === 'pending' && (
                        <AlertDialog open={statusConfirm?.id === booking.id && statusConfirm?.status === 'confirmed'} onOpenChange={(open) => !open && setStatusConfirm(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                              onClick={() => setStatusConfirm({ id: booking.id, status: 'confirmed' })}
                              disabled={updatingBookingId === booking.id}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {updatingBookingId === booking.id ? 'Ενημέρωση...' : 'Επιβεβαίωση'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Επιβεβαίωση κράτησης</AlertDialogTitle>
                              <AlertDialogDescription>
                                Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση σε &quot;επιβεβαιωμένη&quot;;
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}>
                                Επιβεβαίωση
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                        <AlertDialog open={statusConfirm?.id === booking.id && statusConfirm?.status === 'completed'} onOpenChange={(open) => !open && setStatusConfirm(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                              onClick={() => setStatusConfirm({ id: booking.id, status: 'completed' })}
                              disabled={updatingBookingId === booking.id}
                            >
                              <Flag className="h-3.5 w-3.5" />
                              {updatingBookingId === booking.id ? 'Ενημέρωση...' : 'Ολοκλήρωση'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ολοκλήρωση κράτησης</AlertDialogTitle>
                              <AlertDialogDescription>
                                Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση σε &quot;ολοκληρωμένη&quot;;
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}>
                                Ολοκλήρωση
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog open={deleteConfirm === booking.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-xs border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300 ml-auto"
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
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Διαγραφή κράτησης</AlertDialogTitle>
                            <AlertDialogDescription>
                              Είστε σίγουροι ότι θέλετε να διαγράψετε την κράτηση του &quot;{booking.userName}&quot;; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => handleDeleteBooking(booking.id)}>
                              Διαγραφή
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
