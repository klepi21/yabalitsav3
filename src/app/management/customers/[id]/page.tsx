'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyEuroIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { userService, bookingService } from '@/lib/firebase-services';
import { User, Booking } from '@/types';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [customer, setCustomer] = useState<User | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customerId = params?.id as string;

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }

    const loadCustomerData = async () => {
      if (!customerId) return;

      try {
        setIsLoading(true);

        // Load customer data
        const customerData = await userService.getById(customerId);
        if (!customerData) {
          setError('Ο πελάτης δεν βρέθηκε');
          return;
        }
        setCustomer(customerData);

        // Load customer's bookings for this venue
        const allBookings = await bookingService.getByVenue(venueOwner.venueId);
        const customerVenueBookings = allBookings.filter(booking =>
          booking.userId === customerId
        );
        setCustomerBookings(customerVenueBookings);

      } catch (error) {
        console.error('Error loading customer data:', error);
        setError('Σφάλμα στη φόρτωση των δεδομένων του πελάτη');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomerData();
  }, [user, venueOwner, authLoading, router, customerId]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-red-600 text-2xl mb-4">❌</div>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <Link 
            href="/management/customers"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Επιστροφή στους Πελάτες
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Επιβεβαιωμένη';
      case 'pending': return 'Εκκρεμεί';
      case 'completed': return 'Ολοκληρωμένη';
      case 'cancelled': return 'Ακυρωμένη';
      default: return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/management/customers"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Επιστροφή στους Πελάτες
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Πληροφορίες Πελάτη</h1>
          </div>
          <Link
            href={`/management/customers/${customer.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Επεξεργασία
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-football-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white font-bold">
                  {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">{customer.phone}</span>
              </div>
              
              {customer.email && (
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{customer.email}</span>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">
                  Πελάτης από: {formatDate(customer.createdAt)}
                </span>
              </div>

              {customer.venueIds && customer.venueIds.length > 0 && (
                <div className="flex items-center space-x-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">
                    {customer.venueIds.length} venue{customer.venueIds.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-lg rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Κρατήσεις ({customerBookings.length})
              </h3>
            </div>

            {customerBookings.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Δεν υπάρχουν κρατήσεις ακόμα
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Αυτός ο πελάτης δεν έχει κάνει κρατήσεις στο γήπεδό σας.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {customerBookings.map((booking) => (
                  <div key={booking.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ID: {booking.id.slice(-8)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{formatDate(booking.startTime)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <CurrencyEuroIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">€{booking.price}</span>
                          </div>
                          
                          {booking.notes && (
                            <div className="sm:col-span-2">
                              <span className="text-gray-500">Σημείωση: {booking.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link
                          href={`/management/bookings/${booking.id}`}
                          className="text-sm text-football-green hover:text-football-green-light"
                        >
                          Προβολή Κράτησης
                        </Link>
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
