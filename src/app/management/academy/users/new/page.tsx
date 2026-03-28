'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService, academyPaymentService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';
import { Loader2, ArrowLeft, UserPlus, AlertCircle, X } from 'lucide-react';
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
          userGroupService.getByVenue(venueId),
          squadService.getByVenue(venueId),
          academyUserService.getByVenue(venueId),
        ]);
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
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  const parentGroup = useMemo(
    () => groups.find((g) => g.name === 'Γονέας'),
    [groups]
  );

  const handleSubmit = async (data: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      setError(null);

      let newUserId: string;
      if (data.parent_uid) {
        newUserId = await academyUserService.createWithParent(data, data.parent_uid);
      } else {
        newUserId = await academyUserService.create(data);
      }

      const group = groups.find(g => g.id === data.groupId);
      if (group?.capabilities.includes('monthly_payment') && venueId) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const existingPayments = await academyPaymentService.getByVenueAndMonth(venueId, currentMonth);
        if (existingPayments.length > 0) {
          const defaultAmount = existingPayments[0].amount;
          await academyPaymentService.create({
            venueId,
            userId: newUserId,
            userName: data.displayName,
            month: currentMonth,
            amount: defaultAmount,
            paid: false,
          });
        }
      }

      router.push('/management/academy/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας χρήστη');
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

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3.5 pb-2 border-b border-zinc-50">
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-zinc-200 shrink-0" asChild>
          <Link href="/management/academy/users">
            <ArrowLeft className="h-4 w-4 text-zinc-400" />
          </Link>
        </Button>
        <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
          <UserPlus className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
            {toGreekUpperCase('Νέος Χρήστης')}
          </h1>
          <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">
            {toGreekUpperCase('Δημιουργία νέου μέλους ακαδημίας')}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 sm:p-8 shadow-sm">
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
