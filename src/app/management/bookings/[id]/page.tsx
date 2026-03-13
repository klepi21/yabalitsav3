'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService } from '@/lib/firebase-services';
import { Booking, Pitch } from '@/types';

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const getPlayersPerPitch = (pitchType: string) => {
    switch (pitchType) {
      case '5x5': return 10; // 5v5 = 10 players
      case '6x6': return 12; // 6v6 = 12 players
      case '7x7': return 14; // 7v7 = 14 players
      case '8x8': return 16; // 8v8 = 16 players
      case '9x9': return 18; // 9v9 = 18 players
      default: return 10;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (params.id) {
      loadBookingData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id]);

  const loadBookingData = async (bookingId: string) => {
    try {
      const bookingData = await bookingService.getById(bookingId);
      if (bookingData) {
        setBooking(bookingData);
        
        // Load pitch data if available
        if (bookingData.pitchId) {
          const pitchData = await pitchService.getById(bookingData.pitchId);
          setPitch(pitchData);
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    if (!booking) return;
    
    setIsUpdating(true);
    try {
      await bookingService.update(booking.id, { status: newStatus });
      
      // Reload booking data
      await loadBookingData(booking.id);
      
      // Redirect to bookings page to refresh data
      router.push('/management/bookings');
    } catch (error) {
      console.error('Error updating booking status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Η κράτηση δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-gray-500">Η κράτηση που αναζητάτε δεν υπάρχει.</p>
        <Link
          href="/management/bookings"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Επιστροφή στις Κρατήσεις
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
                  <Link
          href="/management/bookings"
          className="inline-flex items-center text-sm text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-1" />
          Επιστροφή στις Κρατήσεις
        </Link>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/management/bookings/${booking.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
          >
            Επεξεργασία Κράτησης
          </Link>
          
          {booking.status === 'pending' && (
            <button
              onClick={() => handleUpdateStatus('confirmed')}
              disabled={isUpdating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Ενημέρωση...' : '✅ Επιβεβαίωση'}
            </button>
          )}
          
          {booking.status !== 'completed' && (
            <button
              onClick={() => handleUpdateStatus('completed')}
              disabled={isUpdating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Ενημέρωση...' : '🏁 Ολοκλήρωση'}
            </button>
          )}
          
          {booking.status !== 'cancelled' && (
            <button
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={isUpdating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Ενημέρωση...' : '❌ Ακύρωση'}
            </button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Λεπτομέρειες Κράτησης</h1>
        <p className="mt-2 text-gray-600">Προβολή ολοκληρωμένων πληροφοριών για αυτή την κράτηση</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Πληροφορίες Πελάτη</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Όνομα</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.userName || 'Άγνωστος Πελάτης'}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.userEmail || 'Δεν παρέχεται email'}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Τηλέφωνο</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.userPhone || 'Δεν παρέχεται τηλέφωνο'}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <CalendarIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Πληροφορίες Κράτησης</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Ημερομηνία</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {new Date(booking.startTime).toLocaleDateString('el-GR')}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Ώρα</dt>
                <dd className="mt-1 text-lg font-semibold text-blue-600">
                  {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})} - {new Date(booking.endTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Κατάσταση</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Συνολική Τιμή</dt>
                <dd className="mt-1">
                  <div className="text-2xl font-bold text-gray-900">
                    €{booking.price?.toFixed(2) || '0.00'}
                  </div>
                  {pitch && (
                    <div className="text-sm text-gray-500 mt-1">
                      (€{((booking.price || 0) / getPlayersPerPitch(pitch.type)).toFixed(0)}/άτομο)
                    </div>
                  )}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Pitch Information */}
        {pitch && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <MapPinIcon className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Πληροφορίες Γηπέδου</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Όνομα Γηπέδου</dt>
                  <dd className="mt-1 text-sm text-gray-900">{pitch.name}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Τύπος</dt>
                  <dd className="mt-1 text-sm text-gray-900">{pitch.type}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Τιμή ανά Κράτηση</dt>
                  <dd className="mt-1 text-sm text-gray-900">€{pitch.pricePerSlot?.toFixed(2) || '0.00'}</dd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Σημειώσεις</h3>
            <div className="text-sm text-gray-900">
              {booking.notes || 'Δεν υπάρχουν σημειώσεις για αυτή την κράτηση.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
