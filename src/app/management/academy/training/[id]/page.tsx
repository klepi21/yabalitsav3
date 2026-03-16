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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-200 shrink-0" asChild>
            <Link href="/management/academy/training">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${typeColor.bg} flex items-center justify-center shrink-0`}>
              <Dumbbell className={`h-5 w-5 ${typeColor.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{session.title}</h1>
                <span className={`text-[11px] px-2 py-0.5 rounded-md border ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
                  {TRAINING_TYPE_LABELS[session.type]}
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">
                {new Date(session.date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}{session.startTime} - {session.endTime}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.status === 'scheduled' && (
            <>
              <Button size="sm" variant="outline" onClick={markCompleted} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                <CheckCircle2 className="h-4 w-4" />
                Ολοκλήρωση
              </Button>
              <Button size="sm" variant="outline" onClick={markCancelled} className="text-red-500 border-red-200 hover:bg-red-50">
                <XCircle className="h-4 w-4" />
                Ακύρωση
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Διαγραφή προπόνησης</AlertDialogTitle>
                <AlertDialogDescription>Είστε σίγουροι; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>Διαγραφή</AlertDialogAction>
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
      <div className="flex gap-1 rounded-xl bg-zinc-100/80 p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'attendance') initAttendance(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">Τμήμα</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900">{getSquadName(session.squadId)}</p>
            </div>
            <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">Προπονητής</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900">{session.coachName}</p>
            </div>
            <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">Ώρα</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900">{session.startTime} - {session.endTime}</p>
            </div>
            <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">Παρουσίες</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                {attendanceStats.present + attendanceStats.late}/{attendanceStats.total}
              </p>
            </div>
          </div>

          {/* Drills */}
          {session.drills.length > 0 && (
            <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-zinc-400" />
                Ασκήσεις ({session.drills.reduce((s, d) => s + d.duration, 0)} λεπτά)
              </h3>
              <div className="space-y-2">
                {session.drills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
                    <div className="h-7 w-7 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{drill.name}</p>
                      {drill.description && <p className="text-xs text-zinc-400">{drill.description}</p>}
                    </div>
                    <span className="text-xs text-zinc-400 font-mono shrink-0">{drill.duration}&apos;</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">Σημειώσεις</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}

          {/* Attendance summary */}
          {session.attendance.length > 0 && (
            <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-zinc-400" />
                Απουσιολόγιο
              </h3>
              <div className="flex gap-3 mb-4 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Παρόντες: {attendanceStats.present}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Αργοπορία: {attendanceStats.late}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200">Απόντες: {attendanceStats.absent}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">Τραυματίες: {attendanceStats.injured}</span>
              </div>
              <div className="space-y-1">
                {session.attendance.map((a) => (
                  <div key={a.athleteId} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50">
                    <span className="text-sm text-zinc-900">{a.athleteName}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md border ${ATTENDANCE_STATUS_COLORS[a.status]}`}>
                      {ATTENDANCE_STATUS_LABELS[a.status]}
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
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">Απουσιολόγιο — {athletes.length} αθλητές</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'present' })))}>
                  Όλοι Παρόντες
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAttendance((prev) => prev.map((a) => ({ ...a, status: 'absent' })))}>
                  Όλοι Απόντες
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {attendance.map((a) => (
                <div key={a.athleteId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{a.athleteName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['present', 'absent', 'late', 'injured'] as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateAthleteStatus(a.athleteId, status)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          a.status === status
                            ? ATTENDANCE_STATUS_COLORS[status]
                            : 'border-zinc-200 text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {ATTENDANCE_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Σημείωση..."
                    value={a.note || ''}
                    onChange={(e) => updateAthleteNote(a.athleteId, e.target.value)}
                    className="h-8 text-xs sm:max-w-[180px] bg-white"
                  />
                </div>
              ))}
            </div>

            {attendance.length === 0 && athletes.length === 0 && (
              <div className="text-center py-8 text-zinc-400 text-sm">
                Δεν υπάρχουν αθλητές σε αυτό το τμήμα
              </div>
            )}
          </div>

          <Button onClick={saveAttendance} disabled={isSaving} className="w-full h-11">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Αποθήκευση...</>
            ) : (
              <><Save className="h-4 w-4" /> Αποθήκευση Απουσιολογίου</>
            )}
          </Button>
        </div>
      )}

      {/* Tab: Edit */}
      {activeTab === 'edit' && (
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-zinc-700">Τίτλος</Label>
            <Input
              value={editForm.title || ''}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              className="h-11 bg-white"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-zinc-700">Τύπος</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TRAINING_TYPES.map((type) => {
                const colors = TRAINING_TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, type }))}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      editForm.type === type
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {TRAINING_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-zinc-700">Τμήμα</Label>
              <select
                value={editForm.squadId || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, squadId: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm appearance-none"
              >
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Προπονητής</Label>
              <select
                value={editForm.coachId || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, coachId: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm appearance-none"
              >
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-zinc-700">Ημερομηνία</Label>
              <Input type="date" value={editForm.date || ''} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className="h-11 bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Έναρξη</Label>
              <Input type="time" value={editForm.startTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="h-11 bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Λήξη</Label>
              <Input type="time" value={editForm.endTime || ''} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="h-11 bg-white" />
            </div>
          </div>

          {/* Edit Drills */}
          <div className="space-y-3">
            <Label className="text-zinc-700">Ασκήσεις</Label>
            {editDrills.length > 0 && (
              <div className="space-y-1.5">
                {editDrills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{drill.name}</p>
                      <p className="text-xs text-zinc-400">{drill.duration} λεπτά{drill.description ? ` — ${drill.description}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => setEditDrills((p) => p.filter((_, idx) => idx !== i))} className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-3">
                <Input placeholder="Άσκηση..." value={newDrill.name} onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))} className="h-10 bg-white" />
                <Input type="number" placeholder="Λεπτά" value={newDrill.duration} onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))} className="h-10 bg-white" min={1} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addEditDrill} disabled={!newDrill.name.trim()}>
                <Plus className="h-4 w-4" /> Προσθήκη
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-700">Σημειώσεις</Label>
            <textarea
              value={editForm.notes || ''}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100/60">
            <Button variant="outline" className="flex-1 h-11" onClick={() => setActiveTab('overview')}>Ακύρωση</Button>
            <Button className="flex-1 h-11" onClick={saveEdit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Αποθήκευση...</> : 'Αποθήκευση Αλλαγών'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
