'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
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

  // Pages that should not have AuthProvider or SidebarWrapper
  const isPublicPage = useMemo(() =>
    pathname === '/' ||
    pathname === '/fse' ||
    pathname === '/venues' ||
    pathname === '/for-venues' ||
    pathname.startsWith('/book/') ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/payment/checkout' ||
    pathname === '/blog' ||
    pathname.startsWith('/blog/'),
  [pathname]);

  // Pages that need AuthProvider but are not in the sidebar
  const isAuthPage = pathname === '/venue-login';

  // No auth check needed for public/auth pages
  const needsAuth = !isPublicPage && !isAuthPage;

  const [isChecking, setIsChecking] = useState(needsAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for auth state changes (waits for Firebase to restore session)
  useEffect(() => {
    if (!needsAuth) return;

    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      }
      setIsChecking(false);
    });

    return () => unsubscribe();
  }, [pathname, needsAuth, router]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isPublicPage) {
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
          <>
            <GoogleAnalytics />
            {children}
          </>
        ) : (
          <SidebarWrapper>
            <GoogleAnalytics />
            {children}
          </SidebarWrapper>
        )}
      </AuthProvider>
    );
  }

  // Fallback loading (will redirect via useEffect)
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
