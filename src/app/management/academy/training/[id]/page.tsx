'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService } from '@/lib/training-services';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { Squad, AcademyUser } from '@/types/academy';
import {
  TrainingSession, TrainingAttendance, AttendanceStatus,
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS,
  ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, TrainingDrill,
} from '@/types/training';
import { cn, toGreekUpperCase } from '@/lib/utils';
import {
  Loader2, ArrowLeft, Dumbbell, Clock, Users, Calendar,
  CheckCircle2, XCircle, AlertCircle, Pencil, Trash2,
  Save, UserCheck, Plus, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  params: Promise<{ id: string }>;
}

type TabId = 'overview' | 'attendance' | 'edit';

const TRAINING_TYPES = ['training', 'friendly', 'fitness', 'tactical', 'recovery'] as const;

export default function TrainingDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [coaches, setCoaches] = useState<AcademyUser[]>([]);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [attendance, setAttendance] = useState<TrainingAttendance[]>([]);
  const [editForm, setEditForm] = useState<Partial<TrainingSession>>({});
  const [editDrills, setEditDrills] = useState<TrainingDrill[]>([]);
  const [newDrill, setNewDrill] = useState({ name: '', duration: 15, description: '' });

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [sessionData, squadsData, groups] = await Promise.all([
          trainingService.getById(id),
          squadService.getByVenue(venueId),
          userGroupService.getOrSeed(venueId),
        ]);

        if (!sessionData) { setError('Η προπόνηση δεν βρέθηκε'); setIsLoading(false); return; }

        setSession(sessionData);
        setSquads(squadsData);
        setAttendance(sessionData.attendance || []);
        setEditForm(sessionData);
        setEditDrills(sessionData.drills || []);

        // Load coaches
        const coachGroup = groups.find((g) => g.capabilities?.includes('coach_squads'));
        if (coachGroup) {
          const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
          setCoaches(coachUsers);
        }

        // Load athletes for this squad
        const athleteGroups = groups.filter((g) => g.capabilities?.includes('squad_assignment'));
        const allUsers = await academyUserService.getByVenue(venueId);
        const squadAthletes = allUsers.filter((u) =>
          athleteGroups.some((g) => g.id === u.groupId) &&
          ((u.squad_ids || []).includes(sessionData.squadId) || u.squad_id === sessionData.squadId)
        );
        setAthletes(squadAthletes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, user, venueOwner, authLoading, router, venueId, pathname]);

  // Initialize attendance from athletes if empty
  const initAttendance = () => {
    if (attendance.length > 0) return;
    const newAttendance: TrainingAttendance[] = athletes.map((a) => ({
      athleteId: a.id,
      athleteName: a.displayName,
      status: 'present' as AttendanceStatus,
    }));
    setAttendance(newAttendance);
  };

  const updateAthleteStatus = (athleteId: string, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((a) => a.athleteId === athleteId ? { ...a, status } : a)
    );
  };

  const updateAthleteNote = (athleteId: string, note: string) => {
    setAttendance((prev) =>
      prev.map((a) => a.athleteId === athleteId ? { ...a, note: note || undefined } : a)
    );
  };

  const saveAttendance = async () => {
    try {
      setIsSaving(true);
      await trainingService.updateAttendance(id, attendance);
      setSession((prev) => prev ? { ...prev, attendance } : prev);
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης');
    } finally {
      setIsSaving(false);
    }
  };

  const saveEdit = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const coach = coaches.find((c) => c.id === editForm.coachId);
      await trainingService.update(id, {
        title: editForm.title,
        squadId: editForm.squadId,
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        type: editForm.type,
        coachId: editForm.coachId,
        coachName: coach?.displayName || session?.coachName || '',
        assistantCoachIds: editForm.assistantCoachIds,
        notes: editForm.notes,
        drills: editDrills.map((d) => ({ name: d.name, duration: d.duration, ...(d.description ? { description: d.description } : {}) })),
      });
      const updated = await trainingService.getById(id);
      if (updated) {
        setSession(updated);
        setEditForm(updated);
        setEditDrills(updated.drills || []);
      }
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await trainingService.delete(id);
      router.push('/management/academy/training');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής');
    }
  };

  const markCompleted = async () => {
    try {
      await trainingService.markCompleted(id);
      setSession((prev) => prev ? { ...prev, status: 'completed' } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης');
    }
  };

  const markCancelled = async () => {
    try {
      await trainingService.markCancelled(id);
      setSession((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης');
    }
  };

  const addEditDrill = () => {
    if (!newDrill.name.trim()) return;
    setEditDrills((prev) => [...prev, { ...newDrill, name: newDrill.name.trim(), description: newDrill.description.trim() || undefined }]);
    setNewDrill({ name: '', duration: 15, description: '' });
  };

  const attendanceStats = useMemo(() => {
    const present = attendance.filter((a) => a.status === 'present').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const injured = attendance.filter((a) => a.status === 'injured').length;
    return { present, late, absent, injured, total: attendance.length };
  }, [attendance]);

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? `${squad.name} (${squad.ageGroup})` : '—';
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Ολοκληρώθηκε';
      case 'cancelled': return 'Ακυρώθηκε';
      default: return 'Προγραμματισμένη';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Dumbbell className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Η προπόνηση δεν βρέθηκε</h2>
          <Button asChild className="mt-4">
            <Link href="/management/academy/training">Πίσω</Link>
          </Button>
        </div>
      </div>
    );
  }

  const typeColor = TRAINING_TYPE_COLORS[session.type];
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Επισκόπηση', icon: ClipboardList },
    { id: 'attendance', label: 'Απουσιολόγιο', icon: UserCheck },
    { id: 'edit', label: 'Επεξεργασία', icon: Pencil },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
        <div className="flex items-center gap-8">
          <Button variant="outline" size="icon" className="h-16 w-16 border-zinc-200 shrink-0 rounded-[1.25rem] bg-white shadow-sm hover:bg-zinc-50 transition-all hover:scale-105 active:scale-95 group" asChild>
            <Link href="/management/academy/training">
              <ArrowLeft className="h-8 w-8 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </Link>
          </Button>
          <div className="flex items-center gap-6">
            <div className={cn("h-20 w-20 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl shadow-zinc-100 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500", typeColor.bg)}>
              <Dumbbell className={cn("h-10 w-10", typeColor.text)} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <h1 className="text-5xl font-black tracking-tight text-zinc-900 uppercase leading-none">{toGreekUpperCase(session.title)}</h1>
                <span className={cn("text-[11px] font-black px-4 py-1.5 rounded-xl border-2 uppercase tracking-[0.2em] shadow-sm", typeColor.bg, typeColor.text, typeColor.border)}>
                  {toGreekUpperCase(TRAINING_TYPE_LABELS[session.type])}
                </span>
                <div className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm",
                    session.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    session.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                    <div className={cn("h-2 w-2 rounded-full",
                      session.status === 'completed' ? "bg-emerald-500" :
                      session.status === 'cancelled' ? "bg-red-500" : "bg-blue-500"
                    )} />
                    {toGreekUpperCase(statusLabel(session.status || ''))}
                </div>
              </div>
              <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight flex items-center gap-4">
                <Calendar className="h-6 w-6 text-emerald-500/50" />
                {new Date(session.date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="text-zinc-200 font-light">|</span>
                <Clock className="h-6 w-6 text-emerald-500/50" />
                {session.startTime} - {session.endTime}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {session.status === 'scheduled' && (
            <div className="flex items-center gap-4">
              <Button size="lg" variant="outline" onClick={markCompleted} className="h-20 px-10 rounded-[1.75rem] text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white font-black shadow-xl shadow-emerald-100/20 transition-all hover:scale-105 active:scale-95 text-xl uppercase tracking-tight group">
                <CheckCircle2 className="h-8 w-8 group-hover:scale-110 transition-transform" />
                {toGreekUpperCase('Ολοκλήρωση')}
              </Button>
              <Button size="lg" variant="outline" onClick={markCancelled} className="h-20 px-10 rounded-[1.75rem] text-red-500 border-red-100 bg-red-50/50 hover:bg-red-600 hover:text-white font-black shadow-xl shadow-red-100/20 transition-all hover:scale-105 active:scale-95 text-xl uppercase tracking-tight group">
                <XCircle className="h-8 w-8 group-hover:scale-110 transition-transform" />
                {toGreekUpperCase('Ακύρωση')}
              </Button>
            </div>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-20 w-20 rounded-[1.75rem] text-zinc-300 border-zinc-100 hover:bg-red-50 hover:text-red-500 transition-all hover:border-red-100 group">
                <Trash2 className="h-9 w-9 group-hover:scale-110 transition-transform" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[3rem] p-12 max-w-md border-zinc-100 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-red-500" />
              <div className="h-24 w-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                  <Trash2 className="h-12 w-12 text-red-500" />
              </div>
              <AlertDialogHeader className="text-center">
                <AlertDialogTitle className="text-4xl font-black text-zinc-900 leading-tight uppercase tracking-tight">{toGreekUpperCase('Διαγραφή;')}</AlertDialogTitle>
                <AlertDialogDescription className="text-xl font-medium text-zinc-500 mt-4 leading-relaxed uppercase tracking-tight">
                    ΕΙΣΤΕ ΣΙΓΟΥΡΟΙ; ΑΥΤΗ Η ΕΝΕΡΓΕΙΑ ΔΕΝ ΜΠΟΡΕΙ ΝΑ ΑΝΑΙΡΕΘΕΙ ΚΑΙ ΟΛΑ ΤΑ ΔΕΔΟΜΕΝΑ ΘΑ ΧΑΘΟΥΝ.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-12 flex flex-col sm:flex-row gap-4">
                <AlertDialogCancel className="h-20 px-10 rounded-2xl font-black text-zinc-400 flex-1 text-lg border-none hover:bg-zinc-50">{toGreekUpperCase('Ακύρωση')}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete} className="h-20 px-10 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white flex-1 text-lg shadow-2xl shadow-red-200 hover:-translate-y-1 transition-all active:scale-95">{toGreekUpperCase('Διαγραφή')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-3 rounded-[2.25rem] bg-zinc-100/80 p-2 w-full sm:w-fit overflow-x-auto shadow-inner border border-zinc-200/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'attendance') initAttendance(); }}
              className={cn(
                "flex flex-1 sm:flex-none items-center justify-center gap-4 px-10 py-5 rounded-[1.75rem] text-lg font-black transition-all duration-300 uppercase tracking-tight whitespace-nowrap active:scale-95",
                activeTab === tab.id
                  ? 'bg-white shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] text-emerald-600 scale-105 z-10'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'
              )}
            >
              <Icon className={cn("h-6 w-6", activeTab === tab.id ? "text-emerald-500" : "text-zinc-400")} />
              {toGreekUpperCase(tab.label)}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
              <div className="flex items-center gap-5 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner">
                    <Calendar className="h-7 w-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 group-hover:text-zinc-500 transition-colors">{toGreekUpperCase('Τμήμα')}</span>
              </div>
              <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight truncate">{toGreekUpperCase(getSquadName(session.squadId))}</p>
            </div>
            
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
              <div className="flex items-center gap-5 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner">
                    <Users className="h-7 w-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 group-hover:text-zinc-500 transition-colors">{toGreekUpperCase('Προπονητής')}</span>
              </div>
              <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight truncate">{toGreekUpperCase(session.coachName)}</p>
            </div>
            
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
              <div className="flex items-center gap-5 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner">
                    <Clock className="h-7 w-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 group-hover:text-zinc-500 transition-colors">{toGreekUpperCase('Ώρα')}</span>
              </div>
              <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{session.startTime} - {session.endTime}</p>
            </div>
            
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm group hover:shadow-xl hover:border-emerald-200 transition-all duration-300 ring-4 ring-transparent hover:ring-emerald-50">
              <div className="flex items-center gap-5 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 transition-all shadow-inner group-hover:scale-110">
                    <UserCheck className="h-7 w-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600/60">{toGreekUpperCase('Παρουσίες')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-emerald-600 tracking-tighter">
                    {attendanceStats.present + attendanceStats.late}
                </p>
                <p className="text-2xl font-bold text-zinc-300">/ {attendanceStats.total}</p>
              </div>
            </div>
          </div>

          {/* Drills Section */}
          {session.drills.length > 0 && (
            <div className="rounded-[3rem] border border-zinc-100 bg-white p-12 shadow-sm relative overflow-hidden group/drills">
               <div className="absolute -right-16 -top-16 p-8 opacity-[0.02] group-hover/drills:opacity-[0.05] group-hover/drills:scale-110 group-hover/drills:-rotate-12 transition-all duration-700 pointer-events-none">
                    <Dumbbell className="h-64 w-64" />
               </div>
              <h3 className="text-[11px] font-black text-zinc-400 mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {toGreekUpperCase(`Ασκήσεις Προπόνησης (${session.drills.reduce((s, d) => s + d.duration, 0)} λεπτά)`)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {session.drills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-6 p-6 rounded-[1.75rem] bg-zinc-50/50 border border-zinc-100/50 hover:bg-white hover:border-emerald-100 hover:shadow-xl transition-all duration-300 group/drill">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-xl font-black text-zinc-400 group-hover/drill:text-emerald-500 group-hover/drill:scale-110 shadow-sm transition-all">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-zinc-900 uppercase tracking-tight group-hover/drill:text-emerald-700 transition-colors truncate leading-tight">{toGreekUpperCase(drill.name)}</p>
                      {drill.description && <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight line-clamp-1 mt-1 group-hover/drill:text-zinc-500 transition-colors">{toGreekUpperCase(drill.description)}</p>}
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white border border-zinc-100 text-[13px] font-black text-zinc-900 uppercase tracking-tighter shrink-0 shadow-sm group-hover/drill:border-emerald-100">
                        {drill.duration}&apos;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {session.notes && (
            <div className="rounded-[3rem] border border-zinc-100 bg-white p-12 shadow-sm group hover:shadow-md transition-all duration-300">
              <h3 className="text-[11px] font-black text-zinc-400 mb-8 flex items-center gap-4 uppercase tracking-[0.3em]">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {toGreekUpperCase('Σημειώσεις Προπονητή')}
              </h3>
              <div className="bg-zinc-50/50 rounded-[2rem] p-8 border border-zinc-100/50 shadow-inner group-hover:bg-white group-hover:border-zinc-200 transition-all duration-300">
                <p className="text-xl font-bold text-zinc-600 whitespace-pre-wrap leading-relaxed italic uppercase tracking-tight">{session.notes}</p>
              </div>
            </div>
          )}

          {/* Attendance Summary Section */}
          {session.attendance.length > 0 && (
            <div className="rounded-[3rem] border border-zinc-100 bg-white p-12 shadow-sm overflow-hidden group/attendance">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-12 flex-wrap gap-8">
                  <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {toGreekUpperCase('Απουσιολόγιο')}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[11px] uppercase tracking-widest shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {toGreekUpperCase(`Παρόντες: ${attendanceStats.present}`)}
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 font-black text-[11px] uppercase tracking-widest shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        {toGreekUpperCase(`Αργοπορία: ${attendanceStats.late}`)}
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-100 font-black text-[11px] uppercase tracking-widest shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        {toGreekUpperCase(`Απόντες: ${attendanceStats.absent}`)}
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200 font-black text-[11px] uppercase tracking-widest shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-zinc-400" />
                        {toGreekUpperCase(`Τραυματίες: ${attendanceStats.injured}`)}
                    </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {session.attendance.map((a) => (
                  <div key={a.athleteId} className="flex items-center justify-between p-6 rounded-[1.75rem] bg-zinc-50/50 border border-zinc-100/50 transition-all duration-300 hover:bg-white hover:border-emerald-100 hover:shadow-xl group/item">
                    <span className="text-lg font-black text-zinc-900 group-hover/item:text-emerald-700 transition-colors uppercase tracking-tight truncate mr-4">{toGreekUpperCase(a.athleteName)}</span>
                    <span className={cn(
                        "text-[9px] font-black px-3 py-1.5 rounded-lg border-2 uppercase tracking-[0.15em] shrink-0 shadow-sm transition-transform group-hover/item:scale-105",
                        ATTENDANCE_STATUS_COLORS[a.status]
                    )}>
                      {toGreekUpperCase(ATTENDANCE_STATUS_LABELS[a.status])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="rounded-[4rem] border border-zinc-100 bg-white p-12 shadow-xl shadow-zinc-200/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-10">
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Λήψη Παρουσιών')}</h3>
                <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-zinc-400 uppercase tracking-[0.2em]">{athletes.length} {athletes.length === 1 ? 'ΑΘΛΗΤΗΣ' : 'ΑΘΛΗΤΕΣ'}</p>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <p className="text-lg font-black text-emerald-600/60 uppercase tracking-[0.2em]">{toGreekUpperCase(getSquadName(session.squadId))}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'present' })))} className="h-16 px-8 rounded-2xl font-black text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white transition-all text-[13px] uppercase tracking-widest shadow-sm">
                  {toGreekUpperCase('Όλοι Παρόντες')}
                </Button>
                <Button variant="outline" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'absent' })))} className="h-16 px-8 rounded-2xl font-black text-red-500 border-red-100 bg-red-50/50 hover:bg-red-600 hover:text-white transition-all text-[13px] uppercase tracking-widest shadow-sm">
                  {toGreekUpperCase('Όλοι Απόντες')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {attendance.map((a) => (
                <div key={a.athleteId} className="flex flex-col xl:flex-row xl:items-center gap-10 p-10 rounded-[3rem] border border-zinc-100 bg-zinc-50/20 shadow-inner group hover:bg-white hover:border-emerald-200 hover:shadow-2xl transition-all duration-500">
                  <div className="flex-1 min-w-0 flex items-center gap-8">
                    <div className="h-20 w-20 rounded-[1.75rem] bg-white border-2 border-zinc-100 flex items-center justify-center text-3xl font-black text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-all shadow-sm">
                        {toGreekUpperCase(a.athleteName.charAt(0))}
                    </div>
                    <div className="space-y-1">
                        <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight leading-none">{toGreekUpperCase(a.athleteName)}</p>
                        <div className="flex items-center gap-3">
                             <div className={cn("h-2 w-2 rounded-full", (['present', 'late'].includes(a.status)) ? "bg-emerald-500" : "bg-red-500")} />
                             <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.25em] leading-none mb-0.5">{toGreekUpperCase(ATTENDANCE_STATUS_LABELS[a.status])}</p>
                        </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto">
                    {(['present', 'absent', 'late', 'injured'] as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateAthleteStatus(a.athleteId, status)}
                        className={cn(
                          "h-20 px-8 rounded-[1.5rem] text-[12px] font-black border-2 transition-all active:scale-90 uppercase tracking-widest flex items-center justify-center gap-3 shadow-md",
                          a.status === status
                            ? ATTENDANCE_STATUS_COLORS[status] + ' ring-4 ring-zinc-100/30 scale-105 z-10'
                            : 'border-white bg-white/50 text-zinc-400 hover:border-zinc-200 hover:bg-white'
                        )}
                      >
                        {a.status === status && <CheckCircle2 className="h-5 w-5" />}
                        {toGreekUpperCase(ATTENDANCE_STATUS_LABELS[status])}
                      </button>
                    ))}
                  </div>
                  <div className="w-full xl:w-80">
                    <div className="relative">
                        <Input
                            placeholder={toGreekUpperCase('Προσθήκη σημείωσης...')}
                            value={a.note || ''}
                            onChange={(e) => updateAthleteNote(a.athleteId, e.target.value)}
                            className="h-20 pl-10 pr-10 text-[16px] font-black bg-white border-2 border-zinc-100 rounded-[1.5rem] placeholder:text-zinc-300 focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm group-hover:shadow-lg uppercase"
                        />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {attendance.length === 0 && athletes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 bg-zinc-50/50 rounded-[4rem] border-4 border-dashed border-zinc-100">
                <Users className="h-20 w-20 text-zinc-200 mb-8" />
                <p className="text-2xl font-black text-zinc-300 uppercase tracking-widest">{toGreekUpperCase('Δεν υπάρχουν αθλητές σε αυτό το τμήμα')}</p>
              </div>
            )}
          </div>

          <div className="sticky bottom-10 z-40 px-6 max-w-2xl mx-auto">
            <Button onClick={saveAttendance} disabled={isSaving} className="h-24 w-full rounded-[2.25rem] bg-zinc-900 hover:bg-black text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all active:scale-95 group overflow-hidden border-4 border-zinc-800">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {isSaving ? (
                <><Loader2 className="h-10 w-10 animate-spin mr-6" /> <span className="text-2xl font-black uppercase tracking-[0.2em]">{toGreekUpperCase('Αποθήκευση...')}</span></>
                ) : (
                <><Save className="h-10 w-10 mr-6 group-hover:scale-110 transition-transform text-emerald-400" /> <span className="text-2xl font-black uppercase tracking-[0.2em]">{toGreekUpperCase('Ολοκληρωση Παρουσιων')}</span></>
                )}
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Edit */}
      {activeTab === 'edit' && (
        <div className="rounded-[4rem] border border-zinc-100 bg-white p-12 lg:p-20 shadow-xl shadow-zinc-200/50 max-w-5xl mx-auto space-y-16 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="space-y-10">
            <h3 className="text-3xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200">
                    <Pencil className="h-7 w-7" />
                </div>
                {toGreekUpperCase('Βασικα Στοιχεία Προπόνησης')}
            </h3>
            
            <div className="grid grid-cols-1 gap-12">
              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Τίτλος Προπόνησης')}</Label>
                <Input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-20 px-8 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-2xl font-black shadow-inner focus:ring-8 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 transition-all uppercase placeholder:text-zinc-200"
                  placeholder={toGreekUpperCase('π.χ. Τεχνική Κατάρτιση...')}
                />
              </div>

              <div className="space-y-6">
                <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Τύπος Προπόνησης')}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {TRAINING_TYPES.map((type) => {
                    const colors = TRAINING_TYPE_COLORS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditForm((p) => ({ ...p, type }))}
                        className={cn(
                          "h-16 px-4 rounded-[1.25rem] text-[11px] font-black transition-all border-2 uppercase tracking-widest shadow-sm active:scale-95",
                          editForm.type === type
                            ? `${colors.bg} ${colors.text} ${colors.border} scale-105 shadow-xl ring-8 ring-zinc-50`
                            : "bg-white text-zinc-300 border-zinc-100 hover:border-zinc-200 hover:text-zinc-500"
                        )}
                      >
                        {toGreekUpperCase(TRAINING_TYPE_LABELS[type])}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Τμήμα')}</Label>
                  <Select value={editForm.squadId || ''} onValueChange={(val: string) => setEditForm((p) => ({ ...p, squadId: val }))}>
                    <SelectTrigger className="h-20 px-8 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-xl font-black shadow-inner focus:ring-8 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 transition-all uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2.5rem] border-zinc-100 shadow-2xl p-2">
                        {squads.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-black text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Προπονητής')}</Label>
                  <Select value={editForm.coachId || ''} onValueChange={(val: string) => setEditForm((p) => ({ ...p, coachId: val }))}>
                    <SelectTrigger className="h-20 px-8 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-xl font-black shadow-inner focus:ring-8 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 transition-all uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2.5rem] border-zinc-100 shadow-2xl p-2">
                        {coaches.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="font-black text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase(c.displayName)}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Ημερομηνία')}</Label>
                  <Input type="date" value={editForm.date || ''} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className="h-20 px-8 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-xl font-black shadow-inner active:bg-white focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Έναρξη')}</Label>
                  <Input type="time" value={editForm.startTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="h-20 px-8 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-xl font-black shadow-inner focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Λήξη')}</Label>
                  <Input type="time" value={editForm.endTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="h-20 px-8 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] text-xl font-black shadow-inner focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Edit Drills */}
          <div className="space-y-10 pt-16 border-t border-zinc-100">
            <h3 className="text-3xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200">
                    <Dumbbell className="h-7 w-7" />
                </div>
                {toGreekUpperCase('Ασκήσεις Προγράμματος')}
            </h3>
            
            {editDrills.length > 0 && (
              <div className="grid grid-cols-1 gap-6">
                {editDrills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-8 p-8 rounded-[2rem] border-2 border-zinc-100 bg-zinc-50/50 group hover:bg-white hover:border-emerald-200 hover:shadow-2xl transition-all duration-300">
                    <div className="h-16 w-16 rounded-[1.25rem] bg-white border-2 border-zinc-100 flex items-center justify-center text-2xl font-black text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100 shadow-sm transition-all">
                        {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-black text-zinc-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors leading-tight">{toGreekUpperCase(drill.name)}</p>
                      <div className="flex items-center gap-4 mt-1">
                          <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest">{drill.duration} ΛΕΠΤΑ</span>
                          {drill.description && <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest truncate">— {toGreekUpperCase(drill.description)}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => setEditDrills((p) => p.filter((_, idx) => idx !== i))} className="h-16 w-16 rounded-2xl flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 border-2 border-transparent hover:border-red-100">
                      <Trash2 className="h-8 w-8" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="rounded-[3.5rem] border-2 border-zinc-100 bg-zinc-50/30 p-12 space-y-10 group/newdrill hover:bg-zinc-50 hover:border-zinc-200 transition-all">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-10">
                <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Όνομα Άσκησης')}</Label>
                    <Input placeholder={toGreekUpperCase('π.χ. Προθέρμανση...')} value={newDrill.name} onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))} className="h-20 px-8 bg-white rounded-[1.5rem] border-2 border-zinc-100 text-xl font-black shadow-sm focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-zinc-200" />
                </div>
                <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Διάρκεια')}</Label>
                    <Input type="number" placeholder="0" value={newDrill.duration} onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))} className="h-20 px-8 bg-white rounded-[1.5rem] border-2 border-zinc-100 text-2xl font-black shadow-sm focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-center" min={1} />
                </div>
              </div>
              <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Περιγραφή (Προαιρετικό)')}</Label>
                    <Input placeholder={toGreekUpperCase('Λεπτομέρειες άσκησης...')} value={newDrill.description} onChange={(e) => setNewDrill((p) => ({ ...p, description: e.target.value }))} className="h-20 px-8 bg-white rounded-[1.5rem] border-2 border-zinc-100 text-xl font-black shadow-sm focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-zinc-200" />
              </div>
              <Button type="button" variant="outline" onClick={addEditDrill} disabled={!newDrill.name.trim()} className="h-20 w-full rounded-[1.5rem] font-black text-emerald-600 border-2 border-emerald-100 bg-white hover:bg-emerald-600 hover:text-white transition-all text-lg uppercase tracking-widest shadow-xl shadow-emerald-100/20 active:scale-95 group">
                <Plus className="h-8 w-8 group-hover:scale-125 transition-transform" /> {toGreekUpperCase('Προσθήκη Άσκησης')}
              </Button>
            </div>
          </div>

          <div className="space-y-6 pt-16 border-t border-zinc-100">
            <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">{toGreekUpperCase('Γενικές Σημειώσεις Προπονητή')}</Label>
            <textarea
              value={editForm.notes || ''}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              rows={4}
              className="flex w-full rounded-[2.5rem] border-2 border-zinc-100 bg-zinc-50/50 px-10 py-8 text-xl font-bold focus:bg-white focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-inner uppercase placeholder:text-zinc-200 leading-relaxed active:shadow-none"
              placeholder={toGreekUpperCase('Σημειώσεις για αυτή την προπόνηση...')}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-6 pt-16 border-t border-zinc-100">
            <Button variant="outline" className="h-24 px-12 rounded-[2rem] font-black text-zinc-400 hover:text-red-500 border-none bg-zinc-100 hover:bg-red-50 transition-all text-2xl uppercase tracking-widest shadow-inner active:scale-95" onClick={() => setActiveTab('overview')}>{toGreekUpperCase('Ακύρωση')}</Button>
            <Button className="flex-[2] h-24 px-12 rounded-[2rem] bg-zinc-900 hover:bg-black text-white font-black shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-2 active:scale-[0.98] text-2xl uppercase tracking-widest border-4 border-zinc-800 group relative overflow-hidden" onClick={saveEdit} disabled={isSaving}>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSaving ? (
                <><Loader2 className="h-10 w-10 animate-spin mr-6" /> {toGreekUpperCase('Αποθήκευση...')}</>
              ) : (
                <><Save className="h-10 w-10 mr-6 group-hover:scale-110 transition-transform text-emerald-400" /> {toGreekUpperCase('Αποθήκευση Αλλαγών')}</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
