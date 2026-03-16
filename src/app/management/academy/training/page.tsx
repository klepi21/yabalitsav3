'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService } from '@/lib/training-services';
import { squadService } from '@/lib/academy-services';
import { TrainingSession, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from '@/types/training';
import { Squad } from '@/types/academy';
import {
  Loader2, Plus, Search, Dumbbell, Calendar, Clock, Users, BarChart3,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TrainingListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Month navigation
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
        const [sessionsData, squadsData] = await Promise.all([
          trainingService.getByVenue(venueId),
          squadService.getByVenue(venueId),
        ]);
        setSessions(sessionsData);
        setSquads(squadsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? `${squad.name} (${squad.ageGroup})` : '—';
  };

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
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesMonth && matchesSearch && matchesSquad && matchesStatus;
    });
  }, [sessions, currentMonth, searchQuery, squadFilter, statusFilter]);

  // Group sessions by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    const sorted = [...filteredSessions].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    for (const s of sorted) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [filteredSessions]);

  // Stats
  const stats = useMemo(() => {
    const monthSessions = sessions.filter((s) => s.date.startsWith(currentMonth));
    return {
      total: monthSessions.length,
      completed: monthSessions.filter((s) => s.status === 'completed').length,
      scheduled: monthSessions.filter((s) => s.status === 'scheduled').length,
      cancelled: monthSessions.filter((s) => s.status === 'cancelled').length,
    };
  }, [sessions, currentMonth]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Ολοκληρώθηκε';
      case 'cancelled': return 'Ακυρώθηκε';
      default: return 'Προγραμματισμένη';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Dumbbell className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Προπονήσεις</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Πρόγραμμα και απουσιολόγιο</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/management/academy/training/stats">
              <BarChart3 className="h-4 w-4" />
              Στατιστικά
            </Link>
          </Button>
          <Button asChild>
            <Link href="/management/academy/training/new">
              <Plus className="h-4 w-4" />
              Νέα Προπόνηση
            </Link>
          </Button>
        </div>
      </div>

      {/* Month Navigator + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="h-9 w-9 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors">
            <ChevronLeft className="h-4 w-4 text-zinc-600" />
          </button>
          <div className="px-4 py-2 rounded-lg bg-white border border-zinc-200 min-w-[180px] text-center">
            <span className="text-sm font-semibold text-zinc-900 capitalize">{monthLabel}</span>
          </div>
          <button onClick={() => navigateMonth(1)} className="h-9 w-9 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors">
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg bg-white border border-zinc-100/60 px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-900">{stats.total}</span>
            <span className="text-xs text-zinc-400">Σύνολο</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">{stats.completed}</span>
            <span className="text-xs text-emerald-600">Ολοκλ.</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700">{stats.scheduled}</span>
            <span className="text-xs text-blue-600">Προγρ.</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Αναζήτηση..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={squadFilter}
          onChange={(e) => setSquadFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-zinc-200/70 bg-white px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-[200px]"
        >
          <option value="all">Όλα τα Τμήματα</option>
          {squads.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-zinc-200/70 bg-white px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-[180px]"
        >
          <option value="all">Όλες οι Καταστάσεις</option>
          <option value="scheduled">Προγραμματισμένες</option>
          <option value="completed">Ολοκληρωμένες</option>
          <option value="cancelled">Ακυρωμένες</option>
        </select>
      </div>

      {/* Sessions by Date */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <Dumbbell className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1">Δεν βρέθηκαν προπονήσεις</h3>
            <p className="text-[13px] text-zinc-400 mb-5">Δεν υπάρχουν προπονήσεις για αυτόν τον μήνα.</p>
            <Button size="sm" asChild>
              <Link href="/management/academy/training/new">
                <Plus className="h-4 w-4" />
                Νέα Προπόνηση
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedByDate.entries()).map(([date, daySessions]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-zinc-400">{daySessions.length} {daySessions.length === 1 ? 'προπόνηση' : 'προπονήσεις'}</p>
                </div>
              </div>

              {/* Session cards */}
              <div className="space-y-2 ml-[44px]">
                {daySessions.map((session) => {
                  const typeColor = TRAINING_TYPE_COLORS[session.type];
                  const presentCount = session.attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
                  const totalCount = session.attendance.length;

                  return (
                    <Link
                      key={session.id}
                      href={`/management/academy/training/${session.id}`}
                      className="block rounded-xl border border-zinc-100/60 bg-white p-4 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-lg ${typeColor.bg} flex items-center justify-center shrink-0`}>
                            <Dumbbell className={`h-5 w-5 ${typeColor.text}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-zinc-900">{session.title}</h3>
                              <span className={`text-[11px] px-2 py-0.5 rounded-md border ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
                                {TRAINING_TYPE_LABELS[session.type]}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.startTime} - {session.endTime}
                              </span>
                              <span>{getSquadName(session.squadId)}</span>
                              <span>{session.coachName}</span>
                              {totalCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {presentCount}/{totalCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusIcon(session.status)}
                          <span className="text-xs text-zinc-500">{statusLabel(session.status)}</span>
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
    </div>
  );
}
