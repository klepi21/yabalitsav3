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
  Pencil,
  Save,
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
import { Badge } from '@/components/ui/badge';
import { cn, toGreekUpperCase } from '@/lib/utils';

const positionLabels: Record<string, { label: string; className: string }> = {
  GK: { label: 'GK', className: 'bg-amber-50 text-amber-700 border-none' },
  DEF: { label: 'DEF', className: 'bg-blue-50 text-blue-700 border-none' },
  MID: { label: 'MID', className: 'bg-emerald-50 text-emerald-700 border-none' },
  FWD: { label: 'FWD', className: 'bg-red-50 text-red-700 border-none' },
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

  // Add player form
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [position, setPosition] = useState<string>('');
  const [isCaptain, setIsCaptain] = useState(false);

  // Edit team header
  const [editingTeamInfo, setEditingTeamInfo] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editCaptainName, setEditCaptainName] = useState('');
  const [editCaptainPhone, setEditCaptainPhone] = useState('');
  const [editCaptainEmail, setEditCaptainEmail] = useState('');
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  // Edit player inline
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerPhone, setEditPlayerPhone] = useState('');
  const [editShirtNumber, setEditShirtNumber] = useState('');
  const [editPosition, setEditPosition] = useState<string>('');
  const [editIsCaptain, setEditIsCaptain] = useState(false);
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);

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

  const startEditTeamInfo = () => {
    if (!team) return;
    setEditingTeamInfo(true);
    setEditTeamName(team.name);
    setEditCaptainName(team.captainName);
    setEditCaptainPhone(team.captainPhone);
    setEditCaptainEmail(team.captainEmail || '');
  };

  const handleSaveTeamInfo = async () => {
    if (!team || !editTeamName.trim() || !editCaptainName.trim() || !editCaptainPhone.trim()) return;
    setIsSavingTeam(true);
    try {
      await tournamentTeamService.update(team.id, {
        name: editTeamName.trim(),
        captainName: editCaptainName.trim(),
        captainPhone: editCaptainPhone.trim(),
        captainEmail: editCaptainEmail.trim() || undefined,
      });
      setEditingTeamInfo(false);
      await loadData();
    } catch (error) {
      console.error('Error updating team:', error);
    } finally {
      setIsSavingTeam(false);
    }
  };

  const startEditPlayer = (player: TournamentPlayer) => {
    setEditingPlayerId(player.id);
    setEditPlayerName(player.name);
    setEditPlayerPhone(player.phone || '');
    setEditShirtNumber(player.shirtNumber?.toString() || '');
    setEditPosition(player.position || '');
    setEditIsCaptain(player.isCaptain);
  };

  const handleSavePlayer = async () => {
    if (!editingPlayerId || !editPlayerName.trim()) return;
    setIsSavingPlayer(true);
    try {
      await tournamentPlayerService.update(editingPlayerId, {
        name: editPlayerName.trim(),
        phone: editPlayerPhone.trim() || undefined,
        shirtNumber: editShirtNumber ? parseInt(editShirtNumber) : undefined,
        position: (editPosition as TournamentPlayer['position']) || undefined,
        isCaptain: editIsCaptain,
      });
      setEditingPlayerId(null);
      await loadData();
    } catch (error) {
      console.error('Error updating player:', error);
    } finally {
      setIsSavingPlayer(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!tournament || !team) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-20 w-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-6">
          <Shield className="h-10 w-10 text-zinc-300" />
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Η ομάδα δεν βρέθηκε</h3>
        <Button asChild className="mt-6 h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[12px]">
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
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4 sm:px-0">
      {/* Back Button */}
      <Link
        href={`/management/tournaments/${tournament.id}/teams`}
        className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </div>
        Πίσω στις Ομάδες
      </Link>

      {/* Header & Team Info */}
      {editingTeamInfo ? (
        <div className="bg-white rounded-[2.5rem] border-2 border-amber-400 shadow-xl shadow-amber-50 p-10 space-y-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Pencil className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Επεξεργασία {team.name}</h3>
            </div>
            <button 
              onClick={() => setEditingTeamInfo(false)} 
              className="h-10 w-10 rounded-xl hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Όνομα Ομάδας</Label>
              <Input
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-4">
              <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Υπεύθυνος</Label>
              <Input
                value={editCaptainName}
                onChange={(e) => setEditCaptainName(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-4">
              <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Τηλέφωνο</Label>
              <Input
                value={editCaptainPhone}
                onChange={(e) => setEditCaptainPhone(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-4">
              <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Email</Label>
              <Input
                type="email"
                value={editCaptainEmail}
                onChange={(e) => setEditCaptainEmail(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Button 
              onClick={() => setEditingTeamInfo(false)} 
              variant="ghost" 
              className="h-12 px-6 rounded-xl text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600"
            >
              Ακύρωση
            </Button>
            <Button
              onClick={handleSaveTeamInfo}
              disabled={isSavingTeam}
              className="h-12 px-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg shadow-amber-100"
            >
              {isSavingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Ενημέρωση
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-zinc-100">
          <div className="flex items-center gap-8">
            <div className="h-20 w-20 rounded-[1.75rem] bg-violet-50 flex items-center justify-center text-violet-600 shadow-sm">
              <Shield className="h-10 w-10" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">{toGreekUpperCase(team.name)}</h1>
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant="outline" className="h-7 px-4 rounded-lg bg-zinc-50 border-none text-[12px] font-black uppercase tracking-widest text-zinc-400">
                  <User className="h-3 w-3 mr-2" />
                  {team.captainName}
                </Badge>
                <Badge variant="outline" className="h-7 px-4 rounded-lg bg-zinc-50 border-none text-[12px] font-black uppercase tracking-widest text-zinc-400">
                  <Phone className="h-3 w-3 mr-2" />
                  {team.captainPhone}
                </Badge>
                {team.captainEmail && (
                  <Badge variant="outline" className="h-7 px-4 rounded-lg bg-zinc-50 border-none text-[12px] font-black uppercase tracking-widest text-zinc-400">
                    <Mail className="h-3 w-3 mr-2" />
                    {team.captainEmail}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={startEditTeamInfo} 
              className="h-14 px-8 rounded-2xl border-zinc-100 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-all"
            >
              <Pencil className="h-5 w-5 mr-2" />
              Επεξεργασία
            </Button>
            {!showAddForm && (
              <Button 
                onClick={() => setShowAddForm(true)} 
                className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100"
              >
                <Plus className="h-5 w-5 mr-2" />
                Προσθήκη Παίκτη
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Παίκτες', value: players.length, icon: Users, color: 'blue' },
          { label: 'Γκολ', value: team.stats.goalsFor, icon: Target, color: 'emerald' },
          { label: 'Βαθμοί', value: team.stats.points, icon: Hash, color: 'amber' },
          { label: 'Κάρτες', value: players.reduce((s, p) => s + p.stats.yellowCards + p.stats.redCards, 0), icon: AlertTriangle, color: 'red' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-6 flex items-center gap-6">
            <div className={cn("h-14 w-14 rounded-[1.25rem] flex items-center justify-center", 
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
              'bg-red-50 text-red-600'
            )}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">{stat.label}</p>
              <p className="text-2xl font-black text-zinc-900 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Player Form Card */}
      {showAddForm && (
        <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-50/50 p-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Νέος Παίκτης</h2>
            </div>
            <button 
              onClick={resetForm} 
              className="h-10 w-10 rounded-xl hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleAddPlayer} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ονοματεπώνυμο *</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="π.χ. Γιάννης Παπαδόπουλος"
                  className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Τηλέφωνο Επικοινωνίας</Label>
                <Input
                  value={playerPhone}
                  onChange={(e) => setPlayerPhone(e.target.value)}
                  placeholder="69x xxx xxxx"
                  className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Αριθμός Φανέλας</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={shirtNumber}
                  onChange={(e) => setShirtNumber(e.target.value)}
                  placeholder="#"
                  className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-center focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Θέση</Label>
                <div className="flex items-center gap-2">
                  {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
                    const cfg = positionLabels[pos];
                    const isActive = position === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(position === pos ? '' : pos)}
                        className={cn(
                          "flex-1 h-14 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all border-2",
                          isActive 
                            ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" 
                            : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                        )}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ιδιότητα</Label>
                <button
                  type="button"
                  onClick={() => setIsCaptain(!isCaptain)}
                  className={cn(
                    "w-full h-14 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2",
                    isCaptain 
                      ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-50" 
                      : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                  )}
                >
                  <User className={cn("h-4 w-4", isCaptain ? "text-amber-600" : "text-zinc-300")} />
                  {isCaptain ? 'Αρχηγός Ομάδας' : 'Απλός Παίκτης'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={resetForm} 
                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[12px] text-zinc-400 hover:text-zinc-600"
              >
                Ακύρωση
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="h-14 px-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <><Plus className="h-5 w-5 mr-2" /> Αποθήκευση Παίκτη</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Player List Card */}
      {sortedPlayers.length === 0 ? (
        <div className="bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-100 p-20 text-center">
          <div className="h-20 w-20 bg-white shadow-sm rounded-[2rem] mx-auto flex items-center justify-center mb-8 text-zinc-200">
            <Users className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-3 uppercase tracking-tight">Δεν υπάρχουν παίκτες</h3>
          <p className="text-lg font-medium text-zinc-400 max-w-md mx-auto mb-10">
            Ξεκινήστε προσθέτοντας παίκτες στο ρόστερ της ομάδας.
          </p>
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100"
          >
            <Plus className="h-5 w-5 mr-2" /> Προσθήκη Πρώτου Παίκτη
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="py-6 px-8 text-left text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">#</th>
                <th className="py-6 px-4 text-left text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">Παίκτης</th>
                <th className="py-6 px-4 text-center text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">Θέση</th>
                <th className="py-6 px-4 text-center text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">Γκολ</th>
                <th className="py-6 px-4 text-center text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">Ασ.</th>
                <th className="py-6 px-4 text-center text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">Κάρτες</th>
                <th className="py-6 px-8 text-right text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {sortedPlayers.map((player) => {
                const pos = player.position ? positionLabels[player.position] : null;
                const isEditingPlayer = editingPlayerId === player.id;

                if (isEditingPlayer) {
                  return (
                    <tr key={player.id} className="bg-amber-50/30 animate-in fade-in duration-300">
                      <td className="py-6 px-8">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={editShirtNumber}
                          onChange={(e) => setEditShirtNumber(e.target.value)}
                          className="w-16 h-12 bg-white rounded-xl border-zinc-200 text-center font-bold"
                          placeholder="#"
                        />
                      </td>
                      <td className="py-6 px-4">
                        <div className="space-y-2">
                          <Input
                            value={editPlayerName}
                            onChange={(e) => setEditPlayerName(e.target.value)}
                            className="h-10 bg-white rounded-xl border-zinc-200 font-bold"
                            placeholder="Όνομα"
                          />
                          <Input
                            value={editPlayerPhone}
                            onChange={(e) => setEditPlayerPhone(e.target.value)}
                            className="h-8 text-xs bg-white rounded-lg border-zinc-200"
                            placeholder="Τηλέφωνο"
                          />
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="grid grid-cols-2 gap-1 min-w-[120px]">
                          {(['GK', 'DEF', 'MID', 'FWD'] as const).map((p) => {
                            const cfg = positionLabels[p];
                            const isActive = editPosition === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setEditPosition(editPosition === p ? '' : p)}
                                className={cn(
                                  "px-2 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg border transition-all",
                                  isActive ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-100 text-zinc-400"
                                )}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td colSpan={4} className="py-6 px-8">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditIsCaptain(!editIsCaptain)}
                            className={cn(
                              "h-10 px-4 rounded-xl text-[12px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                              editIsCaptain ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-white border-zinc-100 text-zinc-400"
                            )}
                          >
                            <User className="h-3 w-3" />
                            C
                          </button>
                          <div className="h-8 w-px bg-zinc-100 mx-2" />
                          <Button
                            variant="ghost"
                            onClick={() => setEditingPlayerId(null)}
                            className="h-10 rounded-xl text-[12px] font-black uppercase tracking-widest text-zinc-400"
                          >
                            <X className="h-4 w-4 mr-2" /> Ακύρωση
                          </Button>
                          <Button
                            onClick={handleSavePlayer}
                            disabled={isSavingPlayer || !editPlayerName.trim()}
                            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg shadow-emerald-100"
                          >
                            {isSavingPlayer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Αποθήκευση
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={player.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-6 px-8">
                      <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-lg font-black text-zinc-400 group-hover:bg-white group-hover:text-violet-600 group-hover:shadow-sm transition-all duration-300">
                        {player.shirtNumber ?? '—'}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-zinc-900 uppercase tracking-tight group-hover:text-violet-700 transition-colors">
                          {player.name}
                        </span>
                        {player.isCaptain && (
                          <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[11px] uppercase tracking-widest h-5 px-1.5">
                            Αρχηγός
                          </Badge>
                        )}
                      </div>
                      {player.phone && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-zinc-400">
                          <Phone className="h-3 w-3" />
                          {player.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-6 px-4 text-center">
                      {pos ? (
                        <Badge className={cn("px-3 py-1 rounded-lg font-black text-[11px] uppercase tracking-widest", pos.className)}>
                          {pos.label}
                        </Badge>
                      ) : (
                        <span className="text-xs font-black text-zinc-200">—</span>
                      )}
                    </td>
                    <td className="py-6 px-4 text-center">
                      <span className="text-lg font-black text-zinc-900">{player.stats.goals || '0'}</span>
                    </td>
                    <td className="py-6 px-4 text-center">
                      <span className="text-lg font-bold text-zinc-400">{player.stats.assists || '0'}</span>
                    </td>
                    <td className="py-6 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {player.stats.yellowCards > 0 && (
                          <div className="w-5 h-7 rounded-sm bg-amber-400 shadow-sm flex items-center justify-center text-[12px] font-black text-amber-950" title="Κίτρινες">
                            {player.stats.yellowCards}
                          </div>
                        )}
                        {player.stats.redCards > 0 && (
                          <div className="w-5 h-7 rounded-sm bg-red-600 shadow-sm flex items-center justify-center text-[12px] font-black text-white" title="Κόκκινες">
                            {player.stats.redCards}
                          </div>
                        )}
                        {player.stats.yellowCards === 0 && player.stats.redCards === 0 && (
                          <span className="text-xs font-black text-zinc-200">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEditPlayer(player)}
                          className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-amber-50 hover:text-amber-600 transform hover:scale-105 transition-all"
                          title="Επεξεργασία"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button 
                              className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-600 transform hover:scale-105 transition-all"
                              title="Διαγραφή"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2.5rem] p-10 border-none">
                            <AlertDialogHeader className="space-y-4">
                              <AlertDialogTitle className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Αφαίρεση Παίκτη</AlertDialogTitle>
                              <AlertDialogDescription className="text-lg font-medium text-zinc-500">
                                Είστε σίγουροι; Θα αφαιρέσετε τον παίκτη <span className="text-zinc-900 font-bold">&quot;{player.name}&quot;</span> από το ρόστερ της ομάδας. Αυτή η ενέργεια δεν αναιρείται.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-8 gap-4">
                              <AlertDialogCancel className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] border-none bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all shadow-none">Ακύρωση</AlertDialogCancel>
                              <AlertDialogAction 
                                variant="destructive" 
                                onClick={() => handleDeletePlayer(player.id)} 
                                className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-100"
                              >
                                Διαγραφή Παίκτη
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
