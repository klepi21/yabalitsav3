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
import { cn } from '@/lib/utils';
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
    <div className="space-y-10 pb-20">
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)} 
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-1">Κατηγορίες Χρηστών</h1>
            <p className="text-lg font-medium text-zinc-500">Ορίστε τους ρόλους και τα πεδία για τα μέλη της ακαδημίας.</p>
          </div>
        </div>
        <Button asChild className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 transition-all hover:translate-y-[-2px] active:translate-y-[1px]">
          <Link href="/management/academy/user-groups/new" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Νέα Κατηγορία
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-6 w-fit min-w-[300px]">
        <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
          <Users className="h-7 w-7" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight text-zinc-900 leading-none mb-1">{groups.length}</p>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Σύνολο Κατηγοριών</p>
        </div>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-white p-20 text-center">
            <div className="mx-auto h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8">
                <Users className="h-12 w-12 text-zinc-200" />
            </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν υπάρχουν κατηγορίες</h3>
          <p className="text-zinc-500 font-medium text-lg max-w-sm mx-auto">
            Ξεκινήστε δημιουργώντας την πρώτη κατηγορία χρηστών για να οργανώσετε την ακαδημία σας.
          </p>
          <Button asChild className="mt-10 h-14 px-10 rounded-2xl bg-emerald-600 text-white font-black">
            <Link href="/management/academy/user-groups/new">Νέα Κατηγορία</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group, index) => {
            const colors = [
              { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
              { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
              { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
              { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
              { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
            ];
            const color = colors[index % colors.length];

            return (
              <div
                key={group.id}
                className="group flex flex-col rounded-[2.5rem] border border-zinc-100 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:border-emerald-200"
              >
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div className="flex items-center gap-6 min-w-0">
                    <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 text-3xl shadow-sm transition-transform group-hover:scale-110", color.bg)}>
                      {group.icon}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h3 className="text-xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{group.name}</h3>
                            <Badge variant="secondary" className={cn("rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 border-none", (GROUP_COLORS as any)[group.color] || '')}>
                                {group.namePlural}
                            </Badge>
                        </div>
                        <p className="text-sm font-bold text-zinc-400">ID: {group.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-zinc-100 hover:bg-zinc-50 shadow-sm" asChild title="Επεξεργασία">
                      <Link href={`/management/academy/user-groups/${group.id}/edit`}>
                        <Pencil className="h-5 w-5 text-zinc-400" />
                      </Link>
                    </Button>
                    
                    <AlertDialog open={deleteConfirm === group.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
                          onClick={() => setDeleteConfirm(group.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-10 max-w-md">
                        <div className="text-center">
                            <div className="mx-auto h-20 w-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center mb-6">
                                <Trash2 className="h-10 w-10 text-red-500" />
                            </div>
                            <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή Κατηγορίας</AlertDialogTitle>
                            <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-2">
                                Είστε σίγουροι ότι θέλετε να διαγράψετε την κατηγορία <span className="font-black text-zinc-900">&quot;{group.name}&quot;</span>;
                                <br />Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-10 flex flex-col gap-3 sm:flex-row">
                                <AlertDialogCancel className="h-14 rounded-2xl border-zinc-100 font-bold text-zinc-500 flex-1 m-0">Ακύρωση</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(group.id)} className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black flex-1 m-0">
                                    Διαγραφή
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-6">
                    {/* Fields Section */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Επιπλέον Πεδία</p>
                        <div className="flex flex-wrap gap-2">
                            {group.fields.length > 0 ? (
                                group.fields.map((field) => (
                                    <span
                                        key={field.key}
                                        className="inline-flex items-center rounded-xl bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-600 border border-zinc-100"
                                    >
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1 italic font-black">*</span>}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs font-bold text-zinc-300 italic">Κανένα επιπλέον πεδίο</span>
                            )}
                        </div>
                    </div>

                    {/* Capabilities Section */}
                    {group.capabilities.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Δυνατότητες</p>
                            <div className="flex flex-wrap gap-2">
                                {group.capabilities.includes('squad_assignment') && (
                                    <Badge variant="outline" className="rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-100 bg-blue-50/50">
                                        <Shield className="h-3 w-3 mr-1.5" />
                                        Ανάθεση σε τμήμα
                                    </Badge>
                                )}
                                {group.capabilities.includes('parent_linking') && (
                                    <Badge variant="outline" className="rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 border-amber-100 bg-amber-50/50">
                                        <Link2 className="h-3 w-3 mr-1.5" />
                                        Σύνδεση γονέα
                                    </Badge>
                                )}
                                {group.capabilities.includes('coach_squads') && (
                                    <Badge variant="outline" className="rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 border-emerald-100 bg-emerald-50/50">
                                        <ClipboardList className="h-3 w-3 mr-1.5" />
                                        Ανάθεση τμημάτων
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
