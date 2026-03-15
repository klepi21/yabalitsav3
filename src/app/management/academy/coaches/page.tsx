'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CoachesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/management/academy/users');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );
}
