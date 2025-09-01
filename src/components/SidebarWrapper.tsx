'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export default function SidebarWrapper({ children }: SidebarWrapperProps) {
  const pathname = usePathname();
  
  // Don't show sidebar on login page
  const isLoginPage = pathname === '/venue-login';
  
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }
  
  // Show sidebar for all other pages
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
