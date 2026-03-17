'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';
import { Loader2, ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toGreekUpperCase } from '@/lib/utils';

export default function NewAcademyUserPage() {
  const router = useRouter();
  const pathname = usePathname();
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
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
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
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  // Find the parent group to load parent candidates
  const parentGroup = useMemo(
    () => groups.find((g) => g.name === 'Γονέας'),
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-6 pb-6 border-b border-zinc-100">
        <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-zinc-200 shrink-0 hover:bg-zinc-50 hover:border-emerald-200 hover:text-emerald-600 transition-all active:scale-90" asChild>
          <Link href="/management/academy/users">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex items-center gap-5">
           <div className="h-16 w-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-200 shrink-0">
             <UserPlus className="h-8 w-8 text-emerald-400" />
           </div>
           <div className="space-y-1">
             <h1 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">
               {toGreekUpperCase('Νέος Χρήστης')}
             </h1>
             <p className="text-lg font-bold text-zinc-400 uppercase tracking-tight">
               {toGreekUpperCase('ΔΗΜΙΟΥΡΓΙΑ ΝΕΟΥ ΜΕΛΟΥΣ ΑΚΑΔΗΜΙΑΣ')}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-destructive/60 hover:text-destructive shrink-0"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-[3rem] border border-zinc-100 bg-white p-10 sm:p-14 shadow-sm overflow-hidden">
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
  );
}
