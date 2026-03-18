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
          userGroupService.getByVenue(venueId),
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

  const _statusIcon = (status: string) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" className="h-14 w-14 border-zinc-200 shrink-0 rounded-2xl bg-white shadow-sm hover:bg-zinc-50 transition-all hover:scale-105 active:scale-95 touch-target" asChild>
            <Link href="/management/academy/training">
              <ArrowLeft className="h-6 w-6 text-zinc-400" />
            </Link>
          </Button>
          <div className="flex items-center gap-5">
            <div className={cn("h-16 w-16 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-xl shadow-zinc-100", typeColor.bg)}>
              <Dumbbell className={cn("h-8 w-8", typeColor.text)} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase(session.title)}</h1>
                <span className={cn("text-[12px] font-black px-4 py-1.5 rounded-xl border uppercase tracking-[0.2em] shadow-sm", typeColor.bg, typeColor.text, typeColor.border)}>
                  {toGreekUpperCase(TRAINING_TYPE_LABELS[session.type])}
                </span>
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-widest",
                    session.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    session.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                    {toGreekUpperCase(statusLabel(session.status || ''))}
                </div>
              </div>
              <p className="text-[18px] font-bold text-zinc-500 mt-2 uppercase tracking-tight flex items-center gap-3">
                <Calendar className="h-5 w-5 text-emerald-600" />
                {new Date(session.date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="text-zinc-200">|</span>
                <Clock className="h-5 w-5 text-emerald-600" />
                {session.startTime} - {session.endTime}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {session.status === 'scheduled' && (
            <div className="flex items-center gap-3">
              <Button size="lg" variant="outline" onClick={markCompleted} className="h-14 px-8 rounded-2xl text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white font-black shadow-sm transition-all hover:scale-105 active:scale-95 text-sm uppercase">
                <CheckCircle2 className="h-5 w-5" />
                {toGreekUpperCase('Ολοκλήρωση')}
              </Button>
              <Button size="lg" variant="outline" onClick={markCancelled} className="h-14 px-8 rounded-2xl text-red-500 border-red-100 bg-red-50/50 hover:bg-red-600 hover:text-white font-black shadow-sm transition-all hover:scale-105 active:scale-95 text-sm uppercase">
                <XCircle className="h-5 w-5" />
                {toGreekUpperCase('Ακύρωση')}
              </Button>
            </div>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl text-red-300 border-zinc-100 hover:bg-red-50 hover:text-red-500 transition-all border-none">
                <Trash2 className="h-6 w-6" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] p-10 max-w-md border-zinc-100 shadow-2xl">
              <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Trash2 className="h-10 w-10 text-red-500" />
              </div>
              <AlertDialogHeader className="text-center">
                <AlertDialogTitle className="text-2xl font-black text-zinc-900">{toGreekUpperCase('Διαγραφή προπόνησης;')}</AlertDialogTitle>
                <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-3">Είστε σίγουροι; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
                <AlertDialogCancel className="h-14 px-8 rounded-2xl font-black text-zinc-400 flex-1 text-lg border-none shadow-none">{toGreekUpperCase('Ακύρωση')}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete} className="h-14 px-8 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white flex-1 text-lg shadow-lg shadow-red-200">{toGreekUpperCase('Διαγραφή')}</AlertDialogAction>
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

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-zinc-100 p-1.5 w-full sm:w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'attendance') initAttendance(); }}
              className={`flex flex-1 sm:flex-none items-center justify-center gap-3 px-6 py-4 rounded-[14px] text-[16px] font-black transition-all duration-200 uppercase tracking-tight ${
                activeTab === tab.id
                  ? 'bg-white shadow-xl text-emerald-600 scale-105 z-10'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              {toGreekUpperCase(tab.label)}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-[2rem] border border-zinc-100 bg-white p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                    <Calendar className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Τμήμα')}</span>
              </div>
              <p className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase truncate">{toGreekUpperCase(getSquadName(session.squadId))}</p>
            </div>
            
            <div className="rounded-[2rem] border border-zinc-100 bg-white p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                    <Users className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Προπονητής')}</span>
              </div>
              <p className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase truncate">{toGreekUpperCase(session.coachName)}</p>
            </div>
            
            <div className="rounded-[2rem] border border-zinc-100 bg-white p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                    <Clock className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Ώρα')}</span>
              </div>
              <p className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase">{session.startTime} - {session.endTime}</p>
            </div>
            
            <div className="rounded-[2rem] border border-zinc-100 bg-white p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 transition-colors">
                    <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">{toGreekUpperCase('Παρουσίες')}</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">
                {attendanceStats.present + attendanceStats.late} / {attendanceStats.total}
              </p>
            </div>
          </div>

          {/* Drills */}
          {session.drills.length > 0 && (
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Dumbbell className="h-32 w-32 rotate-12" />
               </div>
              <h3 className="text-xs font-black text-zinc-400 mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                {toGreekUpperCase(`Ασκήσεις (${session.drills.reduce((s, d) => s + d.duration, 0)} λεπτά)`)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {session.drills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-100/50 hover:bg-white hover:border-emerald-100 hover:shadow-md transition-all group">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-sm font-black text-emerald-700 shrink-0 shadow-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-black text-zinc-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors truncate">{toGreekUpperCase(drill.name)}</p>
                      {drill.description && <p className="text-xs font-medium text-zinc-400 uppercase tracking-tight line-clamp-1 mt-0.5">{toGreekUpperCase(drill.description)}</p>}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-zinc-100 text-[11px] font-black text-zinc-500 uppercase tracking-widest shrink-0">
                        {drill.duration}&apos;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm">
              <h3 className="text-xs font-black text-zinc-400 mb-6 uppercase tracking-[0.2em]">{toGreekUpperCase('Σημειώσεις')}</h3>
              <div className="bg-zinc-50/50 rounded-2xl p-6 border border-zinc-100/50">
                <p className="text-lg font-medium text-zinc-600 whitespace-pre-wrap leading-relaxed italic">{session.notes}</p>
              </div>
            </div>
          )}

          {/* Attendance summary */}
          {session.attendance.length > 0 && (
            <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 shadow-sm">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">{toGreekUpperCase('Απουσιολόγιο')}</h3>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[12px] uppercase">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        {toGreekUpperCase(`Παρόντες: ${attendanceStats.present}`)}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 font-black text-[12px] uppercase">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        {toGreekUpperCase(`Αργοπορία: ${attendanceStats.late}`)}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100 font-black text-[12px] uppercase">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        {toGreekUpperCase(`Απόντες: ${attendanceStats.absent}`)}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200 font-black text-[12px] uppercase">
                        <div className="h-2 w-2 rounded-full bg-zinc-400" />
                        {toGreekUpperCase(`Τραυματίες: ${attendanceStats.injured}`)}
                    </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {session.attendance.map((a) => (
                  <div key={a.athleteId} className="flex items-center justify-between p-5 rounded-2xl bg-zinc-50 border border-zinc-100/50 transition-all hover:bg-white hover:border-zinc-200 hover:shadow-sm group">
                    <span className="text-[15px] font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase truncate mr-2">{toGreekUpperCase(a.athleteName)}</span>
                    <span className={cn(
                        "text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest shrink-0 shadow-sm",
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[3rem] border border-zinc-100 bg-white p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
              <div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Απουσιολόγιο')}</h3>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">{athletes.length} {athletes.length === 1 ? 'ΑΘΛΗΤΗΣ' : 'ΑΘΛΗΤΕΣ'}</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'present' })))} className="h-14 px-8 rounded-2xl font-black text-emerald-600 border-emerald-100 bg-emerald-50/30 hover:bg-emerald-600 hover:text-white transition-all text-xs uppercase uppercase tracking-widest">
                  {toGreekUpperCase('Όλοι Παρόντες')}
                </Button>
                <Button variant="outline" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'absent' })))} className="h-14 px-8 rounded-2xl font-black text-red-500 border-red-100 bg-red-50/30 hover:bg-red-600 hover:text-white transition-all text-xs uppercase tracking-widest">
                  {toGreekUpperCase('Όλοι Απόντες')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {attendance.map((a) => (
                <div key={a.athleteId} className="flex flex-col xl:flex-row xl:items-center gap-8 p-8 rounded-[2.5rem] border border-zinc-100 bg-zinc-50/30 shadow-inner group hover:bg-white hover:border-emerald-100 hover:shadow-xl transition-all duration-300">
                  <div className="flex-1 min-w-0 flex items-center gap-5">
                    <div className="h-16 w-16 rounded-[1.25rem] bg-white border border-zinc-100 flex items-center justify-center text-xl font-black text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors shadow-sm">
                        {toGreekUpperCase(a.athleteName.charAt(0))}
                    </div>
                    <div>
                        <p className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{toGreekUpperCase(a.athleteName)}</p>
                        <div className="flex items-center gap-2 mt-1">
                             <div className={cn("h-2 w-2 rounded-full", (['present', 'late'].includes(a.status)) ? "bg-emerald-500" : "bg-red-500")} />
                             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{toGreekUpperCase(ATTENDANCE_STATUS_LABELS[a.status])}</p>
                        </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
                    {(['present', 'absent', 'late', 'injured'] as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateAthleteStatus(a.athleteId, status)}
                        className={cn(
                          "h-16 px-6 rounded-2xl text-[12px] font-black border transition-all active:scale-90 uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm",
                          a.status === status
                            ? ATTENDANCE_STATUS_COLORS[status].replace('border-','border-2 border-') + ' ring-8 ring-zinc-100/50 shadow-lg scale-105 z-10'
                            : 'border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50'
                        )}
                      >
                        {a.status === status && <CheckCircle2 className="h-4 w-4" />}
                        {toGreekUpperCase(ATTENDANCE_STATUS_LABELS[status])}
                      </button>
                    ))}
                  </div>
                  <div className="w-full xl:w-64">
                    <div className="relative">
                        <Input
                            placeholder={toGreekUpperCase('Προσθήκη σημείωσης...')}
                            value={a.note || ''}
                            onChange={(e) => updateAthleteNote(a.athleteId, e.target.value)}
                            className="h-16 pl-6 pr-6 text-sm font-bold bg-white border-zinc-200 rounded-2xl placeholder:text-zinc-300 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm group-hover:shadow-md"
                        />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {attendance.length === 0 && athletes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
                <Users className="h-16 w-16 text-zinc-200 mb-6" />
                <p className="text-xl font-bold text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Δεν υπάρχουν αθλητές σε αυτό το τμήμα')}</p>
              </div>
            )}
          </div>

          <div className="sticky bottom-8 z-30 px-4 max-w-2xl mx-auto">
            <Button onClick={saveAttendance} disabled={isSaving} className="h-20 w-full rounded-[1.5rem] bg-zinc-900 hover:bg-black text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all active:scale-95 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {isSaving ? (
                <><Loader2 className="h-8 w-8 animate-spin mr-4" /> <span className="text-xl font-black uppercase tracking-widest">{toGreekUpperCase('Αποθήκευση...')}</span></>
                ) : (
                <><Save className="h-8 w-8 mr-4 group-hover:scale-110 transition-transform text-emerald-400" /> <span className="text-xl font-black uppercase tracking-widest">{toGreekUpperCase('Αποθήκευση Απουσιολογίου')}</span></>
                )}
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Edit */}
      {activeTab === 'edit' && (
        <div className="rounded-[3rem] border border-zinc-100 bg-white p-12 shadow-sm max-w-4xl mx-auto space-y-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
                    <Pencil className="h-5 w-5" />
                </div>
                {toGreekUpperCase('Βασικές Πληροφορίες')}
            </h3>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Τίτλος Προπόνησης')}</Label>
                <Input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-16 px-6 bg-zinc-50/50 rounded-2xl border-zinc-100 text-lg font-bold shadow-sm focus:ring-emerald-500 focus:bg-white transition-all uppercase"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Τύπος Προπόνησης')}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {TRAINING_TYPES.map((type) => {
                    const colors = TRAINING_TYPE_COLORS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditForm((p) => ({ ...p, type }))}
                        className={cn(
                          "h-14 px-4 rounded-2xl text-[11px] font-black transition-all border uppercase tracking-widest shadow-sm",
                          editForm.type === type
                            ? `${colors.bg} ${colors.text} ${colors.border} scale-105 shadow-md ring-4 ring-zinc-100`
                            : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                        )}
                      >
                        {toGreekUpperCase(TRAINING_TYPE_LABELS[type])}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Τμήμα')}</Label>
                  <Select value={editForm.squadId || ''} onValueChange={(val: string) => setEditForm((p) => ({ ...p, squadId: val }))}>
                    <SelectTrigger className="h-16 px-6 bg-zinc-50/50 rounded-2xl border-zinc-100 text-lg font-bold shadow-sm focus:ring-emerald-500 focus:bg-white uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                        {squads.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold text-lg">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Προπονητής')}</Label>
                  <Select value={editForm.coachId || ''} onValueChange={(val: string) => setEditForm((p) => ({ ...p, coachId: val }))}>
                    <SelectTrigger className="h-16 px-6 bg-zinc-50/50 rounded-2xl border-zinc-100 text-lg font-bold shadow-sm focus:ring-emerald-500 focus:bg-white uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                        {coaches.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="font-bold text-lg">{toGreekUpperCase(c.displayName)}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Ημερομηνία')}</Label>
                  <Input type="date" value={editForm.date || ''} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className="h-16 px-6 bg-zinc-50/50 rounded-2xl border-zinc-100 text-lg font-bold shadow-sm active:bg-white" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Έναρξη')}</Label>
                  <Input type="time" value={editForm.startTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="h-16 px-6 bg-zinc-50/50 rounded-2xl border-zinc-100 text-lg font-bold shadow-sm" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Λήξη')}</Label>
                  <Input type="time" value={editForm.endTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="h-16 px-6 bg-zinc-50/50 rounded-2xl border-zinc-100 text-lg font-bold shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Edit Drills */}
          <div className="space-y-8 pt-12 border-t border-zinc-100">
            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
                    <Dumbbell className="h-5 w-5" />
                </div>
                {toGreekUpperCase('Ασκήσεις Προπόνησης')}
            </h3>
            
            {editDrills.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {editDrills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-6 p-6 rounded-2xl border border-zinc-100 bg-zinc-50/30 group hover:bg-white hover:border-red-100 transition-all">
                    <div className="h-12 w-12 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-lg font-black text-zinc-400 group-hover:text-emerald-500 shadow-sm transition-colors">
                        {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase(drill.name)}</p>
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">{drill.duration} ΛΕΠΤΑ {drill.description ? ` — ${toGreekUpperCase(drill.description)}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => setEditDrills((p) => p.filter((_, idx) => idx !== i))} className="h-12 w-12 rounded-xl flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all">
                      <Trash2 className="h-6 w-6" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="rounded-[2.5rem] border border-zinc-100 bg-zinc-50/30 p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-6">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Όνομα Άσκησης')}</Label>
                    <Input placeholder={toGreekUpperCase('π.χ. Προθέρμανση...')} value={newDrill.name} onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))} className="h-16 px-6 bg-white rounded-2xl border-zinc-100 text-lg font-bold shadow-sm focus:ring-emerald-500 uppercase" />
                </div>
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Διάρκεια')}</Label>
                    <Input type="number" placeholder="0" value={newDrill.duration} onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))} className="h-16 px-6 bg-white rounded-2xl border-zinc-100 text-lg font-bold shadow-sm focus:ring-emerald-500 text-center" min={1} />
                </div>
              </div>
              <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Περιγραφή (Προαιρετικό)')}</Label>
                    <Input placeholder={toGreekUpperCase('Λεπτομέρειες άσκησης...')} value={newDrill.description} onChange={(e) => setNewDrill((p) => ({ ...p, description: e.target.value }))} className="h-16 px-6 bg-white rounded-2xl border-zinc-100 text-lg font-bold shadow-sm focus:ring-emerald-500 uppercase" />
              </div>
              <Button type="button" variant="outline" onClick={addEditDrill} disabled={!newDrill.name.trim()} className="h-16 w-full rounded-2xl font-black text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-sm uppercase tracking-widest shadow-sm">
                <Plus className="h-6 w-6" /> {toGreekUpperCase('Προσθήκη Άσκησης')}
              </Button>
            </div>
          </div>

          <div className="space-y-4 pt-12 border-t border-zinc-100">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Γενικές Σημειώσεις')}</Label>
            <textarea
              value={editForm.notes || ''}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              rows={4}
              className="flex w-full rounded-[2rem] border border-zinc-100 bg-zinc-50/50 px-8 py-6 text-lg font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner uppercase placeholder:text-zinc-300"
              placeholder={toGreekUpperCase('Σημειώσεις για αυτή την προπόνηση...')}
            />
          </div>

          <div className="flex gap-4 pt-12 border-t border-zinc-100">
            <Button variant="outline" className="flex-1 h-20 rounded-[1.5rem] font-black text-zinc-400 hover:text-zinc-600 border-none bg-zinc-50 hover:bg-zinc-100 transition-all text-xl uppercase tracking-widest" onClick={() => setActiveTab('overview')}>{toGreekUpperCase('Ακύρωση')}</Button>
            <Button className="flex-1 h-20 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98] text-xl uppercase tracking-widest" onClick={saveEdit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-8 w-8 animate-spin mr-3" /> {toGreekUpperCase('Αποθήκευση...')}</> : <><Save className="h-8 w-8 mr-3" /> {toGreekUpperCase('Αποθήκευση Αλλαγών')}</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
