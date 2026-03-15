'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { userGroupService } from '@/lib/academy-services';
import { UserGroup, GROUP_COLORS } from '@/types/academy';
import { Loader2, Plus, Pencil, Trash2, ClipboardList, Shield, Link2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function UserGroupsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadGroups = async () => {
      try {
        setIsLoading(true);
        const data = await userGroupService.getOrSeed(venueId);
        setGroups(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadGroups();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  const handleDelete = async (id: string) => {
    try {
      await userGroupService.delete(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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
                <BreadcrumbPage>Κατηγορίες Χρηστών</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Κατηγορίες Χρηστών</h1>
              <p className="text-sm text-muted-foreground mt-1">Διαχείριση κατηγοριών και πεδίων</p>
            </div>
            <Button asChild>
              <Link href="/management/academy/user-groups/new">
                <Plus className="h-4 w-4 mr-1" />
                Νέα Κατηγορία
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="py-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-lg">{group.name}</h3>
                        <Badge variant="secondary" className={GROUP_COLORS[group.color] || ''}>
                          {group.namePlural}
                        </Badge>
                        {group.isDefault && (
                          <Badge variant="outline">
                            Προεπιλογή
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.fields.map((field) => (
                          <Badge
                            key={field.key}
                            variant="secondary"
                            className="bg-muted text-muted-foreground"
                          >
                            {field.label}
                            {field.required && <span className="text-destructive ml-0.5">*</span>}
                            <span className="ml-1 opacity-60">({field.type})</span>
                          </Badge>
                        ))}
                        {group.fields.length === 0 && (
                          <span className="text-xs text-muted-foreground">Χωρίς πρόσθετα πεδία</span>
                        )}
                      </div>
                      {group.capabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {group.capabilities.includes('squad_assignment') && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                              <Shield className="h-3 w-3 mr-1" />
                              Ανάθεση σε τμήμα
                            </Badge>
                          )}
                          {group.capabilities.includes('parent_linking') && (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                              <Link2 className="h-3 w-3 mr-1" />
                              Σύνδεση γονέα
                            </Badge>
                          )}
                          {group.capabilities.includes('coach_squads') && (
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                              <ClipboardList className="h-3 w-3 mr-1" />
                              Ανάθεση τμημάτων
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/management/academy/user-groups/${group.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    {group.name !== 'Διαχειριστής' && (
                      <AlertDialog open={deleteConfirm === group.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm(group.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Διαγραφή κατηγορίας</AlertDialogTitle>
                            <AlertDialogDescription>
                              Είστε σίγουροι ότι θέλετε να διαγράψετε την κατηγορία &quot;{group.name}&quot;;
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => handleDelete(group.id)}>
                              Διαγραφή
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
