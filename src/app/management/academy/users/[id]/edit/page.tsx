'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAcademyUserPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user: authUser, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [user, setUser] = useState<AcademyUser | null>(null);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [parentCandidates, setParentCandidates] = useState<AcademyUser[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!authUser || !venueOwner) { router.push('/venue-login'); return; }
    loadData();
  }, [id, authUser, venueOwner, authLoading]);

  const loadData = async () => {
    try {
      setIsDataLoading(true);
      const [userData, groupsData, squadsData, allUsers] = await Promise.all([
        academyUserService.getById(id),
        userGroupService.getOrSeed(venueId),
        squadService.getByVenue(venueId),
        academyUserService.getByVenue(venueId),
      ]);

      if (!userData) {
        setError('Ο χρήστης δεν βρέθηκε');
        return;
      }

      setUser(userData);
      setGroups(groupsData);
      setSquads(squadsData);

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

  const parentGroup = useMemo(
    () => groups.find((g) => g.isDefault && g.name === 'Γονέας'),
    [groups]
  );

  const userGroup = useMemo(
    () => user ? groups.find((g) => g.id === user.groupId) : null,
    [user, groups]
  );

  const handleSubmit = async (data: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Handle parent linkage changes
      if (user) {
        const oldParentId = user.parent_uid;
        const newParentId = data.parent_uid;

        if (oldParentId !== newParentId) {
          if (oldParentId) {
            await academyUserService.unlinkAthleteFromParent(id, oldParentId);
          }
          if (newParentId) {
            await academyUserService.linkAthleteToParent(id, newParentId);
          }
        }
      }

      await academyUserService.update(id, data);
      router.push('/management/academy/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης χρήστη');
      setIsLoading(false);
    }
  };

  const handleQuickAddParent = async (parentData: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const parentId = await academyUserService.create(parentData);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ο χρήστης δεν βρέθηκε</h2>
          <p className="text-gray-500 mb-4">Ο χρήστης που αναζητάτε δεν υπάρχει.</p>
          <Link
            href="/management/academy/users"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Πίσω στους Χρήστες
          </Link>
        </div>
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
              <h1 className="text-xl font-bold text-gray-900">Επεξεργασία Χρήστη</h1>
              <p className="text-sm text-gray-500">
                {user.displayName} {userGroup ? `(${userGroup.name})` : ''}
              </p>
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
            initialData={user}
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
