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
  Pencil
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/lib/firebase-services';
import { Booking, Pitch, BlockedDate } from '@/types';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!venueOwner || !user) return;

    try {
      setError(null);
      // Get auth token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Use server-side API to fetch data with proper auth
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

      // Convert ISO strings back to Date objects
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
      // Set empty state on error instead of hiding the error
      setBookings([]);
      setPitches([]);
      setBlockedDates([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner, user]);

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadBookings();
  }, [user, venueOwner, authLoading, router, loadBookings, pathname]);

  // Filter and sort bookings - pending first, then by date
  const filteredBookings = bookings
    .filter(booking =>
      booking.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.userPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // First priority: pending status
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;

      // Second priority: confirmed status
      if (a.status === 'confirmed' && b.status !== 'confirmed' && b.status !== 'pending') return -1;
      if (a.status !== 'confirmed' && a.status !== 'pending' && b.status === 'confirmed') return 1;

      // Third priority: by start time (newest first)
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      return dateB.getTime() - dateA.getTime();
    });

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την κράτηση;')) {
      return;
    }

    setDeletingBookingId(bookingId);
    try {
      await bookingService.delete(bookingId);
      setBookings(bookings.filter(booking => booking.id !== bookingId));
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Αποτυχία διαγραφής κράτησης');
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    const statusText = {
      'pending': 'εκκρεμεί',
      'confirmed': 'επιβεβαιωμένη',
      'completed': 'ολοκληρωμένη',
      'cancelled': 'ακυρωμένη'
    };

    if (!confirm(`Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση σε "${statusText[newStatus]}";`)) {
      return;
    }

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
      alert('Αποτυχία ενημέρωσης κατάστασης κράτησης');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'Επιβεβαιωμένη', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
      pending: { label: 'Εκκρεμεί', className: 'border-amber-300 text-amber-700 bg-amber-50' },
      completed: { label: 'Ολοκληρωμένη', className: 'border-slate-300 text-slate-700 bg-slate-50' },
      cancelled: { label: 'Ακυρωμένη', className: 'border-red-300 text-red-700 bg-red-50' },
    };
    const { label, className } = config[status] || config.confirmed;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-destructive">
                Σφάλμα κατά τη φόρτωση κρατήσεων
              </h3>
              <div className="mt-2 text-sm text-destructive/80">
                <p>{error}</p>
                <p className="mt-2 text-xs">
                  Αν το πρόβλημα συνεχίζεται, δοκιμάστε να ανανεώσετε τη σελίδα ή να συνδεθείτε ξανά.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadBookings();
              }}
              className="ml-4 inline-flex text-destructive/60 hover:text-destructive"
            >
              <span className="text-sm font-medium">Δοκιμάστε ξανά</span>
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Πίνακας Ελέγχου</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Κρατήσεις</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Κρατήσεις</h2>
          <p className="mt-1 text-muted-foreground">Διαχείριση κρατήσεων για το γήπεδό σας</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="h-4 w-4" />
              Ημερολόγιο
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <Users className="h-4 w-4" />
              Λίστα
            </Button>
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
            // Navigate to new booking page with pre-filled date and time
            router.push(`/management/bookings/new?date=${date}&time=${time}`);
          }}
          onDeleteBooking={handleDeleteBooking}
          deletingBookingId={deletingBookingId}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          updatingBookingId={updatingBookingId}
        />
      ) : (
        <>
          {/* Search */}
          <div className="max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Αναζήτηση κρατήσεων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Bookings List */}
          <Card>
            <CardContent className="p-0">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-sm font-medium text-foreground">
                    {searchTerm ? 'Δεν βρέθηκαν κρατήσεις.' : 'Δεν υπάρχουν κρατήσεις ακόμα'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε δημιουργώντας την πρώτη σας κράτηση.'}
                  </p>
                  {!searchTerm && (
                    <div className="mt-6 flex justify-center gap-3">
                      <Button asChild>
                        <Link href="/management/bookings/new">
                          <Plus className="h-4 w-4" />
                          Δημιουργία Κράτησης
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/management/bookings/new?recurring=true">
                          <RefreshCw className="h-4 w-4" />
                          Επαναλαμβανόμενη Κράτηση
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredBookings.map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    return (
                      <li key={booking.id} className="px-4 py-4 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {booking.userName || 'Άγνωστος Πελάτης'}
                                </p>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {booking.userPhone || 'Δεν υπάρχει τηλέφωνο'}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">
                                  {pitch?.name || 'Άγνωστο Γήπεδο'}
                                </span>
                                {pitch && (
                                  <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                                    {pitch.type}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2">
                                <p className="text-lg font-bold text-foreground">
                                  {'\u20AC'}{booking.price?.toFixed(2) || '0.00'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {booking.notes ? `${booking.notes.substring(0, 50)}...` : 'Δεν υπάρχουν σημειώσεις'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-xl sm:text-2xl font-bold text-foreground">
                              {new Date(booking.startTime).toLocaleDateString()}
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-primary">
                              {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/management/bookings/${booking.id}`}>
                              <Eye className="h-4 w-4" />
                              Προβολή
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/management/bookings/${booking.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                              Επεξεργασία
                            </Link>
                          </Button>
                          {booking.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                              disabled={updatingBookingId === booking.id}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {updatingBookingId === booking.id ? 'Ενημέρωση...' : 'Επιβεβαίωση'}
                            </Button>
                          )}
                          {booking.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                              disabled={updatingBookingId === booking.id}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <Flag className="h-4 w-4" />
                              {updatingBookingId === booking.id ? 'Ενημέρωση...' : 'Ολοκλήρωση'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBooking(booking.id)}
                            disabled={deletingBookingId === booking.id}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingBookingId === booking.id ? 'Διαγραφή...' : 'Διαγραφή'}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
