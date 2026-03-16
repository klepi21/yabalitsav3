'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  ArrowLeft,
  Users,
  Swords,
  Calendar,
  BarChart3,
  Plus,
  Trash2,
  ChevronRight,
  Medal,
  Target,
  Shield,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  tournamentService,
  tournamentTeamService,
  tournamentMatchService,
  tournamentPlayerService,
} from '@/lib/tournament-services';
import { Tournament, TournamentTeam, TournamentMatch, TournamentPlayer } from '@/types/tournament';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const matchStatusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Προγραμματισμένος', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  live: { label: 'Live', className: 'bg-red-50 text-red-700 border-red-200' },
  completed: { label: 'Ολοκληρωμένος', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  postponed: { label: 'Αναβλήθηκε', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Ακυρώθηκε', className: 'bg-red-50 text-red-600 border-red-200' },
};

export default function TournamentDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'standings' | 'matches' | 'teams' | 'stats'>('overview');

  const loadData = useCallback(async () => {
    const id = params.id as string;
    if (!id) return;
    try {
      const [t, teamsData, matchesData, playersData] = await Promise.all([
        tournamentService.getById(id),
        tournamentTeamService.getByTournament(id),
        tournamentMatchService.getByTournament(id),
        tournamentPlayerService.getByTournament(id),
      ]);
      setTournament(t);
      setTeams(teamsData);
      setMatches(matchesData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadData();
  }, [user, venueOwner, authLoading, router, pathname, loadData]);

  const handleDelete = async () => {
    if (!tournament) return;
    setIsDeleting(true);
    try {
      // Delete all related data
      for (const player of players) await tournamentPlayerService.delete(player.id);
      for (const match of matches) await tournamentMatchService.delete(match.id);
      for (const team of teams) await tournamentTeamService.delete(team.id);
      await tournamentService.delete(tournament.id);
      router.push('/management/tournaments');
    } catch (error) {
      console.error('Error deleting tournament:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: Tournament['status']) => {
    if (!tournament) return;
    try {
      await tournamentService.update(tournament.id, { status: newStatus });
      setTournament({ ...tournament, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <Trophy className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">Το τουρνουά δεν βρέθηκε</h3>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/management/tournaments">Επιστροφή</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[tournament.status] || statusConfig.draft;

  // Standings sorted by points, GD, GF
  const standings = [...teams].sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
    const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.stats.goalsFor - a.stats.goalsFor;
  });

  // Top scorers
  const topScorers = [...players]
    .filter(p => p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals)
    .slice(0, 10);

  // Top assists
  const topAssists = [...players]
    .filter(p => p.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, 10);

  // Recent & upcoming matches
  const recentMatches = [...matches]
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .slice(0, 5);

  const upcomingMatches = [...matches]
    .filter(m => m.status === 'scheduled' || m.status === 'live')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  const teamMap = new Map(teams.map(t => [t.id, t]));

  const tabs = [
    { id: 'overview' as const, label: 'Επισκόπηση', icon: Trophy },
    { id: 'standings' as const, label: 'Βαθμολογία', icon: BarChart3 },
    { id: 'matches' as const, label: 'Αγώνες', icon: Swords },
    { id: 'teams' as const, label: 'Ομάδες', icon: Shield },
    { id: 'stats' as const, label: 'Στατιστικά', icon: Target },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Back */}
      <Link
        href="/management/tournaments"
        className="group inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-all"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Επιστροφή στα Τουρνουά
      </Link>

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-[2rem] bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner group-hover:scale-110 transition-transform">
            <Trophy className="h-10 w-10" />
          </div>
          <div>
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <h1 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">
                {tournament.name}
              </h1>
              <Badge className={cn("rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none shadow-sm", status.className)}>
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-xl text-xs font-black text-zinc-500 uppercase tracking-tight">
                <Medal className="h-3.5 w-3.5" />
                {typeLabels[tournament.type]}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-xl text-xs font-black text-zinc-500 uppercase tracking-tight">
                <Target className="h-3.5 w-3.5" />
                {tournament.pitchType}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-xl text-xs font-black text-zinc-500 uppercase tracking-tight">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(tournament.startDate).toLocaleDateString('el-GR')} - {new Date(tournament.endDate).toLocaleDateString('el-GR')}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {tournament.status === 'draft' && (
            <Button
              onClick={() => handleStatusChange('registration')}
              className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-100 transition-all hover:translate-y-[-2px]"
            >
              Άνοιγμα Εγγραφών
            </Button>
          )}
          {tournament.status === 'registration' && (
            <Button
              onClick={() => handleStatusChange('active')}
              className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-100 transition-all hover:translate-y-[-2px]"
            >
              Εκκίνηση Τουρνουά
            </Button>
          )}
          
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
            <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-xl text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-all" title="Επεξεργασία">
              <Link href={`/management/tournaments/${tournament.id}/edit`}>
                <Pencil className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-xl text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all" title="Ομάδες">
              <Link href={`/management/tournaments/${tournament.id}/teams`}>
                <Users className="h-5 w-5" />
              </Link>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-all" title="Διαγραφή">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-10 max-w-md">
                <div className="text-center">
                  <div className="mx-auto h-20 w-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center mb-6">
                    <Trash2 className="h-10 w-10 text-red-500" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή Τουρνουά</AlertDialogTitle>
                    <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-2">
                      Θα διαγραφούν όλες οι ομάδες, παίκτες και αγώνες. 
                      <br /><span className="font-black text-red-600">Αυτή η ενέργεια δεν αναιρείται.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <AlertDialogCancel className="h-14 rounded-2xl border-zinc-100 font-bold text-zinc-500 flex-1 m-0">Ακύρωση</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black flex-1 m-0">
                      {isDeleting ? 'Διαγραφή...' : 'Διαγραφή'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ομάδες', value: `${teams.length}/${tournament.maxTeams}`, icon: Shield, color: 'blue' },
          { label: 'Παίκτες', value: players.length, icon: Users, color: 'emerald' },
          { label: 'Αγώνες', value: matches.length, icon: Swords, color: 'amber' },
          { label: 'Σύνολο Γκολ', value: matches.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0), icon: Target, color: 'violet' },
        ].map((stat) => {
          const Icon = stat.icon;
          const colorStyles: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600 shadow-blue-100',
            emerald: 'bg-emerald-50 text-emerald-600 shadow-emerald-100',
            amber: 'bg-amber-50 text-amber-600 shadow-amber-100',
            violet: 'bg-violet-50 text-violet-600 shadow-violet-100',
          };
          return (
            <div key={stat.label} className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm transition-all hover:shadow-xl group">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6 shadow-md transition-transform group-hover:scale-110", colorStyles[stat.color])}>
                <Icon className="h-7 w-7" />
              </div>
              <p className="text-3xl font-black text-zinc-900 leading-none mb-2">{stat.value}</p>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white p-2 rounded-[2rem] border border-zinc-100 shadow-sm inline-flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all whitespace-nowrap",
                isActive
                  ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200 scale-[1.02]"
                  : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-zinc-300")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Mini Standings */}
          {(tournament.type === 'league' || tournament.type === 'group+knockout') && standings.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Βαθμολογία</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('standings')} className="font-black text-[10px] uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                  Πλήρης Πίνακας <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="overflow-hidden rounded-3xl border border-zinc-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">#</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Ομάδα</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Αγ</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">ΔΤ</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Βαθ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {standings.slice(0, 5).map((team, idx) => (
                      <tr key={team.id} className="group hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black shadow-sm",
                            idx === 0 ? "bg-amber-100 text-amber-600" :
                            idx === 1 ? "bg-zinc-100 text-zinc-500" :
                            idx === 2 ? "bg-orange-50 text-orange-600" :
                            "bg-white text-zinc-300 border border-zinc-100"
                          )}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-zinc-900 uppercase group-hover:text-emerald-600 transition-colors">{team.name}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold text-zinc-500">{team.stats.played}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "text-sm font-bold",
                            (team.stats.goalsFor - team.stats.goalsAgainst) > 0 ? "text-emerald-600" :
                            (team.stats.goalsFor - team.stats.goalsAgainst) < 0 ? "text-red-600" :
                            "text-zinc-400"
                          )}>
                            {(team.stats.goalsFor - team.stats.goalsAgainst) > 0 ? '+' : ''}
                            {team.stats.goalsFor - team.stats.goalsAgainst}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-zinc-900">{team.stats.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upcoming Matches */}
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Επόμενοι Αγώνες</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('matches')} className="font-black text-[10px] uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                Πρόγραμμα <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                <Swords className="h-12 w-12 text-zinc-200 mb-4" />
                <p className="text-sm font-bold text-zinc-400">Δεν υπάρχουν προγραμματισμένοι αγώνες</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const ms = matchStatusConfig[match.status] || matchStatusConfig.scheduled;
                  return (
                    <div key={match.id} className="group p-6 rounded-3xl border border-zinc-50 bg-zinc-50/30 hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {match.roundLabel || `Αγωνιστική ${match.round}`}
                        </span>
                        <Badge className={cn("px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border-none", ms.className)}>
                          {ms.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <span className="text-sm font-black text-zinc-900 uppercase truncate">{home?.name || '—'}</span>
                        <div className="flex flex-col items-center gap-1">
                          <span className="h-1px w-12 bg-zinc-200" />
                          <span className="text-[10px] font-black text-zinc-300">VS</span>
                          <span className="h-1px w-12 bg-zinc-200" />
                        </div>
                        <span className="text-sm font-black text-zinc-900 uppercase truncate text-right">{away?.name || '—'}</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-center gap-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(match.scheduledDate).toLocaleDateString('el-GR')}
                        </div>
                        <div className="h-1 w-1 rounded-full bg-zinc-200" />
                        <div>{match.scheduledTime}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Results */}
          {recentMatches.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8 lg:col-span-2">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Swords className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Πρόσφατα Αποτελέσματα</h2>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {recentMatches.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
                  const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0);
                  return (
                    <div key={match.id} className="p-6 rounded-3xl border border-zinc-100 hover:shadow-lg transition-all duration-300">
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4 text-center">
                        {match.roundLabel || `Αγωνιστική ${match.round}`}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 flex flex-col items-center gap-2 overflow-hidden">
                          <span className={cn(
                            "text-sm font-black uppercase truncate w-full text-center transition-colors",
                            homeWon ? "text-emerald-700" : "text-zinc-500"
                          )}>
                            {home?.name || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-2xl">
                          <span className={cn("text-2xl font-black", homeWon ? "text-emerald-600" : "text-zinc-900")}>
                            {match.homeScore ?? 0}
                          </span>
                          <span className="text-zinc-200 font-black">-</span>
                          <span className={cn("text-2xl font-black", awayWon ? "text-emerald-600" : "text-zinc-900")}>
                            {match.awayScore ?? 0}
                          </span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-2 overflow-hidden">
                          <span className={cn(
                            "text-sm font-black uppercase truncate w-full text-center transition-colors",
                            awayWon ? "text-emerald-700" : "text-zinc-500"
                          )}>
                            {away?.name || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STANDINGS ─── */}
      {activeTab === 'standings' && (
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Πλήρης Βαθμολογία</h2>
          </div>

          {standings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
              <BarChart3 className="h-16 w-16 text-zinc-200 mb-6" />
              <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν υπάρχουν ακόμα δεδομένα</h3>
              <p className="text-lg font-medium text-zinc-400">Προσθέστε ομάδες και καταχωρήστε αγώνες για να δείτε τη βαθμολογία.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[2rem] border border-zinc-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">#</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Ομάδα</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">ΑΓ</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Ν</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Ι</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Η</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">ΥΠ</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">ΚΑ</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">ΔΤ</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">ΒΑΘ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {standings.map((team, idx) => {
                    const gd = team.stats.goalsFor - team.stats.goalsAgainst;
                    return (
                      <tr key={team.id} className={cn(
                        "group transition-all hover:bg-zinc-50/50",
                        idx === 0 ? "bg-emerald-50/10" : ""
                      )}>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black shadow-sm",
                            idx === 0 ? "bg-amber-100 text-amber-600 shadow-amber-100" :
                            idx === 1 ? "bg-zinc-100 text-zinc-500 shadow-zinc-100" :
                            idx === 2 ? "bg-orange-50 text-orange-600 shadow-orange-100" :
                            "bg-white text-zinc-300 border border-zinc-100"
                          )}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-zinc-900 uppercase group-hover:text-emerald-600 transition-colors">
                              {team.name}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                              {team.captainName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center text-sm font-bold text-zinc-500">{team.stats.played}</td>
                        <td className="px-4 py-5 text-center text-sm font-black text-emerald-600">{team.stats.won}</td>
                        <td className="px-4 py-5 text-center text-sm font-bold text-zinc-400">{team.stats.drawn}</td>
                        <td className="px-4 py-5 text-center text-sm font-black text-red-500">{team.stats.lost}</td>
                        <td className="px-4 py-5 text-center text-sm font-bold text-zinc-500">{team.stats.goalsFor}</td>
                        <td className="px-4 py-5 text-center text-sm font-bold text-zinc-500">{team.stats.goalsAgainst}</td>
                        <td className="px-4 py-5 text-center">
                          <Badge className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] font-black border-none",
                            gd > 0 ? "bg-emerald-100 text-emerald-700" :
                            gd < 0 ? "bg-red-100 text-red-700" :
                            "bg-zinc-100 text-zinc-500"
                          )}>
                            {gd > 0 ? '+' : ''}{gd}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-900 text-white text-lg font-black shadow-lg shadow-zinc-200">
                            {team.stats.points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── MATCHES ─── */}
      {activeTab === 'matches' && (
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Swords className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Πρόγραμμα Αγώνων</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="font-black text-[10px] uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              <Link href={`/management/tournaments/${tournament.id}/matches`}>
                Διαχείριση <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
              <Swords className="h-16 w-16 text-zinc-200 mb-6" />
              <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν υπάρχουν αγώνες</h3>
              <p className="text-lg font-medium text-zinc-400">Οι αγώνες θα δημιουργηθούν αυτόματα μόλις ξεκινήσει το τουρνουά.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...matches]
                .sort((a, b) => a.round - b.round || new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                .map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const ms = matchStatusConfig[match.status] || matchStatusConfig.scheduled;
                  const isCompleted = match.status === 'completed';

                  return (
                    <div key={match.id} className="group p-6 rounded-3xl border border-zinc-100 hover:bg-white hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {match.roundLabel || `Αγωνιστική ${match.round}`}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                            {new Date(match.scheduledDate).toLocaleDateString('el-GR')} &middot; {match.scheduledTime}
                          </span>
                          <Badge className={cn("px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border-none", ms.className)}>
                            {ms.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-8">
                        <div className="flex-1 text-right">
                          <span className={cn(
                            "text-lg font-black uppercase transition-colors",
                            isCompleted && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "text-emerald-700" : "text-zinc-900"
                          )}>
                            {home?.name || '—'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 bg-zinc-50 px-8 py-4 rounded-[1.5rem] min-w-[160px] justify-center shadow-inner group-hover:bg-emerald-50 transition-colors">
                          {isCompleted ? (
                            <>
                              <span className="text-3xl font-black text-zinc-900">{match.homeScore}</span>
                              <span className="text-zinc-300 font-black">-</span>
                              <span className="text-3xl font-black text-zinc-900">{match.awayScore}</span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-zinc-300 uppercase tracking-widest">VS</span>
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          <span className={cn(
                            "text-lg font-black uppercase transition-colors",
                            isCompleted && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "text-emerald-700" : "text-zinc-900"
                          )}>
                            {away?.name || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── TEAMS ─── */}
      {activeTab === 'teams' && (
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Shield className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Ομάδες Τουρνουά</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="font-black text-[10px] uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              <Link href={`/management/tournaments/${tournament.id}/teams`}>
                <Plus className="h-4 w-4 mr-1" /> Διαχείριση
              </Link>
            </Button>
          </div>

          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
              <Shield className="h-16 w-16 text-zinc-200 mb-6" />
              <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν υπάρχουν ομάδες</h3>
              <p className="text-lg font-medium text-zinc-400 mb-8">Ξεκινήστε προσθέτοντας τις συμμετέχουσες ομάδες.</p>
              <Button asChild className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-100">
                <Link href={`/management/tournaments/${tournament.id}/teams`}>
                  <Plus className="h-5 w-5 mr-2" /> Προσθήκη Ομάδων
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => {
                const teamPlayers = players.filter(p => p.teamId === team.id);
                return (
                  <Link
                    key={team.id}
                    href={`/management/tournaments/${tournament.id}/teams/${team.id}`}
                    className="group relative p-6 rounded-3xl border border-zinc-100 bg-white hover:shadow-xl hover:border-emerald-200 transition-all duration-300 block overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-all">
                        <Shield className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {team.captainName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Ρόστερ</p>
                        <p className="text-sm font-bold text-zinc-900">{teamPlayers.length} Καταχωρημένοι</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── STATS ─── */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Top Scorers */}
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Πρώτοι Σκόρερ</h2>
            </div>

            {topScorers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                <Target className="h-12 w-12 text-zinc-200 mb-4" />
                <p className="text-sm font-bold text-zinc-400">Δεν υπάρχουν ακόμα γκολ</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[2rem] border border-zinc-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Κατάταξη</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Παίκτης</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Γκολ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {topScorers.map((player, idx) => {
                      const team = teamMap.get(player.teamId);
                      return (
                        <tr key={player.id} className="group hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            {idx < 3 ? (
                              <div className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center shadow-sm",
                                idx === 0 ? "bg-amber-100 text-amber-600" :
                                idx === 1 ? "bg-zinc-100 text-zinc-400" :
                                "bg-orange-50 text-orange-600"
                              )}>
                                <Medal className="h-4 w-4" />
                              </div>
                            ) : (
                              <span className="text-xs font-black text-zinc-300 ml-3">{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-zinc-900 uppercase group-hover:text-amber-600 transition-colors">
                                {player.name}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                                {team?.name || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 text-lg font-black">
                              {player.stats.goals}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Assists */}
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Κορυφαίοι σε Ασίστ</h2>
            </div>

            {topAssists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                <Users className="h-12 w-12 text-zinc-200 mb-4" />
                <p className="text-sm font-bold text-zinc-400">Δεν υπάρχουν ακόμα ασίστ</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[2rem] border border-zinc-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Κατάταξη</th>
                      <th className="px-6 py-4 text-[10px) font-black uppercase tracking-widest text-zinc-400">Παίκτης</th>
                      <th className="px-6 py-4 text-[10px) font-black uppercase tracking-widest text-zinc-400 text-center">Ασίστ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {topAssists.map((player, idx) => {
                      const team = teamMap.get(player.teamId);
                      return (
                        <tr key={player.id} className="group hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            {idx < 3 ? (
                              <div className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center shadow-sm",
                                idx === 0 ? "bg-emerald-100 text-emerald-600" :
                                idx === 1 ? "bg-zinc-100 text-zinc-400" :
                                "bg-emerald-50 text-emerald-600"
                              )}>
                                <Medal className="h-4 w-4" />
                              </div>
                            ) : (
                              <span className="text-xs font-black text-zinc-300 ml-3">{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-zinc-900 uppercase group-hover:text-emerald-600 transition-colors">
                                {player.name}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                                {team?.name || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 text-lg font-black">
                              {player.stats.assists}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
