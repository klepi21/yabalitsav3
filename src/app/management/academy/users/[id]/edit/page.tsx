'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';
import { Pencil, ArrowLeft, Users, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toGreekUpperCase } from '@/lib/utils';

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
        <div className="bg-white rounded-[3rem] border border-zinc-100 p-16 text-center shadow-sm max-w-lg w-full">
          <div className="mx-auto h-24 w-24 rounded-[2rem] bg-zinc-50 flex items-center justify-center mb-8 shadow-inner">
            <Users className="h-12 w-12 text-zinc-200" />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 mb-2 uppercase tracking-tight">{toGreekUpperCase('Δεν βρέθηκε')}</h2>
          <p className="text-lg font-bold text-zinc-400 mb-10 uppercase tracking-tight">{toGreekUpperCase('Ο χρήστης που αναζητάτε δεν υπάρχει.')}</p>
          <Button asChild className="h-16 px-10 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-lg uppercase tracking-widest shadow-xl active:scale-95">
            <Link href="/management/academy/users">{toGreekUpperCase('Πίσω στους Χρήστες')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center gap-8">
           <Button variant="outline" size="icon" className="h-16 w-16 rounded-2xl border-2 border-zinc-100 hover:bg-zinc-50 hover:border-emerald-200 hover:text-emerald-600 transition-all shrink-0 group" asChild>
            <Link href="/management/academy/users">
              <ArrowLeft className="h-8 w-8 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
            </Link>
          </Button>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0">
              <Pencil className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">
                {toGreekUpperCase('Επεξεργασία Χρήστη')}
              </h1>
              <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
                {user.displayName} {userGroup ? `(${userGroup.name})` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 font-black uppercase text-lg">{toGreekUpperCase(error)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-black uppercase">
              {toGreekUpperCase('Κλείσιμο')}
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-[3rem] border border-zinc-100 bg-white p-10 lg:p-16 shadow-sm overflow-hidden mb-20 animate-in fade-in slide-in-from-bottom-8 duration-500">
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
