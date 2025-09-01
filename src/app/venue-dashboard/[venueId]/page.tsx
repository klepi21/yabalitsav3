'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon, 
  MapPinIcon, 
  CalendarIcon, 
  UsersIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { venueService, pitchService, authService } from '@/lib/firebase-services';
import { Venue, Pitch } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function VenueDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication and venue access
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (venueOwner.venueId !== venueId) {
      router.push(`/venue-dashboard/${venueOwner.venueId}`);
      return;
    }
    
    loadVenueData();
  }, [venueId, user, venueOwner, authLoading, router]);

  const loadVenueData = async () => {
    try {
      const [venueData, pitchesData] = await Promise.all([
        venueService.getById(venueId),
        pitchService.getByVenue(venueId)
      ]);
      
      setVenue(venueData);
      setPitches(pitchesData || []);
    } catch (error) {
      console.error('Error loading venue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      router.push('/venue-login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Venue not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested venue could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
          <p className="mt-2 text-gray-600">Venue Management Dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pitches</dt>
                    <dd className="text-lg font-medium text-gray-900">{pitches.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today's Bookings</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">€0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Venue Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{venue.address}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{venue.contactDetails.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{venue.contactDetails.phone}</dd>
            </div>
            {venue.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{venue.notes}</dd>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pitches Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pitches</h3>
            <Link
              href={`/venue-dashboard/${venueId}/pitches/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Pitch
            </Link>
          </div>

          {pitches.length === 0 ? (
            <div className="text-center py-8">
              <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pitches yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first pitch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pitches.map((pitch) => (
                <div key={pitch.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{pitch.name}</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {pitch.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{pitch.type}</p>
                  <p className="mt-1 text-sm text-gray-500">€{pitch.pricePerSlot}/slot</p>
                  <div className="mt-3 flex space-x-2">
                    <Link
                      href={`/venue-dashboard/${venueId}/pitches/${pitch.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/venue-dashboard/${venueId}/pitches/${pitch.id}`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/venue-dashboard/${venueId}/bookings`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <CalendarIcon className="h-6 w-6 text-blue-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Manage Bookings</p>
                <p className="text-sm text-gray-500">View and manage all bookings</p>
              </div>
            </Link>

            <Link
              href={`/venue-dashboard/${venueId}/customers`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <UsersIcon className="h-6 w-6 text-green-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Customer Management</p>
                <p className="text-sm text-gray-500">Manage customer information</p>
              </div>
            </Link>

            <Link
              href={`/venue-dashboard/${venueId}/settings`}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <Cog6ToothIcon className="h-6 w-6 text-purple-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Venue Settings</p>
                <p className="text-sm text-gray-500">Configure venue preferences</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
