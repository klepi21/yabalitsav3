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
  Save, UserCheck, Plus, ClipboardList, X, Repeat,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface PageProps { params: Promise<{ id: string }>; }
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
  const [recurringEditScope, setRecurringEditScope] = useState<'one' | 'future' | 'all'>('one');
  const [recurringDeleteScope, setRecurringDeleteScope] = useState<'one' | 'future' | 'all'>('one');
  const [recurringCount, setRecurringCount] = useState(0);

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
        const coachGroup = groups.find((g) => g.capabilities?.includes('coach_squads'));
        if (coachGroup) {
          const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
          setCoaches(coachUsers);
        }
        const athleteGroups = groups.filter((g) => g.capabilities?.includes('squad_assignment'));
        const allUsers = await academyUserService.getByVenue(venueId);
        const squadAthletes = allUsers.filter((u) =>
          athleteGroups.some((g) => g.id === u.groupId) &&
          ((u.squad_ids || []).includes(sessionData.squadId) || u.squad_id === sessionData.squadId)
        );
        setAthletes(squadAthletes);
        // Load recurring group count
        if (sessionData.recurringGroupId) {
          const grouped = await trainingService.getByRecurringGroup(sessionData.recurringGroupId);
          setRecurringCount(grouped.length);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, user, venueOwner, authLoading, router, venueId, pathname]);

  const initAttendance = () => {
    if (attendance.length > 0) return;
    setAttendance(athletes.map((a) => ({ athleteId: a.id, athleteName: a.displayName, status: 'present' as AttendanceStatus })));
  };

  const updateAthleteStatus = (athleteId: string, status: AttendanceStatus) => {
    setAttendance((prev) => prev.map((a) => a.athleteId === athleteId ? { ...a, status } : a));
  };

  const updateAthleteNote = (athleteId: string, note: string) => {
    setAttendance((prev) => prev.map((a) => a.athleteId === athleteId ? { ...a, note: note || undefined } : a));
  };

  const saveAttendance = async () => {
    try {
      setIsSaving(true);
      await trainingService.updateAttendance(id, attendance);
      setSession((prev) => prev ? { ...prev, attendance } : prev);
      setActiveTab('overview');
    } catch (err) { setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης'); }
    finally { setIsSaving(false); }
  };

  const saveEdit = async () => {
    try {
      setIsSaving(true); setError(null);
      const coach = coaches.find((c) => c.id === editForm.coachId);
      // Fields that apply to all recurring sessions (not date-specific)
      const sharedFields: Partial<TrainingSession> = {
        title: editForm.title, squadId: editForm.squadId,
        startTime: editForm.startTime, endTime: editForm.endTime, type: editForm.type,
        coachId: editForm.coachId, coachName: coach?.displayName || session?.coachName || '',
        assistantCoachIds: editForm.assistantCoachIds, notes: editForm.notes,
        drills: editDrills.map((d) => ({ name: d.name, duration: d.duration, ...(d.description ? { description: d.description } : {}) })),
      };

      if (session?.recurringGroupId && recurringEditScope !== 'one') {
        if (recurringEditScope === 'all') {
          await trainingService.updateRecurringAll(session.recurringGroupId, sharedFields);
        } else {
          await trainingService.updateRecurringFuture(session.recurringGroupId, session.date, sharedFields);
        }
      } else {
        await trainingService.update(id, { ...sharedFields, date: editForm.date });
      }

      const updated = await trainingService.getById(id);
      if (updated) { setSession(updated); setEditForm(updated); setEditDrills(updated.drills || []); }
      setActiveTab('overview');
    } catch (err) { setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    try {
      if (session?.recurringGroupId && recurringDeleteScope !== 'one') {
        if (recurringDeleteScope === 'all') {
          await trainingService.deleteRecurringAll(session.recurringGroupId);
        } else {
          await trainingService.deleteRecurringFuture(session.recurringGroupId, session.date);
        }
      } else {
        await trainingService.delete(id);
      }
      router.push('/management/academy/training');
    } catch (err) { setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής'); }
  };

  const markCompleted = async () => {
    try { await trainingService.markCompleted(id); setSession((prev) => prev ? { ...prev, status: 'completed' } : prev); }
    catch (err) { setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης'); }
  };

  const markCancelled = async () => {
    try { await trainingService.markCancelled(id); setSession((prev) => prev ? { ...prev, status: 'cancelled' } : prev); }
    catch (err) { setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης'); }
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

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Ολοκληρώθηκε';
      case 'cancelled': return 'Ακυρώθηκε';
      default: return 'Προγραμματισμένη';
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;

  if (!session) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Dumbbell className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Η προπόνηση δεν βρέθηκε</h2>
        <Button asChild className="mt-4"><Link href="/management/academy/training">Πίσω</Link></Button>
      </div>
    </div>
  );

  const typeColor = TRAINING_TYPE_COLORS[session.type];
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Επισκόπηση', icon: ClipboardList },
    { id: 'attendance', label: 'Απουσιολόγιο', icon: UserCheck },
    { id: 'edit', label: 'Επεξεργασία', icon: Pencil },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-zinc-50">
        <div className="flex items-center gap-3.5">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-zinc-200 shrink-0" asChild>
            <Link href="/management/academy/training"><ArrowLeft className="h-4 w-4 text-zinc-400" /></Link>
          </Button>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg", typeColor.bg)}>
            <Dumbbell className={cn("h-6 w-6", typeColor.text)} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase(session.title)}</h1>
              <span className={cn("text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest", typeColor.bg, typeColor.text, typeColor.border)}>
                {toGreekUpperCase(TRAINING_TYPE_LABELS[session.type])}
              </span>
              <span className={cn(
                "text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest",
                session.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                session.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                "bg-blue-50 text-blue-600 border-blue-100"
              )}>
                {toGreekUpperCase(statusLabel(session.status || ''))}
              </span>
              {session.recurringGroupId && (
                <span className="text-[8px] font-black px-2 py-1 rounded-lg border border-violet-100 bg-violet-50 text-violet-600 uppercase tracking-widest flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {recurringCount > 0 ? `${recurringCount} προπ.` : 'Επαναλ.'}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-zinc-400 mt-0.5 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              {new Date(session.date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
              <span className="text-zinc-200">|</span>
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              {session.startTime} - {session.endTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session.status === 'scheduled' && (
            <>
              <Button variant="outline" size="sm" onClick={markCompleted} className="h-9 px-4 rounded-lg text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white font-bold text-[10px] uppercase">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{toGreekUpperCase('Ολοκλήρωση')}
              </Button>
              <Button variant="outline" size="sm" onClick={markCancelled} className="h-9 px-4 rounded-lg text-red-500 border-red-100 bg-red-50/50 hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase">
                <XCircle className="h-3.5 w-3.5 mr-1.5" />{toGreekUpperCase('Ακύρωση')}
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl p-6 max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-black text-zinc-900">{toGreekUpperCase('Διαγραφή προπόνησης;')}</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-zinc-500">Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</AlertDialogDescription>
              </AlertDialogHeader>
              {session.recurringGroupId && recurringCount > 1 && (
                <div className="space-y-2 mt-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Εύρος διαγραφής')}</p>
                  {([
                    { value: 'one' as const, label: 'Μόνο αυτή', desc: 'Διαγραφή μόνο αυτής της προπόνησης' },
                    { value: 'future' as const, label: 'Αυτή & μελλοντικές', desc: `Από ${new Date(session.date + 'T00:00:00').toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })} και μετά` },
                    { value: 'all' as const, label: `Όλες (${recurringCount})`, desc: 'Διαγραφή ολόκληρης της σειράς' },
                  ]).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setRecurringDeleteScope(value)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all",
                        recurringDeleteScope === value
                          ? "border-red-300 bg-red-50"
                          : "border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                      <p className="text-xs font-bold text-zinc-900">{label}</p>
                      <p className="text-[10px] text-zinc-400">{desc}</p>
                    </button>
                  ))}
                </div>
              )}
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="h-10 rounded-xl font-bold text-sm">{toGreekUpperCase('Ακύρωση')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="h-10 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white text-sm">{toGreekUpperCase('Διαγραφή')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-sm font-bold text-red-700">{error}</p></div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-full sm:w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'attendance') initAttendance(); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === tab.id ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              <Icon className="h-3.5 w-3.5" />{toGreekUpperCase(tab.label)}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: 'Τμήμα', value: getSquadName(session.squadId) },
              { icon: Users, label: 'Προπονητής', value: session.coachName },
              { icon: Clock, label: 'Ώρα', value: `${session.startTime} - ${session.endTime}` },
              { icon: UserCheck, label: 'Παρουσίες', value: `${attendanceStats.present + attendanceStats.late} / ${attendanceStats.total}`, highlight: true },
            ].map(({ icon: Icon, label, value, highlight }) => (
              <div key={label} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", highlight ? "bg-emerald-50 text-emerald-500" : "bg-zinc-50 text-zinc-400")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase(label)}</span>
                </div>
                <p className={cn("text-sm font-black uppercase truncate", highlight ? "text-emerald-600" : "text-zinc-900")}>{toGreekUpperCase(value)}</p>
              </div>
            ))}
          </div>

          {session.drills.length > 0 && (
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
              <h3 className="text-[9px] font-black text-zinc-400 mb-4 uppercase tracking-widest">
                {toGreekUpperCase(`Ασκήσεις (${session.drills.reduce((s, d) => s + d.duration, 0)} λεπτά)`)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {session.drills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100/50 hover:bg-white hover:shadow-sm transition-all">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700 shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{drill.name}</p>
                      {drill.description && <p className="text-[10px] text-zinc-400 truncate">{drill.description}</p>}
                    </div>
                    <span className="px-2 py-1 rounded-md bg-white border border-zinc-100 text-[9px] font-black text-zinc-500 shrink-0">{drill.duration}&apos;</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.notes && (
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
              <h3 className="text-[9px] font-black text-zinc-400 mb-3 uppercase tracking-widest">{toGreekUpperCase('Σημειώσεις')}</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap bg-zinc-50 rounded-xl p-4 border border-zinc-100/50">{session.notes}</p>
            </div>
          )}

          {session.attendance.length > 0 && (
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Απουσιολόγιο')}</h3>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: `Παρόντες: ${attendanceStats.present}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
                    { label: `Αργοπορία: ${attendanceStats.late}`, color: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
                    { label: `Απόντες: ${attendanceStats.absent}`, color: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
                    { label: `Τραυματίες: ${attendanceStats.injured}`, color: 'bg-zinc-50 text-zinc-600 border-zinc-200', dot: 'bg-zinc-400' },
                  ].map(({ label, color, dot }) => (
                    <div key={label} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase", color)}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", dot)} />{toGreekUpperCase(label)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {session.attendance.map((a) => (
                  <div key={a.athleteId} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100/50 hover:bg-white hover:shadow-sm transition-all">
                    <span className="text-xs font-bold text-zinc-900 uppercase truncate mr-2">{toGreekUpperCase(a.athleteName)}</span>
                    <span className={cn("text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider shrink-0", ATTENDANCE_STATUS_COLORS[a.status])}>
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
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-base font-black text-zinc-900 uppercase">{toGreekUpperCase('Απουσιολόγιο')}</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{athletes.length} αθλητές</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'present' })))} className="h-9 px-4 rounded-lg text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white font-bold text-[10px] uppercase">
                  {toGreekUpperCase('Όλοι Παρόντες')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'absent' })))} className="h-9 px-4 rounded-lg text-red-500 border-red-100 bg-red-50/50 hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase">
                  {toGreekUpperCase('Όλοι Απόντες')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {attendance.map((a) => (
                <div key={a.athleteId} className="flex flex-col xl:flex-row xl:items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/30 hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white border border-zinc-100 flex items-center justify-center text-xs font-black text-zinc-400 shrink-0">
                      {a.athleteName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 uppercase">{toGreekUpperCase(a.athleteName)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", (['present', 'late'].includes(a.status)) ? "bg-emerald-500" : "bg-red-500")} />
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase(ATTENDANCE_STATUS_LABELS[a.status])}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['present', 'absent', 'late', 'injured'] as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateAthleteStatus(a.athleteId, status)}
                        className={cn(
                          "h-8 px-3 rounded-lg text-[8px] font-black border transition-all uppercase tracking-wider",
                          a.status === status
                            ? ATTENDANCE_STATUS_COLORS[status] + ' shadow-sm'
                            : 'border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300'
                        )}
                      >
                        {toGreekUpperCase(ATTENDANCE_STATUS_LABELS[status])}
                      </button>
                    ))}
                  </div>
                  <div className="w-full xl:w-48">
                    <Input
                      placeholder={toGreekUpperCase('Σημείωση...')}
                      value={a.note || ''}
                      onChange={(e) => updateAthleteNote(a.athleteId, e.target.value)}
                      className="h-8 text-xs font-bold bg-white border-zinc-200 rounded-lg placeholder:text-zinc-300"
                    />
                  </div>
                </div>
              ))}
            </div>

            {attendance.length === 0 && athletes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                <Users className="h-8 w-8 text-zinc-200 mb-3" />
                <p className="text-sm font-bold text-zinc-400">{toGreekUpperCase('Δεν υπάρχουν αθλητές')}</p>
              </div>
            )}
          </div>

          <div className="sticky bottom-4 z-30 max-w-md mx-auto">
            <Button onClick={saveAttendance} disabled={isSaving} className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white shadow-xl font-bold text-sm uppercase active:scale-[0.98] transition-all">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2 text-emerald-400" />}
              {toGreekUpperCase('Αποθήκευση Απουσιολογίου')}
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Edit */}
      {activeTab === 'edit' && (
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 flex items-center justify-center text-white"><Pencil className="h-4 w-4" /></div>
              <h3 className="text-base font-black text-zinc-900 uppercase">{toGreekUpperCase('Βασικές Πληροφορίες')}</h3>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τίτλος')}</Label>
              <Input value={editForm.title || ''} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} className="h-11 px-4 bg-zinc-50 rounded-xl border-none font-bold text-sm uppercase" />
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τύπος')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TRAINING_TYPES.map((type) => {
                  const colors = TRAINING_TYPE_COLORS[type];
                  return (
                    <button key={type} type="button" onClick={() => setEditForm((p) => ({ ...p, type }))}
                      className={cn("h-10 px-3 rounded-xl text-[9px] font-black border uppercase tracking-wider transition-all",
                        editForm.type === type ? `${colors.bg} ${colors.text} ${colors.border} shadow-md ring-2 ring-zinc-100` : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                      )}>{toGreekUpperCase(TRAINING_TYPE_LABELS[type])}</button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τμήμα')}</Label>
                <Select value={editForm.squadId || ''} onValueChange={(val: string) => setEditForm((p) => ({ ...p, squadId: val }))}>
                  <SelectTrigger className="h-11 px-4 bg-zinc-50 border-none rounded-xl font-bold text-sm uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{squads.map((s) => (<SelectItem key={s.id} value={s.id} className="font-bold text-sm">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Προπονητής')}</Label>
                <Select value={editForm.coachId || ''} onValueChange={(val: string) => setEditForm((p) => ({ ...p, coachId: val }))}>
                  <SelectTrigger className="h-11 px-4 bg-zinc-50 border-none rounded-xl font-bold text-sm uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{coaches.map((c) => (<SelectItem key={c.id} value={c.id} className="font-bold text-sm">{toGreekUpperCase(c.displayName)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Ημερομηνία')}</Label>
                <Input type="date" value={editForm.date || ''} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className="h-11 px-4 bg-zinc-50 rounded-xl border-none font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Έναρξη')}</Label>
                <Input type="time" value={editForm.startTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="h-11 px-4 bg-zinc-50 rounded-xl border-none font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Λήξη')}</Label>
                <Input type="time" value={editForm.endTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="h-11 px-4 bg-zinc-50 rounded-xl border-none font-bold text-sm" />
              </div>
            </div>
          </div>

          {/* Edit Drills */}
          <div className="space-y-4 pt-5 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center"><Dumbbell className="h-4 w-4 text-violet-600" /></div>
              <h3 className="text-base font-black text-zinc-900 uppercase">{toGreekUpperCase('Ασκήσεις')}</h3>
            </div>

            {editDrills.length > 0 && (
              <div className="space-y-2">
                {editDrills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-lg bg-white border border-zinc-100 flex items-center justify-center text-sm font-black text-zinc-400">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900">{drill.name}</p>
                      <p className="text-[10px] text-zinc-400">{drill.duration} λεπτά{drill.description ? ` — ${drill.description}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => setEditDrills((p) => p.filter((_, idx) => idx !== i))} className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <Input placeholder="Όνομα άσκησης..." value={newDrill.name} onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))} className="h-10 bg-white border-none rounded-lg px-3 font-bold text-sm" />
                <Input type="number" value={newDrill.duration} onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))} className="h-10 bg-white border-none rounded-lg px-3 text-center font-black text-sm" min={1} />
              </div>
              <Input placeholder="Περιγραφή (προαιρετικά)..." value={newDrill.description} onChange={(e) => setNewDrill((p) => ({ ...p, description: e.target.value }))} className="h-10 bg-white border-none rounded-lg px-3 font-bold text-sm" />
              <Button type="button" variant="outline" onClick={addEditDrill} disabled={!newDrill.name.trim()} className="h-10 w-full rounded-lg border-zinc-200 font-bold text-xs">
                <Plus className="h-4 w-4 mr-2 text-violet-600" />{toGreekUpperCase('Προσθήκη')}
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-5 border-t border-zinc-100">
            <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Σημειώσεις')}</Label>
            <textarea
              value={editForm.notes || ''} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
              className="w-full rounded-xl bg-zinc-50 border-none p-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-zinc-300 resize-none"
              placeholder="Σημειώσεις..."
            />
          </div>

          {/* Recurring edit scope */}
          {session.recurringGroupId && recurringCount > 1 && (
            <div className="space-y-2 pt-5 border-t border-zinc-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-violet-500" />
                {toGreekUpperCase('Εφαρμογή αλλαγών σε')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'one' as const, label: 'Μόνο αυτή' },
                  { value: 'future' as const, label: 'Αυτή & μελλοντικές' },
                  { value: 'all' as const, label: `Όλες (${recurringCount})` },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRecurringEditScope(value)}
                    className={cn(
                      "p-2.5 rounded-xl border text-[10px] font-bold transition-all text-center",
                      recurringEditScope === value
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-zinc-100 text-zinc-400 hover:border-zinc-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {recurringEditScope !== 'one' && (
                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 rounded-lg p-2 border border-amber-100">
                  Η ημερομηνία δεν θα αλλάξει στις υπόλοιπες προπονήσεις — μόνο τίτλος, ώρα, τμήμα, προπονητής, ασκήσεις & σημειώσεις.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-5 border-t border-zinc-100">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold text-sm text-zinc-400 border-zinc-200" onClick={() => setActiveTab('overview')}>{toGreekUpperCase('Ακύρωση')}</Button>
            <Button className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg text-sm uppercase active:scale-[0.98]" onClick={saveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {toGreekUpperCase(recurringEditScope !== 'one' && session.recurringGroupId ? 'Αποθήκευση Όλων' : 'Αποθήκευση')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
