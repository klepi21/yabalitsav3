'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  ArrowLeft,
  Shield,
  Plus,
  X,
  Pencil,
  Trash2,
  Save,
  Mail,
  Phone,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  tournamentService,
  tournamentTeamService,
  tournamentPlayerService,
} from '@/lib/tournament-services';
import { Tournament, TournamentTeam, TournamentPlayer } from '@/types/tournament';
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
import { toGreekUpperCase } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const emptyTeamStats = {
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
};

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
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-20 w-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-6">
          <Trophy className="h-10 w-10 text-zinc-300" />
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Το τουρνουά δεν βρέθηκε</h3>
        <Button asChild className="mt-6 h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[12px]">
          <Link href="/management/tournaments">Επιστροφή</Link>
        </Button>
      </div>
    );
  }

  const canAddTeams = teams.length < tournament.maxTeams;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4 sm:px-0">
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
            <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Shield className="h-6 w-6 text-violet-600" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">{toGreekUpperCase('Ομάδες Τουρνουά')}</h1>
          </div>
          <p className="text-lg font-bold text-zinc-400">
            <span className="text-violet-600">{teams.length}</span> από <span className="text-zinc-900">{tournament.maxTeams}</span> διαθέσιμες θέσεις
          </p>
        </div>

        {canAddTeams && !showAddForm && (
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100"
          >
            <Plus className="h-5 w-5 mr-2" />
            Προσθήκη Ομάδας
          </Button>
        )}
      </div>

      {/* Add Form Card */}
      {showAddForm && (
        <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-50/50 p-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Νέα Ομάδα')}</h2>
            </div>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="h-10 w-10 rounded-xl hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleAddTeam} className="space-y-10">
            <div className="space-y-4 text-left">
              <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Όνομα Ομάδας *</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="π.χ. Α.Ο. FC Champions"
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Υπεύθυνος / Αρχηγός *</Label>
                <Input
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Ονοματεπώνυμο"
                  className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Τηλέφωνο Επικοινωνίας *</Label>
                <Input
                  value={captainPhone}
                  onChange={(e) => setCaptainPhone(e.target.value)}
                  placeholder="69x xxx xxxx"
                  className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail (Προαιρετικά)</Label>
                <Input
                  type="email"
                  value={captainEmail}
                  onChange={(e) => setCaptainEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowAddForm(false)} 
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
                  <><Plus className="h-5 w-5 mr-2" /> Αποθήκευση Ομάδας</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Team List Grid */}
      {teams.length === 0 ? (
        <div className="bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-100 p-20 text-center">
          <div className="h-20 w-20 bg-white shadow-sm rounded-[2rem] mx-auto flex items-center justify-center mb-8 text-zinc-200">
            <Shield className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-3 uppercase tracking-tight">Δεν υπάρχουν ομάδες</h3>
          <p className="text-lg font-medium text-zinc-400 max-w-md mx-auto mb-10">
            Ξεκινήστε προσθέτοντας τις συμμετέχουσες ομάδες στο τουρνουά σας.
          </p>
          <Button 
            onClick={() => setShowAddForm(true)} 
            className="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100"
          >
            <Plus className="h-5 w-5 mr-2" /> Προσθήκη Πρώτης Ομάδας
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {teams.map((team) => {
            const teamPlayers = players.filter(p => p.teamId === team.id);
            const isEditing = editingTeamId === team.id;

            if (isEditing) {
              return (
                <div key={team.id} className="bg-white rounded-[2.5rem] border-2 border-amber-400 shadow-xl shadow-amber-50 p-10 space-y-10 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Pencil className="h-5 w-5 text-amber-600" />
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase(`Επεξεργασία ${team.name}`)}</h3>
                    </div>
                    <button 
                      onClick={() => setEditingTeamId(null)} 
                      className="h-10 w-10 rounded-xl hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                    <div className="space-y-4 lg:col-span-1">
                      <Label className="text-[12px] font-black uppercase tracking-widest text-zinc-400 ml-1">Όνομα Ομάδας</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
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

                  <div className="flex items-center justify-end gap-4 pt-4">
                    <Button 
                      onClick={() => setEditingTeamId(null)} 
                      variant="ghost" 
                      className="h-12 px-6 rounded-xl text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600"
                    >
                      Ακύρωση
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editName.trim() || !editCaptainName.trim() || !editCaptainPhone.trim()}
                      className="h-12 px-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg shadow-amber-100"
                    >
                      {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Ενημέρωση
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={team.id} 
                className="group bg-white rounded-[2.5rem] border border-zinc-100 p-8 hover:shadow-xl hover:border-violet-100 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <Link
                    href={`/management/tournaments/${tournament.id}/teams/${team.id}`}
                    className="flex-1 flex flex-col md:flex-row md:items-center gap-8 min-w-0"
                  >
                    <div className="h-20 w-20 rounded-[1.75rem] bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-violet-50 group-hover:text-violet-600 transition-all duration-300">
                      <Shield className="h-10 w-10" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-zinc-900 group-hover:text-violet-700 transition-colors uppercase tracking-tight">
                        {team.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4">
                        <Badge variant="outline" className="h-7 px-4 rounded-lg bg-zinc-50 border-none text-[12px] font-black uppercase tracking-widest text-zinc-400 group-hover:bg-violet-100 group-hover:text-violet-700">
                          <Users className="h-3 w-3 mr-2" />
                          {teamPlayers.length} παίκτες
                        </Badge>
                        <Badge variant="outline" className="h-7 px-4 rounded-lg bg-zinc-50 border-none text-[12px] font-black uppercase tracking-widest text-zinc-400">
                          <Phone className="h-3 w-3 mr-2" />
                          {team.captainName}
                        </Badge>
                        {team.captainEmail && (
                          <Badge variant="outline" className="h-7 px-4 rounded-lg bg-zinc-50 border-none text-[12px] font-black uppercase tracking-widest text-zinc-400 hidden xl:flex">
                            <Mail className="h-3 w-3 mr-2" />
                            {team.captainEmail}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-4 pl-4 md:border-l md:border-zinc-50">
                    {(tournament.type === 'league' || tournament.type === 'group+knockout') && (
                      <div className="text-center px-6 py-3 bg-zinc-50 rounded-2xl group-hover:bg-violet-50 transition-colors mr-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-violet-400">Βαθμοί</p>
                        <p className="text-2xl font-black text-zinc-900 group-hover:text-violet-700">{team.stats.points}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditTeam(team)}
                          className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-amber-50 hover:text-amber-600 transition-all"
                          title="Επεξεργασία"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Διαγραφή">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2.5rem] p-10 border-none">
                            <AlertDialogHeader className="space-y-4">
                              <AlertDialogTitle className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Διαγραφή Ομάδας</AlertDialogTitle>
                              <AlertDialogDescription className="text-lg font-medium text-zinc-500">
                                Είστε σίγουροι; Θα διαγραφούν οριστικά η ομάδα <span className="text-zinc-900 font-bold">&quot;{team.name}&quot;</span> και οι <span className="text-zinc-900 font-bold">{teamPlayers.length}</span> παίκτες που ανήκουν σε αυτήν. Αυτή η ενέργεια δεν αναιρείται.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-8 gap-4">
                              <AlertDialogCancel className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] border-none bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all shadow-none">Ακύρωση</AlertDialogCancel>
                              <AlertDialogAction 
                                variant="destructive" 
                                onClick={() => handleDeleteTeam(team.id)} 
                                className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-100"
                              >
                                Διαγραφή Ομάδας
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      <Link 
                        href={`/management/tournaments/${tournament.id}/teams/${team.id}`}
                        className="h-10 px-4 rounded-xl bg-zinc-900 text-white flex items-center justify-between text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                      >
                        Ρόστερ
                        <ChevronRight className="h-3 w-3 ml-2" />
                      </Link>
                    </div>
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
