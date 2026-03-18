'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';
import { Loader2, ArrowLeft, Pencil, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAcademyUserPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
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
    if (!authUser || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsDataLoading(true);
        const [userData, groupsData, squadsData, allUsers] = await Promise.all([
          academyUserService.getById(id),
          userGroupService.getByVenue(venueId),
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

        const pGroup = groupsData.find((g) => g.name === 'Γονέας');
        if (pGroup) {
          setParentCandidates(allUsers.filter((u) => u.groupId === pGroup.id || u.groupId === 'parent'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης δεδομένων');
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, [id, authUser, venueOwner, authLoading, router, venueId, pathname]);

  const parentGroup = useMemo(
    () => groups.find((g) => g.name === 'Γονέας'),
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Ο χρήστης δεν βρέθηκε</h2>
          <p className="text-sm text-zinc-400 mb-5">Ο χρήστης που αναζητάτε δεν υπάρχει.</p>
          <Button asChild>
            <Link href="/management/academy/users">Πίσω στους Χρήστες</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-200 shrink-0" asChild>
          <Link href="/management/academy/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Pencil className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Επεξεργασία Χρήστη</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {user.displayName} {userGroup ? `(${userGroup.name})` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive shrink-0">
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8">
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
  );
}
