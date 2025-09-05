'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import SidebarWrapper from './SidebarWrapper';

interface ConditionalWrapperProps {
  children: React.ReactNode;
}

export default function ConditionalWrapper({ children }: ConditionalWrapperProps) {
  const pathname = usePathname();
  
  // Pages that should not have AuthProvider or SidebarWrapper
  const isPublicPage = pathname === '/' || 
                      pathname === '/fse' || 
                      pathname === '/venues' ||
                      pathname === '/venue-login' || 
                      pathname === '/for-venues' || 
                      pathname.startsWith('/book/') || 
                      pathname === '/terms' || 
                      pathname === '/privacy';
  
  if (isPublicPage) {
    // For public pages, render children without AuthProvider or SidebarWrapper
    return <>{children}</>;
  }
  
  // For management pages, wrap with AuthProvider and SidebarWrapper
  return (
    <AuthProvider>
      <SidebarWrapper>
        {children}
      </SidebarWrapper>
    </AuthProvider>
  );
}
