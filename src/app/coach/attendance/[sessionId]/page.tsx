'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Users,
  Loader2,
  CheckCheck,
  XCircle,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trainingService } from '@/lib/training-services';
import { academyUserService, userGroupService } from '@/lib/academy-services';
import type { TrainingSession, TrainingAttendance, AttendanceStatus } from '@/types/training';
import type { AcademyUser } from '@/types/academy';

const STATUS_CONFIG: Record<AttendanceStatus, { icon: typeof Check; color: string; bgActive: string; label: string }> = {
  present: { icon: Check, color: 'text-emerald-600', bgActive: 'bg-emerald-500 text-white shadow-emerald-200', label: 'Παρών' },
  absent: { icon: X, color: 'text-red-600', bgActive: 'bg-red-500 text-white shadow-red-200', label: 'Απών' },
  late: { icon: Clock, color: 'text-amber-600', bgActive: 'bg-amber-500 text-white shadow-amber-200', label: 'Αργοπορία' },
  injured: { icon: AlertTriangle, color: 'text-zinc-500', bgActive: 'bg-zinc-500 text-white shadow-zinc-200', label: 'Τραυματίας' },
};

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent', 'injured'];

export default function CoachAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const { venueOwner, isLoading: authLoading } = useAuth();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [, setAthletes] = useState<AcademyUser[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Load session data
  useEffect(() => {
    if (authLoading || !venueOwner) return;

    const loadData = async () => {
      try {
        const sessionData = await trainingService.getById(sessionId);
        if (!sessionData || sessionData.venueId !== venueOwner.venueId) {
          router.push('/management/academy/training');
          return;
        }
        setSession(sessionData);

        // Load athletes for this squad
        const groups = await userGroupService.getByVenue(venueOwner.venueId);
        const athleteGroups = groups.filter(g => g.capabilities?.includes('squad_assignment'));
        const allUsers = await academyUserService.getByVenue(venueOwner.venueId);
        const squadAthletes = allUsers.filter(u =>
          athleteGroups.some(g => g.id === u.groupId) &&
          ((u.squad_ids || []).includes(sessionData.squadId) || u.squad_id === sessionData.squadId)
        );
        setAthletes(squadAthletes);

        // Initialize attendance
        if (sessionData.attendance && sessionData.attendance.length > 0) {
          setAttendance(sessionData.attendance);
        } else {
          setAttendance(squadAthletes.map(a => ({
            athleteId: a.id,
            athleteName: a.displayName,
            status: 'present' as AttendanceStatus,
          })));
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [sessionId, venueOwner, authLoading, router]);

  const updateStatus = useCallback((athleteId: string, status: AttendanceStatus) => {
    setAttendance(prev => prev.map(a =>
      a.athleteId === athleteId ? { ...a, status } : a
    ));
    setHasChanges(true);
    setSavedAt(null);
  }, []);

  const cycleStatus = useCallback((athleteId: string) => {
    setAttendance(prev => prev.map(a => {
      if (a.athleteId !== athleteId) return a;
      const currentIdx = STATUS_ORDER.indexOf(a.status);
      const nextIdx = (currentIdx + 1) % STATUS_ORDER.length;
      return { ...a, status: STATUS_ORDER[nextIdx] };
    }));
    setHasChanges(true);
    setSavedAt(null);
  }, []);

  const markAll = useCallback((status: AttendanceStatus) => {
    setAttendance(prev => prev.map(a => ({ ...a, status })));
    setHasChanges(true);
    setSavedAt(null);
  }, []);

  const handleSave = async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      await trainingService.updateAttendance(session.id, attendance);
      setHasChanges(false);
      const now = new Date();
      setSavedAt(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (err) {
      console.error('Failed to save attendance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Stats
  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    injured: attendance.filter(a => a.status === 'injured').length,
    total: attendance.length,
  };
  const presentTotal = stats.present + stats.late;

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <p className="text-zinc-400">Η προπόνηση δεν βρέθηκε</p>
      </div>
    );
  }

  const dateStr = new Date(session.date + 'T00:00:00').toLocaleDateString('el-GR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header — sticky */}
      <div className="sticky top-0 z-50 bg-white border-b border-zinc-100 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-zinc-400 active:text-zinc-600 -ml-1 p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center flex-1 px-2">
              <p className="text-sm font-black text-zinc-900 truncate">{session.title}</p>
              <p className="text-[11px] text-zinc-400 font-medium">
                {dateStr} • {session.startTime} - {session.endTime}
              </p>
            </div>
            <div className="w-8" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => markAll('present')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs active:bg-emerald-100 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Όλοι Παρόντες
          </button>
          <button
            onClick={() => markAll('absent')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-xs active:bg-red-100 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Όλοι Απόντες
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-black text-zinc-900">{presentTotal}/{stats.total}</span>
            <span className="text-zinc-400">Παρόντες</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {stats.late > 0 && (
              <span className="text-[12px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {stats.late} αργ.
              </span>
            )}
            {stats.injured > 0 && (
              <span className="text-[12px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                {stats.injured} τραυμ.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Athletes List */}
      <div className="flex-1 px-4 py-3 space-y-2 pb-28">
        {attendance.map((record) => {
          const config = STATUS_CONFIG[record.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={record.athleteId}
              className={cn(
                "bg-white rounded-2xl p-3 shadow-sm transition-all active:scale-[0.98]",
                record.status === 'present' && "border-l-4 border-l-emerald-400",
                record.status === 'absent' && "border-l-4 border-l-red-400",
                record.status === 'late' && "border-l-4 border-l-amber-400",
                record.status === 'injured' && "border-l-4 border-l-zinc-300",
              )}
            >
              <div className="flex items-center gap-3">
                {/* Tap to cycle status */}
                <button
                  onClick={() => cycleStatus(record.athleteId)}
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all active:scale-90",
                    config.bgActive,
                  )}
                >
                  <StatusIcon className="h-6 w-6" />
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">{record.athleteName}</p>
                  <p className={cn("text-[11px] font-semibold", config.color)}>{config.label}</p>
                </div>

                {/* Status buttons */}
                <div className="flex gap-1">
                  {STATUS_ORDER.map(status => {
                    const sc = STATUS_CONFIG[status];
                    const Icon = sc.icon;
                    const isActive = record.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => updateStatus(record.athleteId, status)}
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-90",
                          isActive ? sc.bgActive : "bg-zinc-50 text-zinc-300 hover:bg-zinc-100",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Save Bar — sticky */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-zinc-100 safe-area-bottom">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            {savedAt && !hasChanges ? (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" />
                Αποθηκεύτηκε {savedAt}
              </p>
            ) : hasChanges ? (
              <p className="text-xs text-amber-600 font-semibold">
                Μη αποθηκευμένες αλλαγές
              </p>
            ) : (
              <p className="text-xs text-zinc-400 font-medium">
                {presentTotal}/{stats.total} Παρόντες
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
              hasChanges
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                : "bg-zinc-100 text-zinc-400",
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  );
}
