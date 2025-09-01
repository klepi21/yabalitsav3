'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export default function VenueSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [isLoading] = useState(false);

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
  }, [venueId, user, venueOwner, authLoading, router]);

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

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Venue Settings</h1>
        <p className="mt-2 text-gray-600">Configure your venue preferences and settings</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Settings Coming Soon</h3>
            <p className="mt-1 text-sm text-gray-500">
              Venue settings and configuration options will be available in the next version.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
