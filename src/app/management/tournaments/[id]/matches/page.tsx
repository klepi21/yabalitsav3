'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  ArrowLeft,
  Swords,
  Calendar,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  Shield,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { blockedDateService } from '@/lib/firebase-services';
import {
  tournamentService,
  tournamentTeamService,
  tournamentMatchService,
  generateLeagueFixtures,
  generateKnockoutBracket,
  recalculateStandings,
  recalculatePlayerStats,
} from '@/lib/tournament-services';
import {
  Tournament,
  TournamentTeam,
  TournamentMatch,
} from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const matchStatusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Προγραμματισμένος', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  live: { label: 'Live', className: 'bg-red-50 text-red-700 border-red-200 animate-pulse' },
  completed: { label: 'Ολοκληρωμένος', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  postponed: { label: 'Αναβλήθηκε', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Ακυρώθηκε', className: 'bg-red-50 text-red-600 border-red-200' },
};

export default function MatchesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');

  // Score entry
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editHomeScore, setEditHomeScore] = useState('');
  const [editAwayScore, setEditAwayScore] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tournamentId = params.id as string;

  const loadData = useCallback(async () => {
    if (!tournamentId || !venueOwner) return;
    try {
      const [t, teamsData, matchesData] = await Promise.all([
        tournamentService.getById(tournamentId),
        tournamentTeamService.getByTournament(tournamentId),
        tournamentMatchService.getByTournament(tournamentId),
      ]);
      setTournament(t);
      setTeams(teamsData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, venueOwner]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadData();
  }, [user, venueOwner, authLoading, router, pathname, loadData]);

  const handleGenerateFixtures = async () => {
    if (!tournament || !venueOwner || teams.length < 2) return;
    setIsGenerating(true);
    try {
      const teamIds = teams.map(t => t.id);
      let fixtures: { round: number; homeTeamId: string; awayTeamId: string; roundLabel?: string }[];

      if (tournament.type === 'league' || tournament.type === 'group+knockout') {
        fixtures = generateLeagueFixtures(teamIds, tournament.legs);
      } else {
        fixtures = generateKnockoutBracket(teamIds);
      }

      // Create matches — spread across tournament dates
      const startDate = new Date(tournament.startDate);
      const endDate = new Date(tournament.endDate);
      const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const maxRound = Math.max(...fixtures.map(f => f.round));

      for (const fixture of fixtures) {
        // Distribute matches across date range proportionally by round
        const dayOffset = Math.floor(((fixture.round - 1) / maxRound) * totalDays);
        const matchDate = new Date(startDate);
        matchDate.setDate(matchDate.getDate() + dayOffset);

        const matchData: Omit<TournamentMatch, 'id' | 'createdAt' | 'updatedAt'> = {
          tournamentId: tournament.id,
          venueId: venueOwner.venueId,
          pitchId: tournament.pitchId,
          round: fixture.round,
          roundLabel: fixture.roundLabel || `Αγωνιστική ${fixture.round}`,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          scheduledDate: matchDate,
          scheduledTime: '20:00',
          status: 'scheduled',
          events: [],
        };

        const matchId = await tournamentMatchService.create(matchData);

        // Auto-create BlockedDate for pitch
        if (tournament.pitchId) {
          const homeTeam = teams.find(t => t.id === fixture.homeTeamId);
          const awayTeam = teams.find(t => t.id === fixture.awayTeamId);
          const endTime = new Date(matchDate);
          endTime.setMinutes(endTime.getMinutes() + tournament.matchDuration);

          const blockedDateId = await blockedDateService.create({
            pitchId: tournament.pitchId,
            venueId: venueOwner.venueId,
            startDate: matchDate,
            endDate: endTime,
            reason: `Τουρνουά: ${tournament.name} — ${homeTeam?.name || '?'} vs ${awayTeam?.name || '?'}`,
            isFullDay: false,
          });

          // Link blocked date to match
          await tournamentMatchService.update(matchId, { blockedDateId });
        }
      }

      await loadData();
    } catch (error) {
      console.error('Error generating fixtures:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (match: TournamentMatch) => {
    setEditingMatch(match.id);
    setEditHomeScore(match.homeScore?.toString() ?? '');
    setEditAwayScore(match.awayScore?.toString() ?? '');
  };

  const handleSaveScore = async () => {
    if (!editingMatch) return;
    setIsSaving(true);
    try {
      const homeScore = parseInt(editHomeScore) || 0;
      const awayScore = parseInt(editAwayScore) || 0;

      await tournamentMatchService.update(editingMatch, {
        homeScore,
        awayScore,
        status: 'completed',
      });

      // Recalculate standings and player stats
      await Promise.all([
        recalculateStandings(tournamentId),
        recalculatePlayerStats(tournamentId),
      ]);

      setEditingMatch(null);
      await loadData();
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    try {
      const match = matches.find(m => m.id === matchId);
      await tournamentMatchService.update(matchId, { status: 'cancelled' });

      // Delete linked blocked date
      if (match?.blockedDateId) {
        await blockedDateService.delete(match.blockedDateId);
      }

      await loadData();
    } catch (error) {
      console.error('Error cancelling match:', error);
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
          <Swords className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">Το τουρνουά δεν βρέθηκε</h3>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/management/tournaments">Επιστροφή</Link>
        </Button>
      </div>
    );
  }

  const teamMap = new Map(teams.map(t => [t.id, t]));
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const filteredMatches = filterRound === 'all'
    ? matches
    : matches.filter(m => m.round === filterRound);
  const sortedMatches = [...filteredMatches].sort((a, b) =>
    a.round - b.round || new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const completedCount = matches.filter(m => m.status === 'completed').length;
  const scheduledCount = matches.filter(m => m.status === 'scheduled' || m.status === 'live').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/management/tournaments/${tournament.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tournament.name}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Αγώνες</h1>
            <p className="text-sm text-zinc-500">{matches.length} αγώνες &middot; {completedCount} ολοκληρωμένοι</p>
          </div>
        </div>
        {matches.length === 0 && teams.length >= 2 && (
          <Button
            onClick={handleGenerateFixtures}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Δημιουργία...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Δημιουργία Αγώνων
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Προγραμματισμένοι</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{scheduledCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ολοκληρωμένοι</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Γκολ</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                {matches.filter(m => m.status === 'completed').reduce((s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Round Filter */}
      {rounds.length > 0 && (
        <div className="flex items-center gap-1 bg-zinc-100/80 rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setFilterRound('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              filterRound === 'all' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Όλοι
          </button>
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRound(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                filterRound === r ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Αγ. {r}
            </button>
          ))}
        </div>
      )}

      {/* Matches */}
      {matches.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
            <Swords className="h-6 w-6 text-zinc-300" />
          </div>
          <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν αγώνες</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {teams.length < 2
              ? 'Χρειάζονται τουλάχιστον 2 ομάδες για δημιουργία αγώνων.'
              : 'Πατήστε "Δημιουργία Αγώνων" για αυτόματη κλήρωση.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMatches.map((match) => {
            const home = teamMap.get(match.homeTeamId);
            const away = teamMap.get(match.awayTeamId);
            const ms = matchStatusConfig[match.status] || matchStatusConfig.scheduled;
            const isEditing = editingMatch === match.id;
            const isCompleted = match.status === 'completed';
            const isScheduled = match.status === 'scheduled';

            return (
              <div
                key={match.id}
                className={`rounded-xl border bg-white p-5 transition-all ${
                  isEditing ? 'border-emerald-200 shadow-sm' : 'border-zinc-100/60'
                }`}
              >
                {/* Round & date header */}
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                  <span className="font-medium">{match.roundLabel || `Αγωνιστική ${match.round}`}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(match.scheduledDate).toLocaleDateString('el-GR')} &middot; {match.scheduledTime}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${ms.className}`}>
                      {ms.label}
                    </span>
                  </div>
                </div>

                {/* Match body */}
                <div className="flex items-center">
                  {/* Home */}
                  <div className="flex-1 flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${isCompleted && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                      {home?.name || '—'}
                    </span>
                  </div>

                  {/* Score */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 mx-4">
                      <Input
                        type="number"
                        min={0}
                        value={editHomeScore}
                        onChange={(e) => setEditHomeScore(e.target.value)}
                        className="w-14 h-10 text-center text-lg font-bold bg-white rounded-lg border-zinc-300"
                      />
                      <span className="text-zinc-300 font-bold">-</span>
                      <Input
                        type="number"
                        min={0}
                        value={editAwayScore}
                        onChange={(e) => setEditAwayScore(e.target.value)}
                        className="w-14 h-10 text-center text-lg font-bold bg-white rounded-lg border-zinc-300"
                      />
                    </div>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-2 mx-4">
                      <span className="text-xl font-bold text-zinc-900">{match.homeScore}</span>
                      <span className="text-zinc-300">-</span>
                      <span className="text-xl font-bold text-zinc-900">{match.awayScore}</span>
                    </div>
                  ) : (
                    <span className="mx-4 text-xs text-zinc-400 font-medium">vs</span>
                  )}

                  {/* Away */}
                  <div className="flex-1 flex items-center justify-end gap-2.5">
                    <span className={`text-sm text-right ${isCompleted && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                      {away?.name || '—'}
                    </span>
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500">
                      <Shield className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-zinc-100">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingMatch(null)}
                        className="rounded-lg text-xs"
                      >
                        <X className="h-3 w-3" />
                        Ακύρωση
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveScore}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Αποθήκευση
                      </Button>
                    </>
                  ) : (
                    <>
                      {isScheduled && (
                        <Button
                          size="sm"
                          onClick={() => startEditing(match)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                        >
                          <Target className="h-3 w-3" />
                          Καταχώρηση Σκορ
                        </Button>
                      )}
                      {isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(match)}
                          className="rounded-lg text-xs border-zinc-200"
                        >
                          Επεξεργασία Σκορ
                        </Button>
                      )}
                      {isScheduled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelMatch(match.id)}
                          className="rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3" />
                          Ακύρωση
                        </Button>
                      )}
                    </>
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
