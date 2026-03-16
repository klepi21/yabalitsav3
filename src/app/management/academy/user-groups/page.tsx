'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { userGroupService } from '@/lib/academy-services';
import { UserGroup, GROUP_COLORS } from '@/types/academy';
import { Loader2, Plus, Pencil, Trash2, ClipboardList, Shield, Link2, Users, AlertCircle } from 'lucide-react';
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
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Κατηγορίες Χρηστών</h1>
          <p className="text-sm text-zinc-500 mt-1">Διαχείριση κατηγοριών και πεδίων</p>
        </div>
        <Button asChild>
          <Link href="/management/academy/user-groups/new">
            <Plus className="h-4 w-4" />
            Νέα Κατηγορία
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-5 py-3.5 w-fit">
        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900">{groups.length}</p>
          <p className="text-[13px] text-zinc-400">Σύνολο Κατηγοριών</p>
        </div>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1">Δεν υπάρχουν κατηγορίες</h3>
            <p className="text-[13px] text-zinc-400 mb-5">Δημιουργήστε την πρώτη κατηγορία χρηστών.</p>
            <Button size="sm" asChild>
              <Link href="/management/academy/user-groups/new">
                <Plus className="h-4 w-4" />
                Νέα Κατηγορία
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, index) => {
            const colors = [
              { bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { bg: 'bg-blue-50', text: 'text-blue-600' },
              { bg: 'bg-violet-50', text: 'text-violet-600' },
              { bg: 'bg-amber-50', text: 'text-amber-600' },
              { bg: 'bg-rose-50', text: 'text-rose-600' },
            ];
            const color = colors[index % colors.length];

            return (
              <div
                key={group.id}
                className="group rounded-xl border border-zinc-100/60 bg-white p-5 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`h-11 w-11 rounded-lg ${color.bg} flex items-center justify-center shrink-0 text-xl`}>
                      {group.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-zinc-900">{group.name}</h3>
                        <Badge variant="secondary" className={`text-[11px] ${GROUP_COLORS[group.color] || ''}`}>
                          {group.namePlural}
                        </Badge>
                        {group.isDefault && (
                          <Badge variant="outline" className="text-[11px] border-zinc-200/60 text-zinc-400">
                            Προεπιλογή
                          </Badge>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {group.fields.map((field) => (
                          <span
                            key={field.key}
                            className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-500 border border-zinc-100"
                          >
                            {field.label}
                            {field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </span>
                        ))}
                        {group.fields.length === 0 && (
                          <span className="text-[11px] text-zinc-300">Χωρίς πρόσθετα πεδία</span>
                        )}
                      </div>

                      {/* Capabilities */}
                      {group.capabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.capabilities.includes('squad_assignment') && (
                            <Badge variant="outline" className="text-[11px] text-blue-600 border-blue-200/60 bg-blue-50">
                              <Shield className="h-3 w-3 mr-1" />
                              Ανάθεση σε τμήμα
                            </Badge>
                          )}
                          {group.capabilities.includes('parent_linking') && (
                            <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-200/60 bg-amber-50">
                              <Link2 className="h-3 w-3 mr-1" />
                              Σύνδεση γονέα
                            </Badge>
                          )}
                          {group.capabilities.includes('coach_squads') && (
                            <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-200/60 bg-emerald-50">
                              <ClipboardList className="h-3 w-3 mr-1" />
                              Ανάθεση τμημάτων
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" className="h-8 text-xs" asChild>
                      <Link href={`/management/academy/user-groups/${group.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Επεξεργασία
                      </Link>
                    </Button>
                    {group.isDefault ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-zinc-100 text-zinc-300 cursor-not-allowed"
                        disabled
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <AlertDialog open={deleteConfirm === group.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                            onClick={() => setDeleteConfirm(group.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
