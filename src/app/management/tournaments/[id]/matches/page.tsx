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
  Plus,
  Send,
  Pencil,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const matchStatusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Προγραμματισμένος', className: 'bg-blue-50 text-blue-700 border-none' },
  live: { label: 'Live', className: 'bg-red-50 text-red-700 border-none animate-pulse' },
  completed: { label: 'Ολοκληρωμένος', className: 'bg-emerald-50 text-emerald-700 border-none' },
  postponed: { label: 'Αναβλήθηκε', className: 'bg-amber-50 text-amber-700 border-none' },
  cancelled: { label: 'Ακυρώθηκε', className: 'bg-red-50 text-red-600 border-none' },
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

  // Match detail edit dialog
  const [editDetailMatch, setEditDetailMatch] = useState<TournamentMatch | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRound, setEditRound] = useState(1);
  const [editRoundLabel, setEditRoundLabel] = useState('');
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  // New match form
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newRound, setNewRound] = useState(1);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('20:00');
  const [isCreating, setIsCreating] = useState(false);

  // Notify captains
  const [notifyingMatch, setNotifyingMatch] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [notifyConfirm, setNotifyConfirm] = useState<TournamentMatch | null>(null);

  const tournamentId = params.id as string;
  const teamMap = new Map(teams.map(t => [t.id, t]));

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

  const startEditingDetail = (match: TournamentMatch) => {
    setEditDetailMatch(match);
    const dateStr = match.scheduledDate instanceof Date
      ? match.scheduledDate.toISOString().split('T')[0]
      : new Date(match.scheduledDate).toISOString().split('T')[0];
    setEditDate(dateStr);
    setEditTime(match.scheduledTime || '20:00');
    setEditRound(match.round);
    setEditRoundLabel(match.roundLabel || `Αγωνιστική ${match.round}`);
  };

  const handleSaveDetail = async () => {
    if (!editDetailMatch || !editDate) return;
    setIsSavingDetail(true);
    try {
      await tournamentMatchService.update(editDetailMatch.id, {
        scheduledDate: new Date(editDate),
        scheduledTime: editTime,
        round: editRound,
        roundLabel: editRoundLabel || `Αγωνιστική ${editRound}`,
      });
      setEditDetailMatch(null);
      await loadData();
    } catch (error) {
      console.error('Error saving match details:', error);
    } finally {
      setIsSavingDetail(false);
    }
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

  const handleCreateMatch = async () => {
    if (!tournament || !venueOwner || !newHomeTeam || !newAwayTeam || !newDate) return;
    if (newHomeTeam === newAwayTeam) return;
    setIsCreating(true);
    try {
      const matchData: Omit<TournamentMatch, 'id' | 'createdAt' | 'updatedAt'> = {
        tournamentId: tournament.id,
        venueId: venueOwner.venueId,
        pitchId: tournament.pitchId,
        round: newRound,
        roundLabel: `Αγωνιστική ${newRound}`,
        homeTeamId: newHomeTeam,
        awayTeamId: newAwayTeam,
        scheduledDate: new Date(newDate),
        scheduledTime: newTime,
        status: 'scheduled',
        events: [],
      };

      const matchId = await tournamentMatchService.create(matchData);

      // Auto-create BlockedDate for pitch
      if (tournament.pitchId) {
        const home = teams.find(t => t.id === newHomeTeam);
        const away = teams.find(t => t.id === newAwayTeam);
        const matchDate = new Date(newDate);
        const endTime = new Date(matchDate);
        endTime.setMinutes(endTime.getMinutes() + tournament.matchDuration);

        const blockedDateId = await blockedDateService.create({
          pitchId: tournament.pitchId,
          venueId: venueOwner.venueId,
          startDate: matchDate,
          endDate: endTime,
          reason: `Τουρνουά: ${tournament.name} — ${home?.name || '?'} vs ${away?.name || '?'}`,
          isFullDay: false,
        });

        await tournamentMatchService.update(matchId, { blockedDateId });
      }

      // Reset form
      setShowNewMatch(false);
      setNewHomeTeam('');
      setNewAwayTeam('');
      setNewDate('');
      setNewTime('20:00');
      await loadData();
    } catch (error) {
      console.error('Error creating match:', error);
    } finally {
      setIsCreating(false);
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

  const handleNotifyCaptains = async (match: TournamentMatch) => {
    const home = teamMap.get(match.homeTeamId);
    const away = teamMap.get(match.awayTeamId);
    if (!home || !away || !tournament) return;

    setNotifyingMatch(match.id);
    try {
      const isCompleted = match.status === 'completed';
      const matchDate = new Date(match.scheduledDate).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });

      const captains = [
        { email: home.captainEmail, name: home.captainName, team: home.name, opponent: away.name },
        { email: away.captainEmail, name: away.captainName, team: away.name, opponent: home.name },
      ].filter((c) => c.email);

      const token = await user?.getIdToken();
      for (const captain of captains) {
        await fetch('/api/tournament/notify-captain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            captainEmail: captain.email,
            captainName: captain.name,
            teamName: captain.team,
            opponentName: captain.opponent,
            matchDate,
            matchTime: match.scheduledTime,
            tournamentName: tournament.name,
            venueName: venueOwner?.name || '',
            venueId: venueOwner?.venueId,
            type: isCompleted ? 'result' : 'next_match',
            ...(isCompleted ? {
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              homeTeam: home.name,
              awayTeam: away.name,
            } : {}),
          }),
        });
      }
      setNotifySuccess(match.id);
      setTimeout(() => setNotifySuccess(null), 3000);
    } catch (error) {
      console.error('Error notifying captains:', error);
    } finally {
      setNotifyingMatch(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-20 w-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-6">
          <Swords className="h-10 w-10 text-zinc-300" />
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Το τουρνουά δεν βρέθηκε</h3>
        <Button asChild className="mt-6 h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[12px]">
          <Link href="/management/tournaments">Επιστροφή</Link>
        </Button>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Back Button */}
      <Link
        href={`/management/tournaments/${tournament.id}`}
        className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </div>
        Πίσω στο {tournament.name}
      </Link>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-zinc-100">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Swords className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Διαχείριση Αγώνων</h1>
          </div>
          <p className="text-lg font-bold text-zinc-400">
            {matches.length} Συνολικοί Αγώνες &middot; <span className="text-emerald-600">{completedCount} Ολοκληρωμένοι</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {matches.length === 0 && teams.length >= 2 && (
            <Button
              onClick={handleGenerateFixtures}
              disabled={isGenerating}
              className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100"
            >
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Δημιουργία...</>
              ) : (
                <><Zap className="h-5 w-5 mr-2" /> Αυτόματη Κλήρωση</>
              )}
            </Button>
          )}
          {teams.length >= 2 && (
            <Button
              onClick={() => setShowNewMatch(!showNewMatch)}
              className={cn(
                "h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg transition-all",
                showNewMatch 
                  ? "bg-white border-2 border-zinc-100 text-zinc-400 hover:bg-zinc-50 shadow-none" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
              )}
            >
              {showNewMatch ? (
                <><X className="h-5 w-5 mr-2" /> Ακύρωση</>
              ) : (
                <><Plus className="h-5 w-5 mr-2" /> Νέος Αγώνας</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* New Match Form Card */}
      {showNewMatch && (
        <div className="bg-white rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-50/50 p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Προσθήκη Αγώνα</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            <div className="space-y-4">
              <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Γηπεδούχος Ομάδα</label>
              <select
                value={newHomeTeam}
                onChange={(e) => setNewHomeTeam(e.target.value)}
                className="w-full h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
              >
                <option value="">Επιλέξτε ομάδα...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === newAwayTeam}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Φιλοξενούμενη Ομάδα</label>
              <select
                value={newAwayTeam}
                onChange={(e) => setNewAwayTeam(e.target.value)}
                className="w-full h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
              >
                <option value="">Επιλέξτε ομάδα...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === newHomeTeam}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div className="space-y-4">
              <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Αγωνιστική</label>
              <Input
                type="number"
                min={1}
                value={newRound}
                onChange={(e) => setNewRound(parseInt(e.target.value) || 1)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ημερομηνία</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ώρα</label>
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleCreateMatch}
              disabled={isCreating || !newHomeTeam || !newAwayTeam || !newDate || newHomeTeam === newAwayTeam}
              className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-100"
            >
              {isCreating ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Δημιουργία...</>
              ) : (
                <><Plus className="h-5 w-5 mr-2" /> Αποθήκευση Αγώνα</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { label: 'Προγραμματισμένοι', value: scheduledCount, icon: Calendar, color: 'blue' },
          { label: 'Ολοκληρωμένοι', value: completedCount, icon: CheckCircle2, color: 'emerald' },
          { label: 'Συνολικά Γκολ', value: matches.filter(m => m.status === 'completed').reduce((s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0), icon: Target, color: 'amber' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-8 flex items-center gap-6">
            <div className={cn("h-16 w-16 rounded-[1.25rem] flex items-center justify-center", 
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              'bg-amber-50 text-amber-600'
            )}>
              <stat.icon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-zinc-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-zinc-900 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Round Filter Tabs */}
      {rounds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-2 bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-x-auto">
          <button
            onClick={() => setFilterRound('all')}
            className={cn(
              "px-6 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              filterRound === 'all' ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
            )}
          >
            Όλοι οι Αγώνες
          </button>
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRound(r)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filterRound === r ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
              )}
            >
              Αγωνιστική {r}
            </button>
          ))}
        </div>
      )}

      {/* Matches Grid */}
      {matches.length === 0 ? (
        <div className="bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-100 p-20 text-center">
          <div className="h-20 w-20 bg-white shadow-sm rounded-[2rem] mx-auto flex items-center justify-center mb-8">
            <Swords className="h-10 w-10 text-zinc-200" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-3 uppercase tracking-tight">Δεν υπάρχουν αγώνες</h3>
          <p className="text-lg font-medium text-zinc-400 max-w-md mx-auto">
            {teams.length < 2
              ? 'Χρειάζονται τουλάχιστον 2 ομάδες για να μπορέσετε να δημιουργήσετε αγώνες.'
              : 'Πατήστε στο κουμπί "Αυτόματη Κλήρωση" ή "Νέος Αγώνας" για να ξεκινήσετε.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
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
                className={cn(
                  "group bg-white rounded-[2.5rem] border transition-all duration-300 overflow-hidden",
                  isEditing ? "border-emerald-600 shadow-xl shadow-emerald-50 ring-2 ring-emerald-50" : "border-zinc-100 hover:shadow-xl hover:border-emerald-100"
                )}
              >
                {/* Match Card Header */}
                <div className="px-10 py-6 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/30">
                  <span className="text-[12px] font-black uppercase tracking-widest text-zinc-400">
                    {match.roundLabel || `Αγωνιστική ${match.round}`}
                  </span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-zinc-400">
                      <Clock className="h-4 w-4 text-zinc-300" />
                      {new Date(match.scheduledDate).toLocaleDateString('el-GR')} &middot; {match.scheduledTime}
                    </div>
                    <Badge className={cn("px-4 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-widest", ms.className)}>
                      {ms.label}
                    </Badge>
                  </div>
                </div>

                {/* Match Card Body */}
                <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-12">
                  {/* Home Team */}
                  <div className="flex-1 flex items-center gap-6 md:justify-end">
                    <span className={cn(
                      "text-xl font-black uppercase tracking-tight text-right",
                      isCompleted && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "text-emerald-700" : "text-zinc-900"
                    )}>
                      {home?.name || '—'}
                    </span>
                    <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-all">
                      <Shield className="h-8 w-8" />
                    </div>
                  </div>

                  {/* Score & VS Section */}
                  <div className="flex items-center gap-6">
                    {isEditing ? (
                      <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-3xl">
                        <Input
                          type="number"
                          min={0}
                          value={editHomeScore}
                          onChange={(e) => setEditHomeScore(e.target.value)}
                          className="w-20 h-20 text-center text-4xl font-black bg-white rounded-2xl border-none shadow-sm focus:ring-4 focus:ring-emerald-200"
                        />
                        <span className="text-3xl font-black text-emerald-200">-</span>
                        <Input
                          type="number"
                          min={0}
                          value={editAwayScore}
                          onChange={(e) => setEditAwayScore(e.target.value)}
                          className="w-20 h-20 text-center text-4xl font-black bg-white rounded-2xl border-none shadow-sm focus:ring-4 focus:ring-emerald-200"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 bg-zinc-50 px-10 py-6 rounded-3xl min-w-[200px] justify-center group-hover:bg-emerald-50 transition-colors">
                        {isCompleted ? (
                          <>
                            <span className="text-5xl font-black text-zinc-900">{match.homeScore}</span>
                            <span className="text-3xl font-black text-zinc-200">-</span>
                            <span className="text-5xl font-black text-zinc-900">{match.awayScore}</span>
                          </>
                        ) : (
                          <span className="text-lg font-black text-zinc-300 uppercase tracking-[0.2em] py-2">VS</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-all">
                      <Shield className="h-8 w-8" />
                    </div>
                    <span className={cn(
                      "text-xl font-black uppercase tracking-tight",
                      isCompleted && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "text-emerald-700" : "text-zinc-900"
                    )}>
                      {away?.name || '—'}
                    </span>
                  </div>
                </div>

                {/* Match Card Actions */}
                <div className="px-10 py-6 bg-zinc-50/30 border-t border-zinc-50 flex items-center justify-end gap-4">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => setEditingMatch(null)}
                        variant="ghost"
                        className="h-12 px-6 rounded-xl text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900"
                      >
                        <X className="h-4 w-4 mr-2" /> Ακύρωση
                      </Button>
                      <Button
                        onClick={handleSaveScore}
                        disabled={isSaving}
                        className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg shadow-emerald-100"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Αποθήκευση Σκορ
                      </Button>
                    </>
                  ) : (
                    <>
                      {(isScheduled || isCompleted) && (
                        <Button
                          onClick={() => startEditing(match)}
                          className={cn(
                            "h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[12px] shadow-sm transition-all",
                            isCompleted 
                              ? "bg-white border border-zinc-100 text-zinc-600 hover:bg-zinc-50" 
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-50"
                          )}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          {isCompleted ? 'Επεξεργασία Σκορ' : 'Καταχώρηση Σκορ'}
                        </Button>
                      )}
                      {/* Notify captains - only for future scheduled matches */}
                      {isScheduled && (home?.captainEmail || away?.captainEmail) && (() => {
                        const matchDateTime = new Date(`${new Date(match.scheduledDate).toISOString().split('T')[0]}T${match.scheduledTime || '23:59'}`);
                        const isFuture = matchDateTime > new Date();
                        if (!isFuture) return null;
                        return (
                          <Button
                            variant="outline"
                            onClick={() => setNotifyConfirm(match)}
                            disabled={notifyingMatch === match.id}
                            className={cn(
                              "h-12 px-6 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-sm transition-all",
                              notifySuccess === match.id
                                ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                                : "text-zinc-500 border-zinc-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50"
                            )}
                          >
                            {notifyingMatch === match.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : notifySuccess === match.id ? (
                              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Ειδοποίηση
                          </Button>
                        );
                      })()}
                      {isScheduled && (
                        <Button
                          variant="outline"
                          onClick={() => startEditingDetail(match)}
                          className="h-12 px-6 rounded-xl text-[12px] font-black uppercase tracking-widest text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Επεξεργασία
                        </Button>
                      )}
                      {isScheduled && (
                        <Button
                          variant="ghost"
                          onClick={() => handleCancelMatch(match.id)}
                          className="h-12 px-6 rounded-xl text-[12px] font-black uppercase tracking-widest text-red-400 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Ακύρωση
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
      {/* Edit Match Detail Dialog */}
      <AlertDialog open={editDetailMatch !== null} onOpenChange={(open) => !open && setEditDetailMatch(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {editDetailMatch && (() => {
            const home = teamMap.get(editDetailMatch.homeTeamId);
            const away = teamMap.get(editDetailMatch.awayTeamId);
            return (
              <>
                <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <Pencil className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      Επεξεργασία Αγώνα
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 text-sm mt-1">
                      {home?.name || '—'} vs {away?.name || '—'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-8 py-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Αγωνιστική</label>
                    <Input
                      value={editRoundLabel}
                      onChange={(e) => setEditRoundLabel(e.target.value)}
                      className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm"
                      placeholder="π.χ. Αγωνιστική 1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ημερομηνία</label>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ώρα</label>
                      <Input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col">
                    <AlertDialogAction
                      onClick={handleSaveDetail}
                      disabled={isSavingDetail}
                      className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] m-0"
                    >
                      {isSavingDetail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Αποθήκευση
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-10 w-full rounded-xl border-none bg-transparent text-zinc-400 hover:text-zinc-600 font-bold text-sm m-0">
                      Ακύρωση
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </div>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Notify Captains Confirmation Dialog */}
      <AlertDialog open={notifyConfirm !== null} onOpenChange={(open) => !open && setNotifyConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {notifyConfirm && (() => {
            const home = teamMap.get(notifyConfirm.homeTeamId);
            const away = teamMap.get(notifyConfirm.awayTeamId);
            const recipients = [home, away].filter((t) => t?.captainEmail);
            return (
              <>
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      Ειδοποίηση Αγώνα
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-blue-100 text-sm mt-1">
                      Email στους αρχηγούς των ομάδων
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-8 py-6 space-y-4">
                  {/* Match info */}
                  <div className="flex items-center justify-center gap-3 p-4 bg-zinc-50 rounded-xl">
                    <span className="text-sm font-black text-zinc-900">{home?.name || '—'}</span>
                    <span className="text-xs font-black text-zinc-400 bg-white px-3 py-1 rounded-lg border border-zinc-200">VS</span>
                    <span className="text-sm font-black text-zinc-900">{away?.name || '—'}</span>
                  </div>

                  {/* Date */}
                  <div className="text-center">
                    <p className="text-[12px] text-zinc-400 font-bold">
                      {new Date(notifyConfirm.scheduledDate).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {notifyConfirm.scheduledTime && ` • ${notifyConfirm.scheduledTime}`}
                    </p>
                  </div>

                  {/* Recipients */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">Παραλήπτες ({recipients.length})</p>
                    {recipients.map((team) => (
                      <div key={team!.id} className="flex items-center gap-2.5 p-2.5 bg-zinc-50 rounded-lg">
                        <div className="h-7 w-7 rounded-md bg-blue-50 flex items-center justify-center">
                          <Send className="h-3 w-3 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{team!.captainName}</p>
                          <p className="text-[12px] text-zinc-400">{team!.captainEmail} • {team!.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col">
                    <AlertDialogAction
                      onClick={() => {
                        handleNotifyCaptains(notifyConfirm);
                        setNotifyConfirm(null);
                      }}
                      className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] m-0"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Αποστολή σε {recipients.length} αρχηγούς
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-10 w-full rounded-xl border-none bg-transparent text-zinc-400 hover:text-zinc-600 font-bold text-sm m-0">
                      Ακύρωση
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </div>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
