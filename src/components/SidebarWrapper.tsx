'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export default function SidebarWrapper({ children }: SidebarWrapperProps) {
  const pathname = usePathname();
  
  // Don't show sidebar on public pages
  const isRootPage = pathname === '/';
  const isLoginPage = pathname === '/venue-login';
  const isForVenues = pathname === '/for-venues';
  const isBookingPage = pathname.startsWith('/book/');
  
  if (isRootPage || isLoginPage || isForVenues || isBookingPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }
  
  // Show sidebar for management pages only
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {/* Top bar with Help/Guides button */}
          <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 border-b">
            <div className="px-6 py-3 flex items-center justify-end">
              <Link
                href="/management/guides"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-green-700"
                title="Οδηγίες Χρήσης"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
                Οδηγίες
              </Link>
            </div>
          </div>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}