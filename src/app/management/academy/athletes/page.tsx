'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AthletesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/management/academy/users');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
    </div>
  );
}
