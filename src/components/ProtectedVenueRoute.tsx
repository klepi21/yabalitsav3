'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, venueOwnerService } from '@/lib/firebase-services';
import { VenueOwner } from '@/types';

interface ProtectedVenueRouteProps {
  children: React.ReactNode;
  venueId?: string;
}

export default function ProtectedVenueRoute({ children, venueId }: ProtectedVenueRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [venueOwner, setVenueOwner] = useState<VenueOwner | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = authService.getCurrentUser();
        
        if (!user) {
          // Not logged in, redirect to login
          router.push('/venue-login');
          return;
        }

        // Get venue owner data
        const owner = await venueOwnerService.getByEmail(user.email || '');
        
        if (!owner) {
          // Not a venue owner, redirect to login
          router.push('/venue-login');
          return;
        }

        // If venueId is specified, check if owner has access to this venue
        if (venueId && owner.venueId !== venueId) {
          // Owner doesn't have access to this venue, redirect to their dashboard
          router.push(`/venue-dashboard/${owner.venueId}`);
          return;
        }

        setVenueOwner(owner);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/venue-login');
      }
    };

    checkAuth();
  }, [router, venueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!venueOwner) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
