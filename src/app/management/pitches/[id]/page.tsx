'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService, bookingService, blockedDateService } from '@/lib/firebase-services';
import { Pitch, Booking, BlockedDate } from '@/types';

export default function PitchDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (params.id) {
      loadPitchData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id]);

  const loadPitchData = async (pitchId: string) => {
    try {
      const pitchData = await pitchService.getById(pitchId);
      if (pitchData) {
        setPitch(pitchData);
        
        // Load bookings and blocked dates for this pitch
        const [bookingsData, blockedDatesData] = await Promise.all([
          bookingService.getByPitch(pitchId),
          blockedDateService.getByPitch(pitchId)
        ]);
        setBookings(bookingsData || []);
        setBlockedDates(blockedDatesData || []);
      }
    } catch (error) {
      console.error('Error loading pitch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Το γήπεδο δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-gray-500">Το γήπεδο που αναζητάτε δεν υπάρχει.</p>
        <Link
          href="/management/pitches"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Επιστροφή στα Γήπεδα
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
          href="/management/pitches"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στα Γήπεδα
        </Link>
        </div>
        <Link
          href={`/management/pitches/${pitch.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Επεξεργασία Γηπέδου
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">{pitch.name}</h1>
        <p className="mt-2 text-gray-600">Λεπτομέρειες και πληροφορίες γηπέδου</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <MapPinIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Πληροφορίες Γηπέδου</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Όνομα</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{pitch.name}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Τύπος</dt>
                <dd className="mt-1 text-sm text-gray-900">{pitch.type}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Τιμή ανά Κράτηση</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">
                  €{pitch.pricePerSlot?.toFixed(2) || '0.00'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Διάρκεια Κράτησης</dt>
                <dd className="mt-1 text-sm text-gray-900">{pitch.slotDuration} λεπτά</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <ClockIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Ώρες Λειτουργίας</h3>
            </div>
            
            <div className="space-y-2">
              {pitch.defaultOpeningHours && (() => {
                const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const dayNames = {
                  'monday': 'Δευτέρα',
                  'tuesday': 'Τρίτη',
                  'wednesday': 'Τετάρτη',
                  'thursday': 'Πέμπτη',
                  'friday': 'Παρασκευή',
                  'saturday': 'Σάββατο',
                  'sunday': 'Κυριακή'
                };
                
                return dayOrder.map(day => {
                  const hours = pitch.defaultOpeningHours[day];
                  if (!hours) return null;
                  
                  return (
                    <div key={day} className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                    {dayNames[day as keyof typeof dayNames] || day}
                  </span>
                      <span className="text-sm text-gray-900">
                        {hours.isOpen 
                          ? hours.slots?.length > 0 
                            ? hours.slots.map((slot, idx) => (
                                <span key={idx}>
                                  {idx > 0 && ', '}
                                  {slot.start} - {slot.end}
                                </span>
                              ))
                            : 'Δεν έχουν οριστεί ώρες'
                          : 'Κλειστό'
                        }
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Blocked Dates */}
        {blockedDates.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🚫</span>
                <h3 className="text-lg font-medium text-gray-900">Κλειστές Ημερομηνίες</h3>
              </div>
              
              <div className="space-y-3">
                {blockedDates.map((blockedDate) => (
                  <div key={blockedDate.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 text-sm">
                          <span className="font-medium text-gray-900">
                            {new Date(blockedDate.startDate).toLocaleDateString('el-GR')}
                            {blockedDate.startDate !== blockedDate.endDate && 
                              ` - ${new Date(blockedDate.endDate).toLocaleDateString('el-GR')}`
                            }
                          </span>
                          <span className="text-red-600 font-medium text-xs">
                            {blockedDate.isFullDay ? 'Όλη η ημέρα' : 'Συγκεκριμένες ώρες'}
                          </span>
                        </div>
                        {blockedDate.reason && (
                          <p className="text-gray-600 text-xs mt-1">{blockedDate.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        <div className="bg-white shadow rounded-lg lg:col-span-2">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Πρόσφατες Κρατήσεις</h3>
              </div>
              <Link
                href="/bookings"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Προβολή όλων των κρατήσεων →
              </Link>
            </div>
            
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Δεν υπάρχουν κρατήσεις ακόμα</h3>
                <p className="mt-1 text-sm text-gray-500">Οι κρατήσεις για αυτό το γήπεδο θα εμφανιστούν εδώ.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                                                      {booking.userName || 'Άγνωστος Πελάτης'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {new Date(booking.startTime).toLocaleDateString('el-GR')} στις {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">€{booking.price?.toFixed(2) || '0.00'}</p>
                        <p className="text-sm text-gray-500">
                          {booking.status === 'confirmed' ? 'Επιβεβαιωμένη' :
                           booking.status === 'pending' ? 'Εκκρεμεί' :
                           booking.status === 'completed' ? 'Ολοκληρωμένη' :
                           booking.status === 'cancelled' ? 'Ακυρωμένη' :
                           'Επιβεβαιωμένη'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
