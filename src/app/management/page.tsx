'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ManagementPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
    } else {
      router.push('/management/dashboard');
    }
  }, [user, venueOwner, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green mx-auto mb-4"></div>
        <p className="text-gray-600">Ανακατεύθυνση...</p>
      </div>
    </div>
  );
}
