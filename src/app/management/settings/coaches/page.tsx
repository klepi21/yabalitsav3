'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { venueOwnerService } from '@/lib/firebase-services';
import { squadService } from '@/lib/academy-services';
import { VenueOwner } from '@/types';
import { Squad } from '@/types/academy';
import { getRoleLabel, getRoleColor } from '@/config/roles';
import {
  Loader2, ArrowLeft, Users, Shield, Eye, EyeOff, Save, UserX, UserCheck,
  ChevronRight, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { cn, toGreekUpperCase } from '@/lib/utils';

export default function CoachManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [owners, setOwners] = useState<VenueOwner[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editCoach, setEditCoach] = useState<VenueOwner | null>(null);
  const [editViewMode, setEditViewMode] = useState<'own_squads' | 'all_squads'>('own_squads');
  const [editSquadIds, setEditSquadIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState<VenueOwner | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const load = async () => {
      try {
        const [ownersData, squadsData] = await Promise.all([
          venueOwnerService.getAllByVenueId(venueId),
          squadService.getByVenue(venueId),
        ]);
        setOwners(ownersData);
        setSquads(squadsData);
      } catch (err) {
        console.error('Failed to load coaches:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, venueOwner, authLoading, router, pathname, venueId]);

  const coaches = owners.filter(o => o.role === 'coach' || o.role === 'coach' as string);
  const admins = owners.filter(o => ['admin', 'owner', 'venue_owner'].includes(o.role));

  const openEdit = (coach: VenueOwner) => {
    setEditCoach(coach);
    setEditViewMode(coach.coachViewMode || 'own_squads');
    setEditSquadIds(coach.assignedSquadIds || []);
  };

  const handleSave = async () => {
    if (!editCoach) return;
    setSaving(true);
    try {
      await venueOwnerService.update(editCoach.id, {
        coachViewMode: editViewMode,
        assignedSquadIds: editSquadIds,
      });
      setOwners(prev => prev.map(o =>
        o.id === editCoach.id
          ? { ...o, coachViewMode: editViewMode, assignedSquadIds: editSquadIds }
          : o
      ));
      setEditCoach(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirm) return;
    setDeactivating(true);
    try {
      // Remove from venueOwners (soft delete — coach can't login anymore)
      await venueOwnerService.update(deactivateConfirm.id, {
        role: 'coach' as VenueOwner['role'],
        permissions: ['disabled'],
      });
      setOwners(prev => prev.filter(o => o.id !== deactivateConfirm.id));
      setDeactivateConfirm(null);
    } catch (err) {
      console.error('Failed to deactivate:', err);
    } finally {
      setDeactivating(false);
    }
  };

  const toggleSquad = (squadId: string) => {
    setEditSquadIds(prev =>
      prev.includes(squadId)
        ? prev.filter(id => id !== squadId)
        : [...prev, squadId]
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/management/settings">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-zinc-900">
              {toGreekUpperCase('Διαχείριση Χρηστών')}
            </h1>
            <p className="text-sm text-zinc-500">Διαχείριση λογαριασμών σύνδεσης</p>
          </div>
        </div>

        {/* Admins Section */}
        <div className="mb-8">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3 px-1">
            {toGreekUpperCase('Διαχειριστές')} ({admins.length})
          </p>
          <div className="space-y-2">
            {admins.map(admin => (
              <Card key={admin.id} className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{admin.name}</p>
                      <p className="text-xs text-zinc-400">{admin.email}</p>
                    </div>
                  </div>
                  <Badge className={cn('text-[9px] font-black border-none', getRoleColor('admin'))}>
                    {toGreekUpperCase(getRoleLabel('admin'))}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Coaches Section */}
        <div>
          <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3 px-1">
            {toGreekUpperCase('Προπονητές')} ({coaches.length})
          </p>
          {coaches.length === 0 ? (
            <Card className="rounded-2xl border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Users className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 font-bold">Δεν υπάρχουν προπονητές</p>
                <p className="text-xs text-zinc-300 mt-1">
                  Πρόσκληση μέσω Ακαδημία → Χρήστες → 3 τελίτσες → Πρόσκληση σύνδεσης
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {coaches.map(coach => {
                const assignedCount = (coach.assignedSquadIds || []).length;
                const viewMode = coach.coachViewMode || 'own_squads';
                return (
                  <Card key={coach.id} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(coach)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{coach.name}</p>
                            <p className="text-xs text-zinc-400">{coach.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-[9px] font-black border-none', getRoleColor('coach'))}>
                            {toGreekUpperCase(getRoleLabel('coach'))}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-zinc-300" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 ml-13">
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          {viewMode === 'all_squads' ? (
                            <><Eye className="h-3 w-3" /> Όλα τα τμήματα</>
                          ) : (
                            <><EyeOff className="h-3 w-3" /> {assignedCount} τμήμα{assignedCount !== 1 ? 'τα' : ''}</>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Coach Dialog */}
      <AlertDialog open={!!editCoach} onOpenChange={(open) => !open && setEditCoach(null)}>
        <AlertDialogContent className="rounded-[2rem] p-8 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-zinc-900">
              Ρυθμίσεις Προπονητή
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500">
              {editCoach?.name} · {editCoach?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-6 mt-4">
            {/* View Mode */}
            <div className="space-y-2">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                Ορατότητα τμημάτων
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditViewMode('own_squads')}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all',
                    editViewMode === 'own_squads'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-100 text-zinc-500 hover:border-zinc-200'
                  )}
                >
                  <EyeOff className="h-4 w-4" />
                  Μόνο τα δικά του
                </button>
                <button
                  onClick={() => setEditViewMode('all_squads')}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all',
                    editViewMode === 'all_squads'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-zinc-100 text-zinc-500 hover:border-zinc-200'
                  )}
                >
                  <Eye className="h-4 w-4" />
                  Όλα τα τμήματα
                </button>
              </div>
            </div>

            {/* Assigned Squads */}
            {editViewMode === 'own_squads' && (
              <div className="space-y-2">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                  Ανάθεση τμημάτων
                </p>
                {squads.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-4">Δεν υπάρχουν τμήματα</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {squads.map(squad => {
                      const isSelected = editSquadIds.includes(squad.id);
                      return (
                        <button
                          key={squad.id}
                          onClick={() => toggleSquad(squad.id)}
                          className={cn(
                            'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all text-left',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-zinc-100 text-zinc-500 hover:border-zinc-200'
                          )}
                        >
                          <div className={cn(
                            'h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-black',
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-300'
                          )}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{squad.name}</p>
                            <p className="text-[10px] text-zinc-400">{squad.ageGroup}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {editViewMode === 'own_squads' && editSquadIds.length === 0 && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs font-bold bg-amber-50 rounded-xl p-3">
                    <AlertCircle className="h-4 w-4" />
                    Επιλέξτε τουλάχιστον ένα τμήμα
                  </div>
                )}
              </div>
            )}

            {/* Deactivate */}
            <div className="border-t border-zinc-100 pt-4">
              <button
                onClick={() => { setEditCoach(null); setDeactivateConfirm(editCoach); }}
                className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                <UserX className="h-4 w-4" />
                Απενεργοποίηση λογαριασμού
              </button>
              <p className="text-[10px] text-zinc-400 mt-1 ml-6">
                Ο προπονητής δεν θα μπορεί να συνδεθεί
              </p>
            </div>
          </div>

          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-12 px-6 rounded-xl font-bold border-zinc-100">
              Ακύρωση
            </AlertDialogCancel>
            <Button
              onClick={handleSave}
              disabled={saving || (editViewMode === 'own_squads' && editSquadIds.length === 0)}
              className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-lg shadow-emerald-200"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Αποθήκευση
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateConfirm} onOpenChange={(open) => !open && setDeactivateConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] p-8 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-zinc-900">
              Απενεργοποίηση Λογαριασμού
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500 mt-2">
              Ο προπονητής <span className="font-bold text-zinc-900">{deactivateConfirm?.name}</span> δεν
              θα μπορεί πλέον να συνδεθεί στην πλατφόρμα.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-12 px-6 rounded-xl font-bold border-zinc-100">
              Ακύρωση
            </AlertDialogCancel>
            <Button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="h-12 px-6 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
            >
              {deactivating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
              Απενεργοποίηση
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
