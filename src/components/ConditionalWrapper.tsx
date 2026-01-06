'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SidebarWrapper from './SidebarWrapper';
import GoogleAnalytics from './GoogleAnalytics';
import { authService } from '@/lib/firebase-services';

interface ConditionalWrapperProps {
  children: React.ReactNode;
}

export default function ConditionalWrapper({ children }: ConditionalWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Pages that should not have AuthProvider or SidebarWrapper
  const isPublicPage = pathname === '/' || 
                      pathname === '/fse' || 
                      pathname === '/venues' ||
                      pathname === '/for-venues' || 
                      pathname.startsWith('/book/') || 
                      pathname === '/terms' || 
                      pathname === '/privacy' ||
                      pathname === '/payment/checkout';

  // Pages that need AuthProvider but are not in the sidebar
  const isAuthPage = pathname === '/venue-login';

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = authService.getCurrentUser();
        
        if (user) {
          setIsAuthenticated(true);
          setIsChecking(false);
        } else if (!isPublicPage && !isAuthPage) {
          // If not authenticated and trying to access protected route, redirect to login
          setIsChecking(false);
          router.push('/venue-login');
        } else {
          setIsAuthenticated(false);
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (!isPublicPage && !isAuthPage) {
          router.push('/venue-login');
        }
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicPage, isAuthPage, router]);

  // Show loading state while checking authentication
  if (isChecking && !isPublicPage && !isAuthPage) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  if (isPublicPage) {
    // For public pages, render children without AuthProvider or SidebarWrapper
    return (
      <>
        <GoogleAnalytics />
        {children}
      </>
    );
  }

  // For auth pages (like login) and management pages, wrap with AuthProvider
  if (isAuthPage || isAuthenticated) {
    return (
      <AuthProvider>
        {isAuthPage ? (
          // Auth pages don't need SidebarWrapper
          <>
            <GoogleAnalytics />
            {children}
          </>
        ) : (
          // Management pages need SidebarWrapper
          <SidebarWrapper>
            <GoogleAnalytics />
            {children}
          </SidebarWrapper>
        )}
      </AuthProvider>
    );
  }

  // If not authenticated and not public page, show loading (will redirect)
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
    </div>
  );
}
