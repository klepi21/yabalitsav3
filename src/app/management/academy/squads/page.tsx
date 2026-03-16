'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService } from '@/lib/academy-services';
import { Squad, AcademyUser } from '@/types/academy';
import { Loader2, Plus, Pencil, Trash2, Trophy, Users as UsersIcon, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

export default function SquadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [users, setUsers] = useState<AcademyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [squadsData, usersData] = await Promise.all([
          squadService.getByVenue(venueId),
          academyUserService.getByVenue(venueId),
        ]);
        setSquads(squadsData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης τμημάτων');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  const handleDelete = async (squadId: string) => {
    try {
      await squadService.delete(squadId);
      setSquads((prev) => prev.filter((s) => s.id !== squadId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής τμήματος');
    }
  };

  const getCoachNames = (coachIds: string[]) => {
    return coachIds
      .map((id) => users.find((u) => u.id === id)?.displayName)
      .filter(Boolean)
      .join(', ') || 'Χωρίς προπονητή';
  };

  const getAthleteCount = (squadId: string) => {
    return users.filter((u) => u.squad_id === squadId).length;
  };

  const filteredSquads = squads.filter(squad =>
    squad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    squad.ageGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Τμήματα</h1>
          <p className="text-sm text-zinc-500 mt-1">Διαχείριση ομάδων και ηλικιακών κατηγοριών</p>
        </div>
        <Button asChild>
          <Link href="/management/academy/squads/new">
            <Plus className="h-4 w-4" />
            Νέο Τμήμα
          </Link>
        </Button>
      </div>

      {/* Stats + Search row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-5 py-3.5">
          <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900">{squads.length}</p>
            <p className="text-[13px] text-zinc-400">Σύνολο Τμημάτων</p>
          </div>
        </div>

        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Αναζήτηση τμημάτων..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Squads Grid */}
      {filteredSquads.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1">
              {searchTerm ? 'Δεν βρέθηκαν τμήματα' : 'Δεν υπάρχουν τμήματα ακόμα'}
            </h3>
            <p className="text-[13px] text-zinc-400 mb-5">
              {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Δημιουργήστε το πρώτο τμήμα για να οργανώσετε τους αθλητές.'}
            </p>
            {!searchTerm && (
              <Button size="sm" asChild>
                <Link href="/management/academy/squads/new">
                  <Plus className="h-4 w-4" />
                  Δημιουργία Τμήματος
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSquads.map((squad, index) => {
            const colors = [
              { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'border-emerald-200/60 bg-emerald-50 text-emerald-700' },
              { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'border-blue-200/60 bg-blue-50 text-blue-700' },
              { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'border-violet-200/60 bg-violet-50 text-violet-700' },
            ];
            const color = colors[index % colors.length];
            const athleteCount = getAthleteCount(squad.id);

            return (
              <div
                key={squad.id}
                className="group rounded-xl border border-zinc-100/60 bg-white p-5 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${color.bg} flex items-center justify-center shrink-0`}>
                      <Trophy className={`h-5 w-5 ${color.text}`} />
                    </div>
                    <h4 className="text-[15px] font-semibold text-zinc-900">{squad.name}</h4>
                  </div>
                  <Badge variant="outline" className={`text-[11px] ${color.badge}`}>
                    {squad.ageGroup}
                  </Badge>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-zinc-400 flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5" />
                      Αθλητές
                    </span>
                    <span className="text-[15px] font-semibold text-zinc-900">{athleteCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-zinc-400 flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5" />
                      Προπονητής
                    </span>
                    <span className="text-sm font-medium text-zinc-600 truncate ml-4 text-right max-w-[140px]">
                      {getCoachNames(squad.coachIds)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-100/60">
                  <Button size="sm" className="flex-1 h-8 text-xs" asChild>
                    <Link href={`/management/academy/squads/${squad.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Επεξεργασία
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900" asChild>
                    <Link href={`/management/academy/users?squad=${squad.id}`}>
                      <UsersIcon className="h-3.5 w-3.5" />
                      Ρόστερ
                    </Link>
                  </Button>
                  <AlertDialog open={deleteConfirm === squad.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-xs border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                        onClick={() => setDeleteConfirm(squad.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Διαγραφή τμήματος</AlertDialogTitle>
                        <AlertDialogDescription>
                          Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα &quot;{squad.name}&quot;; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleDelete(squad.id)}>
                          Διαγραφή
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
