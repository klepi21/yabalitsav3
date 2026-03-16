'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  ArrowLeft,
  Plus,
  Shield,
  Users,
  Phone,
  Mail,
  Trash2,
  X,
  User,
  Hash,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  tournamentService,
  tournamentTeamService,
  tournamentPlayerService,
} from '@/lib/tournament-services';
import { Tournament, TournamentTeam, TournamentPlayer, emptyPlayerStats } from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const positionLabels: Record<string, { label: string; className: string }> = {
  GK: { label: 'GK', className: 'bg-amber-100 text-amber-700' },
  DEF: { label: 'DEF', className: 'bg-blue-100 text-blue-700' },
  MID: { label: 'MID', className: 'bg-emerald-100 text-emerald-700' },
  FWD: { label: 'FWD', className: 'bg-red-100 text-red-700' },
};

export default function TeamDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [team, setTeam] = useState<TournamentTeam | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [position, setPosition] = useState<string>('');
  const [isCaptain, setIsCaptain] = useState(false);

  const tournamentId = params.id as string;
  const teamId = params.teamId as string;

  const loadData = useCallback(async () => {
    if (!tournamentId || !teamId) return;
    try {
      const [t, teamData, playersData] = await Promise.all([
        tournamentService.getById(tournamentId),
        tournamentTeamService.getById(teamId),
        tournamentPlayerService.getByTeam(teamId),
      ]);
      setTournament(t);
      setTeam(teamData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, teamId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadData();
  }, [user, venueOwner, authLoading, router, pathname, loadData]);

  const resetForm = () => {
    setPlayerName('');
    setPlayerPhone('');
    setPlayerEmail('');
    setShirtNumber('');
    setPosition('');
    setIsCaptain(false);
    setShowAddForm(false);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueOwner || !team) return;
    if (!playerName.trim()) return;

    setIsSubmitting(true);
    try {
      await tournamentPlayerService.create({
        teamId: team.id,
        tournamentId,
        venueId: venueOwner.venueId,
        name: playerName.trim(),
        phone: playerPhone.trim() || undefined,
        email: playerEmail.trim() || undefined,
        shirtNumber: shirtNumber ? parseInt(shirtNumber) : undefined,
        position: position as TournamentPlayer['position'] || undefined,
        isCaptain,
        stats: emptyPlayerStats,
      });
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error adding player:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await tournamentPlayerService.delete(playerId);
      await loadData();
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!tournament || !team) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">Η ομάδα δεν βρέθηκε</h3>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/management/tournaments">Επιστροφή</Link>
        </Button>
      </div>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isCaptain && !b.isCaptain) return -1;
    if (!a.isCaptain && b.isCaptain) return 1;
    return (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/management/tournaments/${tournament.id}/teams`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Ομάδες
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{team.name}</h1>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-zinc-500">
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{team.captainName}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{team.captainPhone}</span>
              {team.captainEmail && <span className="flex items-center gap-1 hidden sm:flex"><Mail className="h-3.5 w-3.5" />{team.captainEmail}</span>}
            </div>
          </div>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
            <Plus className="h-4 w-4" />
            Προσθήκη Παίκτη
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
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
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Γκολ</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{team.stats.goalsFor}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Βαθμοί</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{team.stats.points}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Κάρτες</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                {players.reduce((s, p) => s + p.stats.yellowCards + p.stats.redCards, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Player Form */}
      {showAddForm && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Νέος Παίκτης</h2>
            <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700">Ονοματεπώνυμο *</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Όνομα παίκτη"
                  className="bg-white rounded-lg border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700">Τηλέφωνο</Label>
                <Input
                  value={playerPhone}
                  onChange={(e) => setPlayerPhone(e.target.value)}
                  placeholder="69x xxx xxxx"
                  className="bg-white rounded-lg border-zinc-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700">Αριθμός Φανέλας</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={shirtNumber}
                  onChange={(e) => setShirtNumber(e.target.value)}
                  placeholder="#"
                  className="bg-white rounded-lg border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700">Θέση</Label>
                <div className="flex items-center gap-1.5">
                  {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
                    const cfg = positionLabels[pos];
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(position === pos ? '' : pos)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all border ${
                          position === pos
                            ? `${cfg.className} border-transparent`
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700">Αρχηγός</Label>
                <button
                  type="button"
                  onClick={() => setIsCaptain(!isCaptain)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all border ${
                    isCaptain
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {isCaptain ? 'C Αρχηγός' : 'Όχι'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} className="rounded-lg">
                Ακύρωση
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Προσθήκη
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Player List */}
      {sortedPlayers.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-zinc-300" />
          </div>
          <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν παίκτες</h3>
          <p className="mt-1 text-sm text-zinc-400">Προσθέστε παίκτες στην ομάδα.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-100/60 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider w-14">#</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Παίκτης</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider w-16">Θέση</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-12">Γκολ</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-12">Ασ.</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-12">ΚΚ</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-12">ΚΑ</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedPlayers.map((player) => {
                const pos = player.position ? positionLabels[player.position] : null;
                return (
                  <tr key={player.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-600">
                        {player.shirtNumber ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900">{player.name}</span>
                        {player.isCaptain && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">C</span>
                        )}
                      </div>
                      {player.phone && <p className="text-xs text-zinc-400 mt-0.5">{player.phone}</p>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {pos ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${pos.className}`}>
                          {pos.label}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-zinc-900">{player.stats.goals || '—'}</td>
                    <td className="py-3 px-3 text-center text-zinc-500">{player.stats.assists || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      {player.stats.yellowCards > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-6 rounded-sm bg-amber-400 text-white text-[10px] font-bold">
                          {player.stats.yellowCards}
                        </span>
                      ) : <span className="text-xs text-zinc-300">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {player.stats.redCards > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-6 rounded-sm bg-red-500 text-white text-[10px] font-bold">
                          {player.stats.redCards}
                        </span>
                      ) : <span className="text-xs text-zinc-300">—</span>}
                    </td>
                    <td className="py-3 px-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-zinc-900">Αφαίρεση Παίκτη</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-500">
                              Θέλετε να αφαιρέσετε τον &quot;{player.name}&quot; από την ομάδα;
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-lg">Ακύρωση</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => handleDeletePlayer(player.id)} className="rounded-lg">
                              Αφαίρεση
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
