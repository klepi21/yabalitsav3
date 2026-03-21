'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const AuthProvider = dynamic(() => import('@/contexts/AuthContext').then(m => m.AuthProvider), { ssr: false });
const SidebarWrapper = dynamic(() => import('./SidebarWrapper'), { ssr: false });
const GoogleAnalytics = dynamic(() => import('./GoogleAnalytics'), { ssr: false });
const CookieConsent = dynamic(() => import('./CookieConsent'), { ssr: false });
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false });

// authService removed from static imports to prevent loading Firebase SDK on public pages

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
  const isFullscreenAuthPage = pathname.startsWith('/coach/attendance') || pathname.startsWith('/coach/evaluate');

  // No auth check needed for public/auth pages
  const needsAuth = !isPublicPage && !isAuthPage && !isFullscreenAuthPage;

  const [isChecking, setIsChecking] = useState(needsAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for auth state changes (waits for Firebase to restore session)
  useEffect(() => {
    if (!needsAuth) return;

    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      // Dynamic import of firebase-services to avoid bundling Firebase SDK on public pages
      const { authService } = await import('@/lib/firebase-services');
      unsubscribe = authService.onAuthStateChanged((user) => {
        if (user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
        }
        setIsChecking(false);
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
        <CookieConsent />
        <GoogleAnalytics />
        {children}
      </>
    );
  }

  // For auth pages (like login) and management pages, wrap with AuthProvider
  if (isAuthPage || isFullscreenAuthPage || isAuthenticated) {
    return (
      <AuthProvider>
        {isAuthPage ? (
          <>
            <CookieConsent />
            <GoogleAnalytics />
            {children}
          </>
        ) : isFullscreenAuthPage ? (
          <>
            <GoogleAnalytics />
            {children}
          </>
        ) : (
          <SidebarWrapper>
            <CookieConsent />
            <GoogleAnalytics />
            <ChatWidget />
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
