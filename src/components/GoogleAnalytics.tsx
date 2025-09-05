'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      
      window.gtag('config', 'G-GWX4K2ZM6J', {
        page_path: url,
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
