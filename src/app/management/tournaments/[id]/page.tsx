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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/management/tournaments"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Τουρνουά
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{tournament.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${status.className}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-zinc-500">{typeLabels[tournament.type]}</span>
              <span className="text-xs text-zinc-300">|</span>
              <span className="text-sm text-zinc-500">{tournament.pitchType}</span>
              <span className="text-xs text-zinc-300">|</span>
              <span className="text-sm text-zinc-500">
                {new Date(tournament.startDate).toLocaleDateString('el-GR')} - {new Date(tournament.endDate).toLocaleDateString('el-GR')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tournament.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('registration')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
            >
              Άνοιγμα Εγγραφών
            </Button>
          )}
          {tournament.status === 'registration' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('active')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
            >
              Εκκίνηση
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="rounded-lg border-zinc-200">
            <Link href={`/management/tournaments/${tournament.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Επεξεργασία
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="rounded-lg border-zinc-200">
            <Link href={`/management/tournaments/${tournament.id}/teams`}>
              <Users className="h-3.5 w-3.5" />
              Ομάδες
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-zinc-900">Διαγραφή Τουρνουά</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-500">
                  Θα διαγραφούν όλες οι ομάδες, παίκτες και αγώνες. Αυτή η ενέργεια δεν αναιρείται.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Ακύρωση</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting} className="rounded-lg">
                  {isDeleting ? 'Διαγραφή...' : 'Διαγραφή'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ομάδες</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{teams.length}/{tournament.maxTeams}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Παίκτες</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{players.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600">
              <Swords className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Αγώνες</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{matches.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 text-violet-600">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Γκολ</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                {matches.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100/80 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mini Standings */}
          {(tournament.type === 'league' || tournament.type === 'group+knockout') && standings.length > 0 && (
            <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-zinc-900">Βαθμολογία</h2>
                </div>
                <button onClick={() => setActiveTab('standings')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                  Πλήρης <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">#</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Ομάδα</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-zinc-500">Αγ</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-zinc-500">ΔΤ</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-zinc-500 w-14">Βαθ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {standings.slice(0, 5).map((team, idx) => (
                      <tr key={team.id} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                            idx === 1 ? 'bg-zinc-200 text-zinc-600' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'text-zinc-400'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-zinc-900">{team.name}</td>
                        <td className="py-2 px-3 text-center text-zinc-500">{team.stats.played}</td>
                        <td className="py-2 px-3 text-center text-zinc-500">
                          {(team.stats.goalsFor - team.stats.goalsAgainst) >= 0 ? '+' : ''}
                          {team.stats.goalsFor - team.stats.goalsAgainst}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold text-zinc-900">{team.stats.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upcoming Matches */}
          <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold tracking-tight text-zinc-900">Επόμενοι Αγώνες</h2>
              </div>
              <button onClick={() => setActiveTab('matches')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                Όλοι <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-10 w-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-2">
                  <Swords className="h-5 w-5 text-zinc-300" />
                </div>
                <p className="text-sm text-zinc-400">Δεν υπάρχουν προγραμματισμένοι αγώνες</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingMatches.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const ms = matchStatusConfig[match.status] || matchStatusConfig.scheduled;
                  return (
                    <div key={match.id} className="rounded-lg border border-zinc-100 p-3.5">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                        <span>{match.roundLabel || `Αγωνιστική ${match.round}`}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ms.className}`}>
                          {ms.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-900">{home?.name || '—'}</span>
                        <span className="text-xs text-zinc-400 mx-2">vs</span>
                        <span className="text-sm font-medium text-zinc-900 text-right">{away?.name || '—'}</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1.5">
                        {new Date(match.scheduledDate).toLocaleDateString('el-GR')} &middot; {match.scheduledTime}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Results */}
          {recentMatches.length > 0 && (
            <div className="rounded-xl border border-zinc-100/60 bg-white p-6 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600">
                  <Swords className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold tracking-tight text-zinc-900">Πρόσφατα Αποτελέσματα</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recentMatches.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
                  const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0);
                  return (
                    <div key={match.id} className="rounded-lg border border-zinc-100 p-3.5">
                      <div className="text-xs text-zinc-400 mb-2">{match.roundLabel || `Αγωνιστική ${match.round}`}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${homeWon ? 'font-bold text-zinc-900' : 'text-zinc-600'}`}>
                          {home?.name || '—'}
                        </span>
                        <div className="flex items-center gap-1.5 mx-2">
                          <span className={`text-sm font-bold ${homeWon ? 'text-emerald-600' : 'text-zinc-900'}`}>
                            {match.homeScore ?? 0}
                          </span>
                          <span className="text-xs text-zinc-300">-</span>
                          <span className={`text-sm font-bold ${awayWon ? 'text-emerald-600' : 'text-zinc-900'}`}>
                            {match.awayScore ?? 0}
                          </span>
                        </div>
                        <span className={`text-sm text-right ${awayWon ? 'font-bold text-zinc-900' : 'text-zinc-600'}`}>
                          {away?.name || '—'}
                        </span>
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
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Βαθμολογία</h2>
          </div>

          {standings.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
                <BarChart3 className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν ομάδες</h3>
              <p className="mt-1 text-sm text-zinc-400">Προσθέστε ομάδες για να εμφανιστεί η βαθμολογία.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-zinc-200">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-10">#</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ομάδα</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-10">ΑΓ</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-10">Ν</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-10">Ι</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-10">Η</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-12">ΥΠ</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-12">ΚΑ</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-12">ΔΤ</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-14">ΒΑΘ</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, idx) => {
                    const gd = team.stats.goalsFor - team.stats.goalsAgainst;
                    const posStyle = idx === 0
                      ? 'bg-amber-400 text-white'
                      : idx === 1
                      ? 'bg-zinc-400 text-white'
                      : idx === 2
                      ? 'bg-orange-400 text-white'
                      : 'bg-zinc-100 text-zinc-500';

                    return (
                      <tr
                        key={team.id}
                        className={`border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors ${
                          idx === 0 ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${posStyle}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-zinc-900">{team.name}</span>
                        </td>
                        <td className="py-3 px-2 text-center text-zinc-600">{team.stats.played}</td>
                        <td className="py-3 px-2 text-center text-emerald-600 font-medium">{team.stats.won}</td>
                        <td className="py-3 px-2 text-center text-zinc-500">{team.stats.drawn}</td>
                        <td className="py-3 px-2 text-center text-red-500 font-medium">{team.stats.lost}</td>
                        <td className="py-3 px-2 text-center text-zinc-600">{team.stats.goalsFor}</td>
                        <td className="py-3 px-2 text-center text-zinc-600">{team.stats.goalsAgainst}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-medium ${gd > 0 ? 'text-emerald-600' : gd < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                            {gd > 0 ? '+' : ''}{gd}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-7 rounded-md bg-zinc-900 text-white text-sm font-bold">
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
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
                <Swords className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Αγώνες</h2>
            </div>
            <Link
              href={`/management/tournaments/${tournament.id}/matches`}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Διαχείριση <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
                <Swords className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν αγώνες</h3>
              <p className="mt-1 text-sm text-zinc-400">Οι αγώνες θα δημιουργηθούν αφού ξεκινήσει το τουρνουά.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...matches]
                .sort((a, b) => a.round - b.round || new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                .map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const ms = matchStatusConfig[match.status] || matchStatusConfig.scheduled;
                  const isCompleted = match.status === 'completed';

                  return (
                    <div key={match.id} className="rounded-lg border border-zinc-100 p-4 hover:bg-zinc-50/50 transition-colors">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
                        <span>{match.roundLabel || `Αγωνιστική ${match.round}`}</span>
                        <div className="flex items-center gap-2">
                          <span>{new Date(match.scheduledDate).toLocaleDateString('el-GR')} &middot; {match.scheduledTime}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ms.className}`}>
                            {ms.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`flex-1 text-sm ${isCompleted && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                          {home?.name || '—'}
                        </span>
                        {isCompleted ? (
                          <div className="flex items-center gap-2 mx-4">
                            <span className="text-lg font-bold text-zinc-900">{match.homeScore}</span>
                            <span className="text-xs text-zinc-300">-</span>
                            <span className="text-lg font-bold text-zinc-900">{match.awayScore}</span>
                          </div>
                        ) : (
                          <span className="mx-4 text-xs text-zinc-400">vs</span>
                        )}
                        <span className={`flex-1 text-sm text-right ${isCompleted && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                          {away?.name || '—'}
                        </span>
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
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
                <Shield className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Ομάδες</h2>
            </div>
            <Link
              href={`/management/tournaments/${tournament.id}/teams`}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="h-3 w-3" />
              Διαχείριση Ομάδων
            </Link>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν ομάδες</h3>
              <p className="mt-1 text-sm text-zinc-400">Προσθέστε ομάδες στο τουρνουά.</p>
              <Button asChild size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                <Link href={`/management/tournaments/${tournament.id}/teams`}>
                  <Plus className="h-3.5 w-3.5" />
                  Προσθήκη Ομάδων
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {teams.map((team) => {
                const teamPlayers = players.filter(p => p.teamId === team.id);
                return (
                  <Link
                    key={team.id}
                    href={`/management/tournaments/${tournament.id}/teams/${team.id}`}
                    className="rounded-lg border border-zinc-100 p-4 hover:shadow-sm transition-all duration-150 block"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">{team.name}</h3>
                          <p className="text-xs text-zinc-400">{team.captainName} &middot; {teamPlayers.length} παίκτες</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Scorers */}
          <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600">
                <Target className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Σκόρερ</h2>
            </div>
            {topScorers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">Δεν υπάρχουν ακόμα γκολ</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">#</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Παίκτης</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Ομάδα</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-zinc-500">Γκολ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {topScorers.map((player, idx) => {
                      const team = teamMap.get(player.teamId);
                      return (
                        <tr key={player.id} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3">
                            {idx < 3 ? (
                              <Medal className={`h-4 w-4 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-zinc-400' : 'text-orange-400'}`} />
                            ) : (
                              <span className="text-xs text-zinc-400">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-zinc-900">{player.name}</td>
                          <td className="py-2 px-3 text-zinc-500">{team?.name || '—'}</td>
                          <td className="py-2 px-3 text-center font-bold text-zinc-900">{player.stats.goals}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Assists */}
          <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Ασίστ</h2>
            </div>
            {topAssists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">Δεν υπάρχουν ακόμα ασίστ</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">#</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Παίκτης</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Ομάδα</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-zinc-500">Ασίστ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {topAssists.map((player, idx) => {
                      const team = teamMap.get(player.teamId);
                      return (
                        <tr key={player.id} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3">
                            {idx < 3 ? (
                              <Medal className={`h-4 w-4 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-zinc-400' : 'text-orange-400'}`} />
                            ) : (
                              <span className="text-xs text-zinc-400">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-zinc-900">{player.name}</td>
                          <td className="py-2 px-3 text-zinc-500">{team?.name || '—'}</td>
                          <td className="py-2 px-3 text-center font-bold text-zinc-900">{player.stats.assists}</td>
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
