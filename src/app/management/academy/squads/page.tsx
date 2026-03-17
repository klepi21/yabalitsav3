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
import { cn, toGreekUpperCase } from '@/lib/utils';
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
    return users.filter((u) => (u.squad_ids || []).includes(squadId) || u.squad_id === squadId).length;
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
    <div className="space-y-10 pb-20">
      {/* Error Alert */}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
           <div className="h-20 w-20 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0">
             <Trophy className="h-10 w-10 text-emerald-400" />
           </div>
           <div className="space-y-1">
             <h1 className="text-5xl font-black tracking-tight text-zinc-900 uppercase">
               {toGreekUpperCase('Τμήματα')}
             </h1>
             <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
               {toGreekUpperCase('ΟΡΓΑΝΩΣΗ ΑΘΛΗΤΩΝ ΣΕ ΟΜΑΔΕΣ')}
             </p>
           </div>
        </div>
        
        <Button asChild className="h-16 px-10 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-lg shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
          <Link href="/management/academy/squads/new" className="flex items-center gap-3">
            <Plus className="h-7 w-7 text-emerald-400 group-hover:scale-110 transition-transform" />
            {toGreekUpperCase('Νέο Τμήμα')}
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-6 bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm min-w-[320px] group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
          <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-zinc-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{squads.length}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Σύνολο Τμημάτων')}</p>
          </div>
        </div>

        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
          <Input
            placeholder={toGreekUpperCase('Αναζήτηση τμημάτων με όνομα ή ηλικία...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-16 pl-16 pr-6 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-500/10 font-black text-lg placeholder:text-zinc-300 w-full transition-all uppercase"
          />
        </div>
      </div>

      {/* Squads Grid */}
      {filteredSquads.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-white p-20 text-center">
            <div className="mx-auto h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <Trophy className="h-12 w-12 text-zinc-200" />
            </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-2">
            {searchTerm ? 'Δεν βρέθηκαν τμήματα' : 'Δεν υπάρχουν τμήματα ακόμα'}
          </h3>
          <p className="text-zinc-500 font-medium text-lg max-w-sm mx-auto">
            {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Δημιουργήστε το πρώτο τμήμα για να οργανώσετε τους αθλητές σας.'}
          </p>
          {!searchTerm && (
            <Button asChild className="mt-10 h-14 px-10 rounded-2xl bg-emerald-600 text-white font-black">
              <Link href="/management/academy/squads/new">Δημιουργία Τμήματος</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSquads.map((squad, index) => {
            const colors = [
              { bg: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', hover: 'hover:border-emerald-200' },
              { bg: 'bg-blue-50 text-blue-600', badge: 'bg-blue-100 text-blue-700', hover: 'hover:border-blue-200' },
              { bg: 'bg-violet-50 text-violet-600', badge: 'bg-violet-100 text-violet-700', hover: 'hover:border-violet-200' },
            ];
            const color = colors[index % colors.length];
            const athleteCount = getAthleteCount(squad.id);

            return (
              <div
                key={squad.id}
                className={cn(
                    "group relative flex flex-col rounded-[2rem] border border-zinc-100 bg-white p-8 transition-all duration-300 hover:shadow-xl",
                    color.hover
                )}
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm", color.bg)}>
                      <Trophy className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{toGreekUpperCase(squad.name)}</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase(squad.ageGroup)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-10 flex-1">
                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-[1.5rem] group-hover:bg-white border border-transparent group-hover:border-emerald-100 group-hover:shadow-lg transition-all">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-3">
                      <UsersIcon className="h-5 w-5 text-emerald-500/50" />
                      {toGreekUpperCase('Αθλητές')}
                    </span>
                    <span className="text-3xl font-black text-zinc-900 group-hover:text-emerald-600 transition-colors">{athleteCount}</span>
                  </div>
                  <div className="space-y-2 px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Προπονητής')}</p>
                    <p className="text-[15px] font-extrabold text-zinc-600 uppercase tracking-tight truncate">
                      {toGreekUpperCase(getCoachNames(squad.coachIds))}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-zinc-100 relative z-10">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-zinc-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-sm transition-all active:scale-95" asChild>
                    <Link href={`/management/academy/squads/${squad.id}/edit`}>
                      {toGreekUpperCase('Επεξεργασία')}
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-zinc-100 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 shadow-sm transition-all active:scale-95" asChild>
                    <Link href={`/management/academy/users?squad=${squad.id}`}>
                      {toGreekUpperCase('Ρόστερ')}
                    </Link>
                  </Button>
                  
                  <AlertDialog open={deleteConfirm === squad.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-14 w-14 rounded-2xl text-zinc-300 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all active:scale-90"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(squad.id); }}
                      >
                        <Trash2 className="h-6 w-6" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] p-10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή τμήματος</AlertDialogTitle>
                        <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-2">
                          Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα <span className="text-zinc-900 font-bold">&quot;{squad.name}&quot;</span>; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-10 gap-3">
                        <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-zinc-100">Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(squad.id)}
                          className="h-14 px-8 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
                        >
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
