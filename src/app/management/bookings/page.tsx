'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  CalendarIcon,
  ArrowLeftIcon,
  UserIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService, blockedDateService } from '@/lib/firebase-services';
import { Booking, Pitch, BlockedDate } from '@/types';
import WeeklyCalendar from '@/components/WeeklyCalendar';

export default function BookingsPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    loadBookings();
  }, [user, venueOwner, authLoading, router]);

  const loadBookings = async () => {
    if (!venueOwner) return;
    
    try {
      const [bookingsData, pitchesData, blockedDatesData] = await Promise.all([
        bookingService.getByVenue(venueOwner.venueId),
        pitchService.getByVenue(venueOwner.venueId),
        blockedDateService.getByVenue(venueOwner.venueId)
      ]);
      setBookings(bookingsData || []);
      setPitches(pitchesData || []);
      setBlockedDates(blockedDatesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter bookings based on search term
  const filteredBookings = bookings.filter(booking => 
    booking.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Κρατήσεις</h1>
          <p className="mt-1 sm:mt-2 text-gray-600">Διαχείριση κρατήσεων για το γήπεδό σας</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:space-x-4">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-football-green text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CalendarIcon className="h-4 w-4 inline mr-2" />
              Ημερολόγιο
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-football-green text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserIcon className="h-4 w-4 inline mr-2" />
              Λίστα
            </button>
          </div>
          <Link
            href="/management/bookings/new"
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Νέα Κράτηση
          </Link>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <WeeklyCalendar 
          bookings={bookings}
          pitches={pitches}
          blockedDates={blockedDates}
          onBookingClick={(booking) => router.push(`/bookings/${booking.id}`)}
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
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Αναζήτηση κρατήσεων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-football-green focus:border-football-green sm:text-sm"
              />
            </div>
          </div>

          {/* Bookings List */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-100">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Δεν βρέθηκαν κρατήσεις.' : 'Δεν υπάρχουν κρατήσεις ακόμα'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε δημιουργώντας την πρώτη σας κράτηση.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <div className="flex space-x-3">
                                  <Link
                  href="/management/bookings/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Δημιουργία Κράτησης
                </Link>
                  <Link
                    href="/management/bookings/new?recurring=true"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
                  >
                    <span className="mr-2">🔄</span>
                    Επαναλαμβανόμενη Κράτηση
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredBookings.map((booking) => {
              const pitch = pitches.find(p => p.id === booking.pitchId);
              return (
                <li key={booking.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {booking.userName || 'Άγνωστος Πελάτης'}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status === 'confirmed' ? 'Επιβεβαιωμένη' :
                             booking.status === 'pending' ? 'Εκκρεμεί' :
                             booking.status === 'completed' ? 'Ολοκληρωμένη' :
                             booking.status === 'cancelled' ? 'Ακυρωμένη' :
                             'Επιβεβαιωμένη'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          📧
                          {booking.userEmail || 'Δεν υπάρχει email'}
                        </div>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-1">⚽</span>
                            <span className="text-sm font-medium text-gray-900">
                              {pitch?.name || 'Άγνωστο Γήπεδο'}
                            </span>
                            {pitch && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-football-green/10 text-football-green border border-football-green/20">
                                {pitch.type}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-lg font-bold text-gray-900">
                            €{booking.price?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {booking.notes ? `${booking.notes.substring(0, 50)}...` : 'Δεν υπάρχουν σημειώσεις'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {new Date(booking.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-base sm:text-lg font-semibold text-blue-600">
                        {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">
                        {new Date(booking.endTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/management/bookings/${booking.id}`}
                    className="min-h-[44px] inline-flex items-center text-sm text-football-green hover:text-football-green-light"
                  >
                    Προβολή Λεπτομερειών
                  </Link>
                  <Link
                    href={`/management/bookings/${booking.id}/edit`}
                    className="min-h-[44px] inline-flex items-center text-sm text-football-green hover:text-football-green-light"
                  >
                    Επεξεργασία
                  </Link>
                  {booking.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                      disabled={updatingBookingId === booking.id}
                      className="min-h-[44px] text-sm text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <span className="mr-1">✅</span>
                      {updatingBookingId === booking.id ? 'Ενημέρωση...' : 'Ολοκλήρωση'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteBooking(booking.id)}
                    disabled={deletingBookingId === booking.id}
                    className="min-h-[44px] text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    {deletingBookingId === booking.id ? 'Διαγραφή...' : 'Διαγραφή'}
                  </button>
                </div>
              </li>
            );
          })}
          </ul>
        )}
      </div>
        </>
      )}
    </div>
  );
}
