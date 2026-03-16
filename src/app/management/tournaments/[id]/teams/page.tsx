'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  ArrowLeft,
  Plus,
  Shield,
  Users,
  Phone,
  Mail,
  ChevronRight,
  Trash2,
  X,
  Pencil,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { tournamentService, tournamentTeamService, tournamentPlayerService } from '@/lib/tournament-services';
import { Tournament, TournamentTeam, TournamentPlayer, emptyTeamStats } from '@/types/tournament';
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

export default function TeamsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add form state
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');

  // Edit state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCaptainName, setEditCaptainName] = useState('');
  const [editCaptainPhone, setEditCaptainPhone] = useState('');
  const [editCaptainEmail, setEditCaptainEmail] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const tournamentId = params.id as string;

  const loadData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const [t, teamsData, playersData] = await Promise.all([
        tournamentService.getById(tournamentId),
        tournamentTeamService.getByTournament(tournamentId),
        tournamentPlayerService.getByTournament(tournamentId),
      ]);
      setTournament(t);
      setTeams(teamsData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadData();
  }, [user, venueOwner, authLoading, router, pathname, loadData]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueOwner || !tournament) return;
    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim()) return;

    setIsSubmitting(true);
    try {
      await tournamentTeamService.create({
        tournamentId: tournament.id,
        venueId: venueOwner.venueId,
        name: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        captainEmail: captainEmail.trim() || undefined,
        status: 'registered',
        stats: emptyTeamStats,
      });
      setTeamName('');
      setCaptainName('');
      setCaptainPhone('');
      setCaptainEmail('');
      setShowAddForm(false);
      await loadData();
    } catch (error) {
      console.error('Error adding team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const teamPlayers = players.filter(p => p.teamId === teamId);
      for (const p of teamPlayers) {
        await tournamentPlayerService.delete(p.id);
      }
      await tournamentTeamService.delete(teamId);
      await loadData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const startEditTeam = (team: TournamentTeam) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditCaptainName(team.captainName);
    setEditCaptainPhone(team.captainPhone);
    setEditCaptainEmail(team.captainEmail || '');
  };

  const handleSaveEdit = async () => {
    if (!editingTeamId || !editName.trim() || !editCaptainName.trim() || !editCaptainPhone.trim()) return;
    setIsSavingEdit(true);
    try {
      await tournamentTeamService.update(editingTeamId, {
        name: editName.trim(),
        captainName: editCaptainName.trim(),
        captainPhone: editCaptainPhone.trim(),
        captainEmail: editCaptainEmail.trim() || undefined,
      });
      setEditingTeamId(null);
      await loadData();
    } catch (error) {
      console.error('Error updating team:', error);
    } finally {
      setIsSavingEdit(false);
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

  const canAddTeams = teams.length < tournament.maxTeams;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ομάδες</h1>
            <p className="text-sm text-zinc-500">{teams.length}/{tournament.maxTeams} ομάδες εγγεγραμμένες</p>
          </div>
        </div>
        {canAddTeams && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
            <Plus className="h-4 w-4" />
            Προσθήκη Ομάδας
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Νέα Ομάδα</h2>
            <button onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleAddTeam} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700">Όνομα Ομάδας *</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="π.χ. FC Olympus"
                className="bg-white rounded-lg border-zinc-200"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700">Αρχηγός *</Label>
                <Input
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Ονοματεπώνυμο"
                  className="bg-white rounded-lg border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700">Τηλέφωνο *</Label>
                <Input
                  value={captainPhone}
                  onChange={(e) => setCaptainPhone(e.target.value)}
                  placeholder="69x xxx xxxx"
                  className="bg-white rounded-lg border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700">Email</Label>
                <Input
                  type="email"
                  value={captainEmail}
                  onChange={(e) => setCaptainEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-white rounded-lg border-zinc-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="rounded-lg">
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

      {/* Team List */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
            <Shield className="h-6 w-6 text-zinc-300" />
          </div>
          <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν ομάδες</h3>
          <p className="mt-1 text-sm text-zinc-400">Προσθέστε ομάδες στο τουρνουά.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const teamPlayers = players.filter(p => p.teamId === team.id);
            const isEditing = editingTeamId === team.id;

            if (isEditing) {
              return (
                <div key={team.id} className="rounded-xl border border-amber-200 bg-amber-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">Επεξεργασία Ομάδας</h3>
                    <button onClick={() => setEditingTeamId(null)} className="text-zinc-400 hover:text-zinc-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700">Όνομα Ομάδας *</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-white rounded-lg border-zinc-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-700">Αρχηγός *</Label>
                      <Input
                        value={editCaptainName}
                        onChange={(e) => setEditCaptainName(e.target.value)}
                        className="bg-white rounded-lg border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-700">Τηλέφωνο *</Label>
                      <Input
                        value={editCaptainPhone}
                        onChange={(e) => setEditCaptainPhone(e.target.value)}
                        className="bg-white rounded-lg border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-700">Email</Label>
                      <Input
                        type="email"
                        value={editCaptainEmail}
                        onChange={(e) => setEditCaptainEmail(e.target.value)}
                        className="bg-white rounded-lg border-zinc-200"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditingTeamId(null)} className="rounded-lg text-xs" size="sm">
                      Ακύρωση
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editName.trim() || !editCaptainName.trim() || !editCaptainPhone.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                    >
                      {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Αποθήκευση
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={team.id} className="rounded-xl border border-zinc-100/60 bg-white p-5 hover:shadow-sm transition-all duration-150">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/management/tournaments/${tournament.id}/teams/${team.id}`}
                    className="flex items-center gap-3.5 flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold tracking-tight text-zinc-900">{team.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {teamPlayers.length} παίκτες
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {team.captainName}
                        </span>
                        {team.captainEmail && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Mail className="h-3 w-3" />
                            {team.captainEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 ml-3">
                    {(tournament.type === 'league' || tournament.type === 'group+knockout') && (
                      <div className="text-right mr-2 hidden sm:block">
                        <p className="text-xs text-zinc-400">Βαθμοί</p>
                        <p className="text-sm font-bold text-zinc-900">{team.stats.points}</p>
                      </div>
                    )}
                    <button
                      onClick={() => startEditTeam(team)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-zinc-900">Διαγραφή Ομάδας</AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-500">
                            Θα διαγραφούν και οι {teamPlayers.length} παίκτες της ομάδας &quot;{team.name}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-lg">Ακύρωση</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => handleDeleteTeam(team.id)} className="rounded-lg">
                            Διαγραφή
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Link href={`/management/tournaments/${tournament.id}/teams/${team.id}`}>
                      <ChevronRight className="h-4 w-4 text-zinc-300" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
