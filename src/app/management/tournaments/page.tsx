'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  Plus,
  Search,
  Calendar,
  Users,
  Swords,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { tournamentService, tournamentTeamService } from '@/lib/tournament-services';
import { Tournament } from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Πρόχειρο', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  registration: { label: 'Εγγραφές', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  active: { label: 'Σε Εξέλιξη', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Ολοκληρωμένο', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  cancelled: { label: 'Ακυρωμένο', className: 'bg-red-50 text-red-700 border-red-200' },
};

const typeLabels: Record<string, string> = {
  league: 'Πρωτάθλημα',
  knockout: 'Νοκ Άουτ',
  'group+knockout': 'Όμιλοι + Νοκ Άουτ',
};

export default function TournamentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [tournaments, setTournaments] = useState<(Tournament & { teamCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadTournaments = useCallback(async () => {
    if (!venueOwner) return;
    try {
      const data = await tournamentService.getByVenue(venueOwner.venueId);
      // Load team counts
      const withCounts = await Promise.all(
        data.map(async (t) => {
          const teams = await tournamentTeamService.getByTournament(t.id);
          return { ...t, teamCount: teams.length };
        })
      );
      // Sort by date descending
      withCounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTournaments(withCounts);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadTournaments();
  }, [user, venueOwner, authLoading, router, pathname, loadTournaments]);

  const filtered = tournaments.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const statusFilters = [
    { value: 'all', label: 'Όλα' },
    { value: 'draft', label: 'Πρόχειρα' },
    { value: 'registration', label: 'Εγγραφές' },
    { value: 'active', label: 'Ενεργά' },
    { value: 'completed', label: 'Ολοκληρωμένα' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Τουρνουά</h1>
            <p className="text-sm text-zinc-500">Διαχείριση πρωταθλημάτων και τουρνουά</p>
          </div>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
          <Link href="/management/tournaments/new">
            <Plus className="h-4 w-4" />
            Νέο Τουρνουά
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Σύνολο</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{tournaments.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600">
              <Swords className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ενεργά</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{tournaments.filter(t => t.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ομάδες</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{tournaments.reduce((sum, t) => sum + t.teamCount, 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 text-violet-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ολοκληρωμένα</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{tournaments.filter(t => t.status === 'completed').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Αναζήτηση τουρνουά..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white rounded-lg border-zinc-200"
          />
        </div>
        <div className="flex items-center gap-1 bg-zinc-100/80 rounded-lg p-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filterStatus === f.value
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
            <Trophy className="h-6 w-6 text-zinc-300" />
          </div>
          <h3 className="text-sm font-medium text-zinc-700">
            {searchTerm || filterStatus !== 'all' ? 'Δεν βρέθηκαν τουρνουά' : 'Δεν υπάρχουν τουρνουά'}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {searchTerm || filterStatus !== 'all'
              ? 'Δοκιμάστε διαφορετικά κριτήρια αναζήτησης.'
              : 'Δημιουργήστε το πρώτο σας τουρνουά.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((tournament) => {
            const status = statusConfig[tournament.status] || statusConfig.draft;
            return (
              <Link
                key={tournament.id}
                href={`/management/tournaments/${tournament.id}`}
                className="rounded-xl border border-zinc-100/60 bg-white p-5 hover:shadow-sm transition-all duration-150 block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-500">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold tracking-tight text-zinc-900">{tournament.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-zinc-400">{typeLabels[tournament.type] || tournament.type}</span>
                        <span className="text-xs text-zinc-300">|</span>
                        <span className="text-xs text-zinc-400">{tournament.pitchType}</span>
                        <span className="text-xs text-zinc-300">|</span>
                        <span className="text-xs text-zinc-400">
                          {new Date(tournament.startDate).toLocaleDateString('el-GR')} - {new Date(tournament.endDate).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-[54px] sm:ml-0">
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Ομάδες</p>
                      <p className="text-sm font-semibold text-zinc-900">{tournament.teamCount}/{tournament.maxTeams}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
