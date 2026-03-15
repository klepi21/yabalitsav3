'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AcademyUserForm from '@/components/AcademyUserForm';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
  }, [id, authUser, venueOwner, authLoading, router, venueId, pathname]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Ο χρήστης δεν βρέθηκε</h2>
          <p className="text-muted-foreground mb-4">Ο χρήστης που αναζητάτε δεν υπάρχει.</p>
          <Button asChild>
            <Link href="/management/academy/users">
              Πίσω στους Χρήστες
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/management">Διαχείριση</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/management/academy/users">Χρήστες</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Επεξεργασία</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/management/academy/users">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Επεξεργασία Χρήστη</h1>
              <p className="text-sm text-muted-foreground">
                {user.displayName} {userGroup ? `(${userGroup.name})` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Απόρριψη</button>
          </div>
        )}

        <Card>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
