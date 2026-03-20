'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachFilter } from '@/hooks/useCoachFilter';
import { trainingService } from '@/lib/training-services';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { TrainingSession, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from '@/types/training';
import { Squad, AcademyUser } from '@/types/academy';
import {
  Loader2, Plus, Search, Dumbbell, Clock, BarChart3,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  CalendarDays, List, Users,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, toGreekUpperCase } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS } from '@/types/training';

const GREEK_DAYS = ['ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ', 'ΚΥΡ'];
// Get Monday of the week for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TrainingListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const { filterSquads, isVisibleSquad } = useCoachFilter();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [coaches, setCoaches] = useState<AcademyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);
  const [attendanceSession, setAttendanceSession] = useState<TrainingSession | null>(null);
  const [attendanceEdits, setAttendanceEdits] = useState<Record<string, AttendanceStatus>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  // Month navigation (for list view)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [sessionsData, squadsData, groupsData] = await Promise.all([
          trainingService.getByVenue(venueId),
          squadService.getByVenue(venueId),
          userGroupService.getByVenue(venueId),
        ]);
        setSessions(sessionsData.filter(s => isVisibleSquad(s.squadId)));
        setSquads(filterSquads(squadsData));
        // Load coaches
        const coachGroup = groupsData.find((g) => g.capabilities?.includes('coach_squads'));
        if (coachGroup) {
          const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
          setCoaches(coachUsers);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname, filterSquads, isVisibleSquad]);

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? `${squad.name} (${squad.ageGroup})` : '—';
  };

  const getSquadColor = (squadId: string): string => {
    const idx = squads.findIndex((s) => s.id === squadId);
    const colors = [
      'border-l-emerald-500', 'border-l-blue-500', 'border-l-violet-500',
      'border-l-orange-500', 'border-l-rose-500', 'border-l-cyan-500',
      'border-l-amber-500', 'border-l-indigo-500',
    ];
    return colors[idx % colors.length] || 'border-l-zinc-300';
  };

  const getSquadBgColor = (squadId: string): string => {
    const idx = squads.findIndex((s) => s.id === squadId);
    const colors = [
      'bg-emerald-50', 'bg-blue-50', 'bg-violet-50',
      'bg-orange-50', 'bg-rose-50', 'bg-cyan-50',
      'bg-amber-50', 'bg-indigo-50',
    ];
    return colors[idx % colors.length] || 'bg-zinc-50';
  };

  // ---- Week view data ----
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}`;
    }
    return `${start.getDate()} ${start.toLocaleDateString('el-GR', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' })}`;
  }, [weekDays]);

  const navigateWeek = (dir: number) => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const goToToday = () => {
    setWeekStart(getWeekStart(new Date()));
    const now = new Date();
    setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const openQuickAttendance = (session: TrainingSession, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAttendanceSession(session);
    const edits: Record<string, AttendanceStatus> = {};
    for (const a of session.attendance) {
      edits[a.athleteId] = a.status;
    }
    setAttendanceEdits(edits);
  };

  const saveAttendance = async () => {
    if (!attendanceSession) return;
    setSavingAttendance(true);
    try {
      const updatedAttendance = attendanceSession.attendance.map((a) => ({
        ...a,
        status: attendanceEdits[a.athleteId] || a.status,
      }));
      await trainingService.updateAttendance(attendanceSession.id, updatedAttendance);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === attendanceSession.id ? { ...s, attendance: updatedAttendance } : s
        )
      );
      setAttendanceSession(null);
    } catch {
      setError('Αποτυχία αποθήκευσης απουσιολογίου');
    } finally {
      setSavingAttendance(false);
    }
  };

  const weekSessions = useMemo(() => {
    const startKey = formatDateKey(weekDays[0]);
    const endKey = formatDateKey(weekDays[6]);
    return sessions.filter((s) => {
      const matchesDate = s.date >= startKey && s.date <= endKey;
      const matchesSearch = searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.coachName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSquad = squadFilter === 'all' || s.squadId === squadFilter;
      const matchesCoach = coachFilter === 'all' || s.coachId === coachFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesDate && matchesSearch && matchesSquad && matchesCoach && matchesStatus;
    });
  }, [sessions, weekDays, searchQuery, squadFilter, coachFilter, statusFilter]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    for (const day of weekDays) {
      map.set(formatDateKey(day), []);
    }
    for (const s of weekSessions) {
      const arr = map.get(s.date);
      if (arr) arr.push(s);
    }
    // Sort by time
    for (const [, arr] of map) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [weekSessions, weekDays]);

  // ---- List view data ----
  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  const navigateMonth = (dir: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesMonth = s.date.startsWith(currentMonth);
      const matchesSearch = searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.coachName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSquad = squadFilter === 'all' || s.squadId === squadFilter;
      const matchesCoach = coachFilter === 'all' || s.coachId === coachFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesMonth && matchesSearch && matchesSquad && matchesCoach && matchesStatus;
    });
  }, [sessions, currentMonth, searchQuery, squadFilter, coachFilter, statusFilter]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    const sorted = [...filteredSessions].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    for (const s of sorted) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [filteredSessions]);

  // Stats (current view)
  const stats = useMemo(() => {
    const relevantSessions = viewMode === 'week' ? weekSessions : filteredSessions;
    return {
      total: relevantSessions.length,
      completed: relevantSessions.filter((s) => s.status === 'completed').length,
      scheduled: relevantSessions.filter((s) => s.status === 'scheduled').length,
    };
  }, [viewMode, weekSessions, filteredSessions]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'cancelled': return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      default: return <Clock className="h-3.5 w-3.5 text-blue-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Ολοκληρώθηκε';
      case 'cancelled': return 'Ακυρώθηκε';
      default: return 'Προγραμματισμένη';
    }
  };

  // Conflict detection: sessions on same day with overlapping times
  const getConflicts = (session: TrainingSession, daySessions: TrainingSession[]): TrainingSession[] => {
    return daySessions.filter((other) => {
      if (other.id === session.id) return false;
      if (session.status === 'cancelled' || other.status === 'cancelled') return false;
      // Check time overlap
      const aStart = session.startTime;
      const aEnd = session.endTime;
      const bStart = other.startTime;
      const bEnd = other.endTime;
      return aStart < bEnd && bStart < aEnd;
    });
  };

  const todayKey = formatDateKey(new Date());

  if (authLoading || isLoading) {
    return (
      <div className="space-y-8 pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-zinc-200 rounded" />
              <div className="h-3 w-48 bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 rounded-xl bg-zinc-100" />
            <div className="h-10 w-36 rounded-xl bg-zinc-200" />
          </div>
        </div>
        {/* View toggle + nav skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-44 rounded-xl bg-zinc-100" />
            <div className="h-10 w-64 rounded-xl bg-zinc-100" />
            <div className="h-8 w-20 rounded-lg bg-zinc-100" />
          </div>
          <div className="flex items-center gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 w-16 rounded-md bg-zinc-100" />
            ))}
          </div>
        </div>
        {/* Calendar skeleton */}
        <div className="rounded-2xl bg-zinc-100 h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
            <Dumbbell className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Προπονήσεις')}
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {toGreekUpperCase('Πρόγραμμα & Απουσιολόγιο')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="h-10 px-4 rounded-xl border-zinc-200 font-bold text-zinc-600 text-[11px] shadow-sm">
            <Link href="/management/academy/training/stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              {toGreekUpperCase('Στατιστικά')}
            </Link>
          </Button>
          <Button asChild className="h-10 px-5 rounded-xl bg-zinc-900 hover:bg-black text-white font-black shadow-md text-[11px]">
            <Link href="/management/academy/training/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              {toGreekUpperCase('Νέα Προπόνηση')}
            </Link>
          </Button>
        </div>
      </div>

      {/* View toggle + Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                viewMode === 'week' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {toGreekUpperCase('Εβδομάδα')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <List className="h-3.5 w-3.5" />
              {toGreekUpperCase('Λίστα')}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-100 p-1.5 shadow-sm">
            <button
              onClick={() => viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-black text-zinc-900 min-w-[200px] text-center capitalize">
              {viewMode === 'week' ? weekLabel : monthLabel}
            </span>
            <button
              onClick={() => viewMode === 'week' ? navigateWeek(1) : navigateMonth(1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-zinc-200"
          >
            {toGreekUpperCase('Σήμερα')}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-zinc-900 flex items-center justify-center">
              <span className="text-[10px] font-black text-white">{stats.total}</span>
            </div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase">{toGreekUpperCase('Σύνολο')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-emerald-100 flex items-center justify-center">
              <span className="text-[10px] font-black text-emerald-700">{stats.completed}</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase">{toGreekUpperCase('Ολοκλ.')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
              <span className="text-[10px] font-black text-blue-700">{stats.scheduled}</span>
            </div>
            <span className="text-[9px] font-bold text-blue-500 uppercase">{toGreekUpperCase('Προγρ.')}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder={toGreekUpperCase('Αναζήτηση...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 pr-4 bg-white rounded-lg border-zinc-100 shadow-sm font-bold text-xs placeholder:text-zinc-300 w-full uppercase"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={squadFilter} onValueChange={setSquadFilter}>
            <SelectTrigger className="h-10 px-4 rounded-lg bg-white border-zinc-100 shadow-sm font-bold text-xs min-w-[160px] uppercase">
              <SelectValue placeholder={toGreekUpperCase('Όλα τα τμήματα')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
              <SelectItem value="all" className="font-bold text-sm">{toGreekUpperCase('Όλα τα τμήματα')}</SelectItem>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id} className="font-bold text-sm">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {coaches.length > 0 && (
            <Select value={coachFilter} onValueChange={setCoachFilter}>
              <SelectTrigger className="h-10 px-4 rounded-lg bg-white border-zinc-100 shadow-sm font-bold text-xs min-w-[160px] uppercase">
                <SelectValue placeholder={toGreekUpperCase('Προπονητής')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                <SelectItem value="all" className="font-bold text-sm">{toGreekUpperCase('Όλοι οι Προπονητές')}</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-bold text-sm">{toGreekUpperCase(c.displayName)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 px-4 rounded-lg bg-white border-zinc-100 shadow-sm font-bold text-xs min-w-[160px] uppercase">
              <SelectValue placeholder={toGreekUpperCase('Καταστάσεις')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
              <SelectItem value="all" className="font-bold text-sm">{toGreekUpperCase('Όλες')}</SelectItem>
              <SelectItem value="scheduled" className="font-bold text-sm">{toGreekUpperCase('Προγραμματισμένες')}</SelectItem>
              <SelectItem value="completed" className="font-bold text-sm">{toGreekUpperCase('Ολοκληρωμένες')}</SelectItem>
              <SelectItem value="cancelled" className="font-bold text-sm">{toGreekUpperCase('Ακυρωμένες')}</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || squadFilter !== 'all' || coachFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => { setSearchQuery(''); setSquadFilter('all'); setCoachFilter('all'); setStatusFilter('all'); }}
              className="h-10 px-3 text-zinc-400 hover:text-red-500 font-bold rounded-lg hover:bg-red-50 text-[9px] uppercase tracking-widest"
            >
              {toGreekUpperCase('Καθαρισμός')}
            </Button>
          )}
        </div>
      </div>

      {/* ===== WEEK VIEW ===== */}
      {viewMode === 'week' && (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-zinc-100">
            {weekDays.map((day, i) => {
              const key = formatDateKey(day);
              const isToday = key === todayKey;
              const daySessions = sessionsByDay.get(key) || [];
              return (
                <div
                  key={i}
                  className={cn(
                    "p-3 text-center border-r border-zinc-50 last:border-r-0",
                    isToday ? "bg-emerald-50/50" : ""
                  )}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    {GREEK_DAYS[i]}
                  </p>
                  <p className={cn(
                    "text-lg font-black mt-0.5",
                    isToday ? "text-emerald-600" : "text-zinc-900"
                  )}>
                    {day.getDate()}
                  </p>
                  {daySessions.length > 0 && (
                    <p className="text-[8px] font-bold text-emerald-500 mt-0.5">
                      {daySessions.length} {daySessions.length === 1 ? 'προπ.' : 'προπ.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Session slots */}
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day, i) => {
              const key = formatDateKey(day);
              const isToday = key === todayKey;
              const daySessions = sessionsByDay.get(key) || [];
              return (
                <div
                  key={i}
                  className={cn(
                    "border-r border-zinc-50 last:border-r-0 p-1.5 space-y-1.5",
                    isToday ? "bg-emerald-50/30" : ""
                  )}
                >
                  {daySessions.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[9px] text-zinc-200 font-bold">—</span>
                    </div>
                  )}
                  {daySessions.map((session) => {
                    const presentCount = session.attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
                    const totalCount = session.attendance.length;
                    const conflicts = getConflicts(session, daySessions);
                    return (
                      <Link
                        key={session.id}
                        href={`/management/academy/training/${session.id}`}
                        className={cn(
                          "block rounded-lg border-l-[3px] p-2 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] relative",
                          getSquadColor(session.squadId),
                          getSquadBgColor(session.squadId),
                          session.status === 'cancelled' && "opacity-50 line-through",
                          conflicts.length > 0 && "ring-1 ring-amber-400"
                        )}
                      >
                        {conflicts.length > 0 && (
                          <div
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center shadow-sm"
                            title={`Σύγκρουση ωραρίου με: ${conflicts.map((c) => c.title).join(', ')}`}
                          >
                            <AlertCircle className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                          <span className="text-[9px] font-black text-zinc-500">
                            {session.startTime}-{session.endTime}
                          </span>
                        </div>
                        <p className="text-[10px] font-black text-zinc-900 leading-tight truncate">
                          {session.title}
                        </p>
                        <p className="text-[8px] font-bold text-zinc-400 truncate mt-0.5">
                          {getSquadName(session.squadId).split(' (')[0]}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[8px] font-bold text-zinc-400 truncate">
                            {session.coachName.split(' ')[0]}
                          </span>
                          <div className="flex items-center gap-1">
                            {statusIcon(session.status)}
                            {totalCount > 0 && (
                              <button
                                onClick={(e) => openQuickAttendance(session, e)}
                                className="text-[8px] font-bold text-zinc-400 flex items-center gap-0.5 hover:text-emerald-600 transition-colors"
                                title="Γρήγορο απουσιολόγιο"
                              >
                                <Users className="h-2.5 w-2.5" />
                                {presentCount}/{totalCount}
                              </button>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Squad legend */}
          {squads.length > 0 && (
            <div className="border-t border-zinc-100 px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">
                {toGreekUpperCase('Τμήματα')}:
              </span>
              {squads.map((squad) => (
                <button
                  key={squad.id}
                  onClick={() => setSquadFilter(squadFilter === squad.id ? 'all' : squad.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                    squadFilter === squad.id
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  <div className={cn("h-2 w-2 rounded-full", getSquadBgColor(squad.id).replace('bg-', 'bg-').replace('-50', '-500'))} />
                  {squad.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== LIST VIEW ===== */}
      {viewMode === 'list' && (
        <>
          {filteredSessions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-100 bg-white p-16 text-center">
              <div className="mx-auto h-20 w-20 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6">
                <Dumbbell className="h-10 w-10 text-zinc-200" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2 uppercase">{toGreekUpperCase('Δεν βρέθηκαν προπονήσεις')}</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Δεν υπάρχουν προπονήσεις για αυτόν τον μήνα.
              </p>
              <Button asChild className="mt-8 h-12 px-8 rounded-xl bg-emerald-600 text-white font-black shadow-lg">
                <Link href="/management/academy/training/new">{toGreekUpperCase('Νέα Προπόνηση')}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {Array.from(groupedByDate.entries()).map(([date, daySessions]) => (
                <div key={date}>
                  <div className="sticky top-0 z-20 flex items-center gap-3 py-3 bg-zinc-50/95 backdrop-blur-md mb-4 border-b border-zinc-100">
                    <div className="h-9 w-9 rounded-lg bg-zinc-900 flex flex-col items-center justify-center text-white shadow-md shrink-0">
                      <span className="text-[7px] font-bold uppercase tracking-tighter leading-none mb-0.5">
                        {toGreekUpperCase(new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'short' }))}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {new Date(date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-black text-zinc-900 capitalize leading-tight">
                        {new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
                        {daySessions.length} {daySessions.length === 1 ? 'ΠΡΟΠΟΝΗΣΗ' : 'ΠΡΟΠΟΝΗΣΕΙΣ'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {daySessions.map((session) => {
                      const typeColor = TRAINING_TYPE_COLORS[session.type];
                      const presentCount = session.attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
                      const totalCount = session.attendance.length;

                      return (
                        <Link
                          key={session.id}
                          href={`/management/academy/training/${session.id}`}
                          className="group flex flex-col rounded-xl border border-zinc-100 bg-white p-4 transition-all duration-300 hover:shadow-md hover:border-emerald-200 active:scale-[0.98]"
                        >
                          <div className="flex items-start justify-between gap-3 mb-5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm border", typeColor.bg, typeColor.border)}>
                                <Dumbbell className={cn("h-5 w-5", typeColor.text)} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight truncate">{toGreekUpperCase(session.title)}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={cn("text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border", typeColor.bg, typeColor.text, typeColor.border)}>
                                    {toGreekUpperCase(TRAINING_TYPE_LABELS[session.type])}
                                  </span>
                                  <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {session.startTime} - {session.endTime}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-50 group-hover:bg-emerald-50 transition-colors border border-transparent group-hover:border-emerald-100">
                              {statusIcon(session.status)}
                              <span className="text-[7px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-emerald-700 hidden sm:block">{toGreekUpperCase(statusLabel(session.status))}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-auto pt-3 border-t border-zinc-50 group-hover:border-emerald-50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">{toGreekUpperCase('Τμήμα')}</p>
                              <p className="text-[11px] font-bold text-zinc-800 truncate uppercase">{toGreekUpperCase(getSquadName(session.squadId))}</p>
                              <p className="text-[9px] font-bold text-zinc-400 truncate uppercase mt-0.5">{toGreekUpperCase(session.coachName)}</p>
                            </div>
                            <div className="flex flex-col items-end justify-end">
                              {totalCount > 0 && (
                                <div className="text-right w-full max-w-[90px]">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">{toGreekUpperCase('Παρουσίες')}</p>
                                    <span className="text-[9px] font-black text-zinc-900">{presentCount}<span className="text-zinc-300 mx-0.5">/</span>{totalCount}</span>
                                  </div>
                                  <div className="w-full h-1 rounded-full bg-zinc-100 overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                                      style={{ width: `${(presentCount / totalCount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {/* Quick Attendance Dialog */}
      <AlertDialog open={attendanceSession !== null} onOpenChange={(open) => !open && setAttendanceSession(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-md overflow-hidden max-h-[85vh] overflow-y-auto">
          {attendanceSession && (() => {
            const presentCount = attendanceSession.attendance.filter((a) =>
              (attendanceEdits[a.athleteId] || a.status) === 'present' || (attendanceEdits[a.athleteId] || a.status) === 'late'
            ).length;
            return (
              <>
                <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black px-6 pt-6 pb-4">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-black text-white tracking-tight text-left">
                      {attendanceSession.title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 text-xs font-medium text-left">
                      {getSquadName(attendanceSession.squadId)} • {attendanceSession.startTime}-{attendanceSession.endTime}
                      <span className="ml-2 text-emerald-400">{presentCount}/{attendanceSession.attendance.length} παρόντες</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {/* Quick all present/absent */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        const edits: Record<string, AttendanceStatus> = {};
                        attendanceSession.attendance.forEach((a) => { edits[a.athleteId] = 'present'; });
                        setAttendanceEdits(edits);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all"
                    >
                      Όλοι Παρόντες
                    </button>
                    <button
                      onClick={() => {
                        const edits: Record<string, AttendanceStatus> = {};
                        attendanceSession.attendance.forEach((a) => { edits[a.athleteId] = 'absent'; });
                        setAttendanceEdits(edits);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-[9px] font-black uppercase tracking-wider hover:bg-red-700 transition-all"
                    >
                      Όλοι Απόντες
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-2">
                  {attendanceSession.attendance.map((att) => {
                    const currentStatus = attendanceEdits[att.athleteId] || att.status;
                    const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'injured'];
                    return (
                      <div key={att.athleteId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{att.athleteName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {statuses.map((status) => (
                            <button
                              key={status}
                              onClick={() => setAttendanceEdits((prev) => ({ ...prev, [att.athleteId]: status }))}
                              className={cn(
                                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all",
                                currentStatus === status
                                  ? ATTENDANCE_STATUS_COLORS[status]
                                  : "bg-white text-zinc-300 border-zinc-100 hover:border-zinc-200"
                              )}
                            >
                              {ATTENDANCE_STATUS_LABELS[status].slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {attendanceSession.attendance.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-zinc-400 font-bold">Δεν υπάρχει απουσιολόγιο</p>
                      <p className="text-xs text-zinc-300 mt-1">Ανοίξτε την προπόνηση για να προσθέσετε αθλητές</p>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6">
                  <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <AlertDialogAction
                      onClick={saveAttendance}
                      disabled={savingAttendance}
                      className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg m-0"
                    >
                      {savingAttendance ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Αποθήκευση
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-9 w-full rounded-xl border-none bg-transparent text-zinc-400 hover:text-zinc-600 font-bold text-sm m-0">
                      Ακύρωση
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </div>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
