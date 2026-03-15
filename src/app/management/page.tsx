'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );
}
