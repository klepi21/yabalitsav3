'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';

export default function NewAcademyUserPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [parentCandidates, setParentCandidates] = useState<AcademyUser[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push('/venue-login'); return; }
    const loadData = async () => {
      try {
        setIsDataLoading(true);
        const [groupsData, squadsData, allUsers] = await Promise.all([
          userGroupService.getOrSeed(venueId),
          squadService.getByVenue(venueId),
          academyUserService.getByVenue(venueId),
        ]);
        setGroups(groupsData);
        setSquads(squadsData);

        // Find parent group and filter parent candidates
        const pGroup = groupsData.find((g) => g.isDefault && g.name === 'Γονέας');
        if (pGroup) {
          setParentCandidates(allUsers.filter((u) => u.groupId === pGroup.id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης δεδομένων');
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId]);

  // Find the parent group to load parent candidates
  const parentGroup = useMemo(
    () => groups.find((g) => g.isDefault && g.name === 'Γονέας'),
    [groups]
  );

  const handleSubmit = async (data: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (data.parent_uid) {
        await academyUserService.createWithParent(data, data.parent_uid);
      } else {
        await academyUserService.create(data);
      }

      router.push('/management/academy/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας χρήστη');
      setIsLoading(false);
    }
  };

  const handleQuickAddParent = async (parentData: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const parentId = await academyUserService.create(parentData);
    // Refresh parent candidates
    if (parentGroup) {
      const updated = await academyUserService.getByGroup(venueId, parentGroup.id);
      setParentCandidates(updated);
    }
    return parentId;
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/management/academy/users"
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Νέος Χρήστης</h1>
              <p className="text-sm text-gray-500">Δημιουργία νέου μέλους ακαδημίας</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Απόρριψη</button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <AcademyUserForm
            venueId={venueId}
            groups={groups}
            parentCandidates={parentCandidates}
            squads={squads}
            onSubmit={handleSubmit}
            onParentQuickAdd={handleQuickAddParent}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
