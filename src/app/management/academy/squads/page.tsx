'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachFilter } from '@/hooks/useCoachFilter';
import { squadService, academyUserService } from '@/lib/academy-services';
import { Squad, AcademyUser, BROADCAST_TEMPLATES } from '@/types/academy';
import { Loader2, Plus, Trash2, Trophy, Users as UsersIcon, AlertCircle, Search, Megaphone, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, toGreekUpperCase } from '@/lib/utils';
import { broadcastService } from '@/lib/academy-services';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function SquadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const { filterSquads } = useCoachFilter();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [users, setUsers] = useState<AcademyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Broadcast state
  const [broadcastSquad, setBroadcastSquad] = useState<Squad | null>(null);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);

  const venueId = venueOwner?.venueId || '';
  const venueName = venueOwner?.name || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [squadsData, usersData] = await Promise.all([
          squadService.getByVenue(venueId),
          academyUserService.getByVenue(venueId),
        ]);
        setSquads(filterSquads(squadsData));
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης τμημάτων');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname, filterSquads]);

  const handleDelete = async (squadId: string) => {
    try {
      await squadService.delete(squadId);
      setSquads((prev) => prev.filter((s) => s.id !== squadId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής τμήματος');
    }
  };

  const getCoachNames = (coachIds: string[]) => {
    return coachIds
      .map((id) => users.find((u) => u.id === id)?.displayName)
      .filter(Boolean)
      .join(', ') || 'Χωρίς προπονητή';
  };

  const getAthleteCount = (squadId: string) => {
    return users.filter((u) => (u.squad_ids || []).includes(squadId) || u.squad_id === squadId).length;
  };

  const filteredSquads = squads.filter(squad =>
    squad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    squad.ageGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get all email recipients for a squad (parents + athletes with contact_email)
  const getSquadRecipients = (squadId: string) => {
    const squadAthletes = users.filter(
      (u) => (u.squad_ids || []).includes(squadId) || u.squad_id === squadId
    );
    const recipients: { email: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const athlete of squadAthletes) {
      // Find linked parent
      const parent = users.find((u) => u.linked_athletes?.includes(athlete.id));
      const parentEmail = parent?.fields?.email as string | undefined;
      if (parentEmail && !seen.has(parentEmail)) {
        recipients.push({ email: parentEmail, name: parent!.displayName });
        seen.add(parentEmail);
      }
      // Fallback: athlete's own email
      const contactEmail = (athlete.fields?.contact_email || athlete.fields?.email) as string | undefined;
      if (contactEmail && !seen.has(contactEmail)) {
        recipients.push({ email: contactEmail, name: athlete.displayName });
        seen.add(contactEmail);
      }
    }
    return recipients;
  };

  const openBroadcast = (squad: Squad) => {
    setBroadcastSquad(squad);
    setBroadcastSubject('');
    setBroadcastMessage('');
    setBroadcastResult(null);
  };

  const applyTemplate = (templateKey: string) => {
    const tpl = BROADCAST_TEMPLATES.find((t) => t.key === templateKey);
    if (tpl) {
      setBroadcastSubject(tpl.subject);
      setBroadcastMessage(tpl.message);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastSquad || !broadcastSubject.trim() || !broadcastMessage.trim()) return;

    const recipients = getSquadRecipients(broadcastSquad.id);
    if (recipients.length === 0) {
      setError('Δεν βρέθηκαν email παραληπτών για αυτό το τμήμα');
      return;
    }

    setBroadcastSending(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/academy/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          recipients,
          subject: broadcastSubject,
          message: broadcastMessage,
          venueName,
          venueId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save to history
      await broadcastService.create({
        venueId,
        squadId: broadcastSquad.id,
        squadName: broadcastSquad.name,
        subject: broadcastSubject,
        message: broadcastMessage,
        recipientCount: recipients.length,
        recipientEmails: recipients.map((r) => r.email),
        sentBy: venueName,
      });

      setBroadcastResult({ sent: data.sent, failed: data.failed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία αποστολής');
    } finally {
      setBroadcastSending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-10 pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-zinc-200 rounded" />
              <div className="h-3 w-52 bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="h-10 w-32 rounded-xl bg-zinc-200" />
        </div>
        {/* Stats row skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-24 rounded-2xl bg-zinc-100" />
          <div className="h-24 rounded-2xl bg-zinc-100" />
          <div className="sm:col-span-2 lg:col-span-2 h-14 rounded-2xl bg-zinc-100" />
        </div>
        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-100 h-56" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)} 
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2">
        <div className="flex items-center gap-4">
           <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
             <Trophy className="h-6 w-6 text-emerald-400" />
           </div>
           <div className="space-y-0.5">
             <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
               {toGreekUpperCase('Τμήματα')}
             </h1>
             <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[12px] font-black text-zinc-400 uppercase tracking-widest">
                 {toGreekUpperCase('Οργάνωση αθλητών σε ομάδες')}
               </p>
             </div>
           </div>
        </div>
        <Button asChild className="h-10 px-6 rounded-xl bg-zinc-900 hover:bg-black text-white font-black shadow-md transition-all active:scale-95 text-[11px]">
          <Link href="/management/academy/squads/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            {toGreekUpperCase('Νέο Τμήμα')}
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500">
          <div className="h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{squads.length}</p>
            <p className="text-[12px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Σύνολο Τμημάτων')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500">
          <div className="h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
              {users.filter(u => u.squad_id || (u.squad_ids && u.squad_ids.length > 0)).length}
            </p>
            <p className="text-[12px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Σύνολο Αθλητών')}</p>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-2 flex items-center">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder={toGreekUpperCase('Αναζήτηση τμημάτων, ηλικιακών γκρουπ...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 pl-12 pr-4 bg-white border-zinc-100 rounded-2xl shadow-sm focus:ring-8 focus:ring-emerald-500/5 font-bold text-[13px] placeholder:text-zinc-300 w-full transition-all uppercase tracking-tight"
            />
          </div>
        </div>
      </div>

      {/* Squads Grid */}
      {filteredSquads.length === 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white p-12 text-center">
            <div className="mx-auto h-16 w-16 bg-zinc-50 rounded-xl flex items-center justify-center mb-6 shadow-inner">
                <Trophy className="h-8 w-8 text-zinc-200" />
            </div>
          <h3 className="text-lg font-black text-zinc-900 mb-1">
            {searchTerm ? 'Δεν βρέθηκαν τμήματα' : 'Δεν υπάρχουν τμήματα ακόμα'}
          </h3>
          <p className="text-zinc-500 font-medium text-xs max-w-sm mx-auto">
            {searchTerm ? 'Δοκιμάστε να αλλάξετε την αναζήτηση.' : 'Δημιουργήστε το πρώτο τμήμα.'}
          </p>
          {!searchTerm && (
            <Button asChild className="mt-8 h-12 px-8 rounded-xl bg-zinc-900 text-white font-black uppercase text-[12px]">
              <Link href="/management/academy/squads/new">Δημιουργία Τμήματος</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSquads.map((squad, index) => {
            const colors = [
              { bg: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', hover: 'hover:border-emerald-200' },
              { bg: 'bg-blue-50 text-blue-600', badge: 'bg-blue-100 text-blue-700', hover: 'hover:border-blue-200' },
              { bg: 'bg-violet-50 text-violet-600', badge: 'bg-violet-100 text-violet-700', hover: 'hover:border-violet-200' },
            ];
            const color = colors[index % colors.length];
            const athleteCount = getAthleteCount(squad.id);

            return (
              <div
                key={squad.id}
                className={cn(
                    "group relative flex flex-col rounded-2xl border border-zinc-100 bg-white p-4 transition-all duration-300 hover:shadow-lg",
                    color.hover
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 shadow-sm", color.bg)}>
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-base font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{toGreekUpperCase(squad.name)}</h4>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase(squad.ageGroup)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg group-hover:bg-white border border-transparent group-hover:border-emerald-100 transition-all shadow-inner group-hover:shadow-none">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5 text-emerald-500/50" />
                      {toGreekUpperCase('Αθλητές')}
                    </span>
                    <span className="text-lg font-black text-zinc-900 group-hover:text-emerald-600 transition-colors">{athleteCount}</span>
                  </div>
                  <div className="space-y-0.5 px-1">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">{toGreekUpperCase('Προπονητής')}</p>
                    <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-tight truncate">
                      {toGreekUpperCase(getCoachNames(squad.coachIds))}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 border-t border-zinc-100 relative z-10">
                  <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-[11px] uppercase tracking-widest border-zinc-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-sm transition-all active:scale-95" asChild>
                    <Link href={`/management/academy/squads/${squad.id}/edit`}>
                      {toGreekUpperCase('Επεξεργασία')}
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-[11px] uppercase tracking-widest border-zinc-100 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 shadow-sm transition-all active:scale-95" asChild>
                    <Link href={`/management/academy/users?squad=${squad.id}`}>
                      {toGreekUpperCase('Ρόστερ')}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 w-10 rounded-xl border-zinc-100 hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-sm transition-all active:scale-95"
                    onClick={() => openBroadcast(squad)}
                    title="Ανακοίνωση"
                  >
                    <Megaphone className="h-4 w-4" />
                  </Button>

                  <AlertDialog open={deleteConfirm === squad.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-10 w-10 rounded-xl text-zinc-300 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all active:scale-90"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(squad.id); }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] p-10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή τμήματος</AlertDialogTitle>
                        <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-2">
                          Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα <span className="text-zinc-900 font-bold">&quot;{squad.name}&quot;</span>; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-10 gap-3">
                        <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-zinc-100">Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(squad.id)}
                          className="h-14 px-8 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
                        >
                          Διαγραφή
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Broadcast Dialog */}
      <Dialog open={broadcastSquad !== null} onOpenChange={(open: boolean) => !open && setBroadcastSquad(null)}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-lg overflow-hidden">
          {broadcastSquad && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-8 pt-8 pb-6 text-center">
                <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-600/20">
                  <Megaphone className="h-6 w-6 text-white" />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-white tracking-tight">
                    {toGreekUpperCase('Ανακοίνωση')}
                  </DialogTitle>
                  <DialogDescription className="text-amber-100 text-sm mt-1">
                    {toGreekUpperCase(broadcastSquad.name)} — {getSquadRecipients(broadcastSquad.id).length} παραλήπτες
                  </DialogDescription>
                </DialogHeader>
              </div>

              {broadcastResult ? (
                /* Success state */
                <div className="px-8 py-10 text-center space-y-4">
                  <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-zinc-900">Η ανακοίνωση στάλθηκε!</p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {broadcastResult.sent} email στάλθηκαν επιτυχώς
                      {broadcastResult.failed > 0 && `, ${broadcastResult.failed} απέτυχαν`}
                    </p>
                  </div>
                  <Button
                    onClick={() => setBroadcastSquad(null)}
                    className="h-11 px-8 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold"
                  >
                    Κλείσιμο
                  </Button>
                </div>
              ) : (
                /* Form */
                <div className="px-8 py-6 space-y-5">
                  {/* Templates */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Πρότυπα')}</p>
                    <div className="flex flex-wrap gap-2">
                      {BROADCAST_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.key}
                          type="button"
                          onClick={() => applyTemplate(tpl.key)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Θέμα')}</p>
                    <Input
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      placeholder="Θέμα ανακοίνωσης..."
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Μήνυμα')}</p>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Γράψτε το μήνυμά σας..."
                      rows={5}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  {/* Recipients preview */}
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">{toGreekUpperCase('Παραλήπτες')}</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {getSquadRecipients(broadcastSquad.id).map((r) => (
                        <span key={r.email} className="text-[12px] font-bold text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-100">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <Button
                      onClick={handleBroadcast}
                      disabled={broadcastSending || !broadcastSubject.trim() || !broadcastMessage.trim()}
                      className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98]"
                    >
                      {broadcastSending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Αποστολή...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Αποστολή σε {getSquadRecipients(broadcastSquad.id).length} παραλήπτες</>
                      )}
                    </Button>
                    <button
                      onClick={() => setBroadcastSquad(null)}
                      className="h-10 w-full rounded-xl text-zinc-400 hover:text-zinc-600 font-bold text-sm transition-colors"
                    >
                      Ακύρωση
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
