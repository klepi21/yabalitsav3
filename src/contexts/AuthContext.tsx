'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService, venueOwnerService, venueService } from '@/lib/firebase-services';
import { VenueOwner } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  venueOwner: VenueOwner | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCoach: boolean;
  userRole: 'admin' | 'coach' | null;
  canViewAllSquads: boolean;  // true for admin, or coach with 'all_squads' mode
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [venueOwner, setVenueOwner] = useState<VenueOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const forceLogout = useCallback(async (reason: string) => {
    try {
      await authService.signOut();
    } catch { /* ignore */ }
    setUser(null);
    setVenueOwner(null);
    router.push(`/venue-login?error=${reason}`);
  }, [router]);

  // Check if venue subscription is still valid
  const checkSubscription = useCallback(async (venueId: string) => {
    try {
      const venue = await venueService.getById(venueId);
      if (!venue) return;

      // Check if explicitly deactivated
      if (venue.active === false) {
        await forceLogout('inactive');
        return;
      }

      // Check if subscription expired (daysRemaining <= 0 and not trial)
      if (venue.plan === 'subscription' && typeof venue.daysRemaining === 'number' && venue.daysRemaining <= 0) {
        // Mark venue as inactive
        await venueService.update(venueId, { active: false });
        await forceLogout('expired');
        return;
      }

      // Check if trial expired
      if (venue.plan === 'trial' && typeof venue.daysRemaining === 'number' && venue.daysRemaining <= 0) {
        await venueService.update(venueId, { active: false });
        await forceLogout('trial_expired');
        return;
      }
    } catch (error) {
      console.error('Subscription check error:', error);
    }
  }, [forceLogout]);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const owner = await venueOwnerService.getByEmail(firebaseUser.email || '');

          // Check if account is disabled
          if (owner?.permissions?.includes('disabled')) {
            await forceLogout('disabled');
            return;
          }

          // Check if venue is active
          if (owner?.venueId) {
            await checkSubscription(owner.venueId);
          }

          setVenueOwner(owner);

          // Start periodic check every 5 minutes
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          if (owner?.venueId) {
            checkIntervalRef.current = setInterval(() => {
              checkSubscription(owner.venueId);
            }, 5 * 60 * 1000);
          }
        } catch (error) {
          console.error('Error loading venue owner:', error);
          setVenueOwner(null);
        }
      } else {
        setVenueOwner(null);
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [router, checkSubscription, forceLogout]);

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setVenueOwner(null);
      router.push('/venue-login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Normalize role: treat legacy 'owner' and 'venue_owner' as 'admin'
  const normalizedRole = venueOwner?.role
    ? (['owner', 'venue_owner'].includes(venueOwner.role) ? 'admin' : venueOwner.role as 'admin' | 'coach')
    : null;

  const isAdmin = normalizedRole === 'admin';
  const isCoach = normalizedRole === 'coach';

  const value = {
    user,
    venueOwner,
    isLoading,
    isAdmin,
    isCoach,
    userRole: normalizedRole,
    canViewAllSquads: isAdmin || venueOwner?.coachViewMode === 'all_squads',
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
