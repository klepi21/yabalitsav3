'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  CalendarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export default function VenueBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication and venue access
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (venueOwner.venueId !== venueId) {
      router.push(`/venue-dashboard/${venueOwner.venueId}`);
      return;
    }
    
    loadBookings();
  }, [venueId, user, venueOwner, authLoading, router]);

  const loadBookings = async () => {
    try {
      // TODO: Implement booking service
      // const bookingsData = await bookingService.getByVenue(venueId);
      // setBookings(bookingsData);
      setBookings([]); // Placeholder
    } catch (error) {
      console.error('Error loading bookings:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/venue-dashboard/${venueId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-gray-600">Manage bookings for your venue</p>
        </div>
        <Link
          href={`/venue-dashboard/${venueId}/bookings/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Booking
        </Link>
      </div>

      {/* Search */}
      <div className="max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search bookings..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first booking.
            </p>
            <div className="mt-6">
              <Link
                href={`/venue-dashboard/${venueId}/bookings/new`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Booking
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500">Bookings will appear here once created.</p>
          </div>
        )}
      </div>
    </div>
  );
}
