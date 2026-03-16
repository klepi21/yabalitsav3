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
import { cn } from '@/lib/utils';

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
    <div className="space-y-10 pb-20">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-1">Προπονήσεις</h1>
            <p className="text-lg font-medium text-zinc-500">Διαχειριστείτε το πρόγραμμα και το απουσιολόγιο της ακαδημίας.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild className="h-14 px-6 rounded-2xl border-zinc-100 font-bold text-zinc-600 hover:bg-zinc-50">
            <Link href="/management/academy/training/stats" className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Στατιστικά
            </Link>
          </Button>
          <Button asChild className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 transition-all hover:translate-y-[-2px] active:translate-y-[1px]">
            <Link href="/management/academy/training/new" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Νέα Προπόνηση
            </Link>
          </Button>
        </div>
      </div>

      {/* Month Navigator + Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
          <button 
            onClick={() => navigateMonth(-1)} 
            className="h-12 w-12 rounded-xl flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="px-8 flex flex-col items-center min-w-[200px]">
            <span className="text-sm font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Μήνας</span>
            <span className="text-xl font-black text-zinc-900 capitalize">{monthLabel}</span>
          </div>
          <button 
            onClick={() => navigateMonth(1)} 
            className="h-12 w-12 rounded-xl flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 leading-none mb-1">{stats.total}</p>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Σύνολο</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 leading-none mb-1">{stats.completed}</p>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Ολοκληρ.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 leading-none mb-1">{stats.scheduled}</p>
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Προγραμμ.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            placeholder="Αναζήτηση με τίτλο ή προπονητή..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 pr-4 bg-white rounded-2xl border-zinc-100 shadow-sm focus:ring-emerald-500 font-medium text-lg placeholder:text-zinc-400 w-full"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={squadFilter}
            onChange={(e) => setSquadFilter(e.target.value)}
            className="h-14 px-6 rounded-2xl bg-white border border-zinc-100 shadow-sm text-zinc-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
          >
            <option value="all">Όλα τα Τμήματα</option>
            {squads.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-14 px-6 rounded-2xl bg-white border border-zinc-100 shadow-sm text-zinc-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
          >
            <option value="all">Όλες οι Καταστάσεις</option>
            <option value="scheduled">Προγραμματισμένες</option>
            <option value="completed">Ολοκληρωμένες</option>
            <option value="cancelled">Ακυρωμένες</option>
          </select>

          {(searchQuery || squadFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => { setSearchQuery(''); setSquadFilter('all'); setStatusFilter('all'); }}
              className="h-14 px-6 text-zinc-400 hover:text-zinc-900 font-bold rounded-2xl hover:bg-zinc-50"
            >
              Καθαρισμός
            </Button>
          )}
        </div>
      </div>

      {/* Sessions by Date */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-white p-20 text-center">
            <div className="mx-auto h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <Dumbbell className="h-12 w-12 text-zinc-200" />
            </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν βρέθηκαν προπονήσεις</h3>
          <p className="text-zinc-500 font-medium text-lg max-w-sm mx-auto">
            Δεν υπάρχουν προπονήσεις που να ταιριάζουν στα φίλτρα σας για αυτόν τον μήνα.
          </p>
          <Button asChild className="mt-10 h-14 px-10 rounded-2xl bg-emerald-600 text-white font-black">
            <Link href="/management/academy/training/new">Νέα Προπόνηση</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {Array.from(groupedByDate.entries()).map(([date, daySessions]) => (
            <div key={date} className="relative">
              {/* Date header */}
              <div className="sticky top-0 z-20 flex items-center gap-4 py-4 bg-zinc-50/95 backdrop-blur-sm mb-6">
                <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex flex-col items-center justify-center text-white shadow-xl shadow-zinc-200">
                    <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-0.5">
                        {new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'short' })}
                    </span>
                    <span className="text-xl font-black leading-none">
                        {new Date(date + 'T00:00:00').getDate()}
                    </span>
                </div>
                <div>
                  <p className="text-lg font-black text-zinc-900 capitalize">
                    {new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
                    {daySessions.length} {daySessions.length === 1 ? 'προπόνηση' : 'προπονήσεις'}
                  </p>
                </div>
              </div>

              {/* Session cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {daySessions.map((session) => {
                  const typeColor = TRAINING_TYPE_COLORS[session.type];
                  const presentCount = session.attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
                  const totalCount = session.attendance.length;

                  return (
                    <Link
                      key={session.id}
                      href={`/management/academy/training/${session.id}`}
                      className="group flex flex-col rounded-[2rem] border border-zinc-100 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:border-emerald-200"
                    >
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm", typeColor.bg)}>
                            <Dumbbell className={cn("h-7 w-7", typeColor.text)} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{session.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border", typeColor.bg, typeColor.text, typeColor.border)}>
                                    {TRAINING_TYPE_LABELS[session.type]}
                                </span>
                                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {session.startTime} - {session.endTime}
                                </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-50 group-hover:bg-zinc-100/50 transition-colors">
                            {statusIcon(session.status)}
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{statusLabel(session.status)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-auto">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Τμήμα & Προπονητής</p>
                            <p className="text-xs font-bold text-zinc-600 truncate">{getSquadName(session.squadId)}</p>
                            <p className="text-xs font-medium text-zinc-400 truncate">{session.coachName}</p>
                        </div>
                        <div className="flex flex-col items-end justify-end">
                            {totalCount > 0 && (
                                <div className="text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Παρουσίες</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 transition-all duration-500" 
                                                style={{ width: `${(presentCount / totalCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-zinc-900">{presentCount}<span className="text-zinc-300 mx-0.5">/</span>{totalCount}</span>
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
    </div>
  );
}
