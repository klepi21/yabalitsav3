'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService, venueOwnerService } from '@/lib/firebase-services';
import { VenueOwner } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  venueOwner: VenueOwner | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [venueOwner, setVenueOwner] = useState<VenueOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
              // Auth state changed
      setUser(firebaseUser);
      
      if (firebaseUser) {
                  // Firebase user email retrieved
        try {
          // Get venue owner data
          const owner = await venueOwnerService.getByEmail(firebaseUser.email || '');
                      // Venue owner data loaded
          setVenueOwner(owner);
        } catch (error) {
          console.error('Error loading venue owner:', error);
          setVenueOwner(null);
        }
      } else {
        setVenueOwner(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setVenueOwner(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    venueOwner,
    isLoading,
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
