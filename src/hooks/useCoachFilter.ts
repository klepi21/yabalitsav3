'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that returns filtering helpers based on the current user's role.
 * - Admin: sees everything
 * - Coach with 'all_squads': sees everything
 * - Coach with 'own_squads': sees only assigned squads
 */
export function useCoachFilter() {
  const { venueOwner, isCoach, canViewAllSquads } = useAuth();

  const assignedSquadIds = useMemo(
    () => new Set(venueOwner?.assignedSquadIds || []),
    [venueOwner?.assignedSquadIds]
  );

  const shouldFilter = isCoach && !canViewAllSquads;

  const isVisibleSquad = useCallback(
    (squadId: string | undefined | null) => {
      if (!shouldFilter) return true;
      if (!squadId) return false;
      return assignedSquadIds.has(squadId);
    },
    [shouldFilter, assignedSquadIds]
  );

  const filterSquads = useCallback(
    <T extends { id: string }>(squads: T[]) => {
      if (!shouldFilter) return squads;
      return squads.filter(s => assignedSquadIds.has(s.id));
    },
    [shouldFilter, assignedSquadIds]
  );

  const isUserInVisibleSquad = useCallback(
    (user: { squad_id?: string; squad_ids?: string[] }) => {
      if (!shouldFilter) return true;
      const userSquads = user.squad_ids || (user.squad_id ? [user.squad_id] : []);
      return userSquads.some(sid => assignedSquadIds.has(sid));
    },
    [shouldFilter, assignedSquadIds]
  );

  return {
    isCoach,
    canViewAllSquads,
    isVisibleSquad,
    filterSquads,
    isUserInVisibleSquad,
  };
}
