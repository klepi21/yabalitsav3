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
import { Badge } from '@/components/ui/badge';
import { cn, toGreekUpperCase } from '@/lib/utils';


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
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-1 border-b border-zinc-50">
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
            {toGreekUpperCase('Τουρνουά')}
          </h1>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">
            {toGreekUpperCase('Διαχειριστείτε τα πρωταθλήματα και τις διοργανώσεις σας.')}
          </p>
        </div>
        <Button asChild className="h-10 px-5 rounded-lg bg-zinc-900 border-0 hover:bg-black font-bold text-[12px] text-white shadow-md transition-all active:scale-95 group">
          <Link href="/management/tournaments/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            {toGreekUpperCase('Νέο Τουρνουά')}
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Σύνολο', value: tournaments.length, icon: Trophy, color: 'amber' },
          { label: 'Ενεργά', value: tournaments.filter(t => t.status === 'active').length, icon: Swords, color: 'emerald' },
          { label: 'Ομάδες', value: tournaments.reduce((sum, t) => sum + t.teamCount, 0), icon: Users, color: 'blue' },
          { label: 'Ολοκληρωμένα', value: tournaments.filter(t => t.status === 'completed').length, icon: Calendar, color: 'violet' },
        ].map((stat) => {
          const Icon = stat.icon;
          const colorStyles: Record<string, string> = {
            amber: 'bg-amber-50 text-amber-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            blue: 'bg-blue-50 text-blue-600',
            violet: 'bg-violet-50 text-violet-600',
          };
          return (
            <div key={stat.label} className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm transition-all hover:shadow-md">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", colorStyles[stat.color])}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-black text-zinc-900 mb-0.5">{stat.value}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">{toGreekUpperCase(stat.label)}</p>
            </div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col xl:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
        <Input
          placeholder={toGreekUpperCase('Αναζήτηση...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 pl-10 pr-4 bg-white rounded-lg border-zinc-100 shadow-sm focus:ring-emerald-500 font-bold text-xs placeholder:text-zinc-300 uppercase"
        />
      </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-zinc-100 shadow-sm overflow-x-auto whitespace-nowrap">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={cn(
                "px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all",
                filterStatus === f.value
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {toGreekUpperCase(f.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white p-12 text-center">
          <div className="mx-auto h-16 w-16 bg-zinc-50 rounded-xl flex items-center justify-center mb-6 shadow-inner">
            <Trophy className="h-8 w-8 text-zinc-200" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 mb-1">
            {searchTerm || filterStatus !== 'all' ? 'Δεν βρέθηκαν τουρνουά' : 'Δεν υπάρχουν τουρνουά'}
          </h3>
          <p className="text-zinc-500 font-medium text-xs">
            {searchTerm || filterStatus !== 'all'
              ? 'Δοκιμάστε να αλλάξετε την αναζήτηση ή τα φίλτρα.'
              : 'Ξεκινήστε δημιουργώντας την πρώτη σας διοργάνωση!'}
          </p>
          {!(searchTerm || filterStatus !== 'all') && (
            <Button asChild className="mt-8 h-12 px-8 rounded-xl bg-zinc-900 text-white font-black uppercase text-[12px] transition-all">
              <Link href="/management/tournaments/new">Δημιουργία Τουρνουά</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((tournament) => {
            const status = statusConfig[tournament.status] || statusConfig.draft;
            return (
              <Link
                key={tournament.id}
                href={`/management/tournaments/${tournament.id}`}
                className="group relative rounded-xl border border-zinc-100 bg-white p-5 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 block"
              >
                <div className="flex flex-col gap-4">
                  {/* Status & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight truncate max-w-[160px] sm:max-w-none">
                          {tournament.name}
                        </h3>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">
                          {toGreekUpperCase(typeLabels[tournament.type] || tournament.type)}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn("rounded-md px-2.5 py-0.5 font-bold text-[8px] uppercase tracking-wider border-none", status.className)}>
                      {toGreekUpperCase(status.label)}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-zinc-50">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Τύπος Γηπέδου</p>
                      <p className="text-[11px] font-bold text-zinc-900">{tournament.pitchType}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Συμμετοχές</p>
                      <p className="text-[11px] font-bold text-zinc-900">{tournament.teamCount} / {tournament.maxTeams} Ομάδες</p>
                    </div>
                  </div>

                  {/* Footer Details */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="h-3 w-3" />
                      <span className="text-[10px] font-bold">
                        {new Date(tournament.startDate).toLocaleDateString('el-GR')} - {new Date(tournament.endDate).toLocaleDateString('el-GR')}
                      </span>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                      <Swords className="h-3.5 w-3.5" />
                    </div>
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
