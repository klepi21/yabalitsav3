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
  Loader2, Plus, Search, Dumbbell, Clock, BarChart3,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-2">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
            <Dumbbell className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Προπονήσεις')}
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {toGreekUpperCase('Διαχειριση προγραμματος & απουσιολογιο')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" asChild className="h-10 px-5 rounded-xl border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50 text-[11px] shadow-sm transition-all active:scale-95">
            <Link href="/management/academy/training/stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              {toGreekUpperCase('Στατιστικά')}
            </Link>
          </Button>
          <Button asChild className="h-10 px-6 rounded-xl bg-zinc-900 hover:bg-black text-white font-black shadow-md transition-all active:scale-95 text-[11px]">
            <Link href="/management/academy/training/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              {toGreekUpperCase('Νέα Προπόνηση')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch justify-between gap-6">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm flex-1 lg:max-w-xs">
          <button 
            onClick={() => navigateMonth(-1)} 
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all border border-zinc-100/50 shadow-sm active:scale-95 touch-target"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="px-2 flex flex-col items-center flex-1">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] leading-none mb-1">ΜΗΝΑΣ</span>
            <span className="text-lg font-black text-zinc-900 capitalize tracking-tight">{monthLabel}</span>
          </div>
          <button 
            onClick={() => navigateMonth(1)} 
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all border border-zinc-100/50 shadow-sm active:scale-95 touch-target"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-6 lg:w-[450px]">
          <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center gap-1 group hover:shadow-md transition-all duration-300">
            <p className="text-2xl font-black text-zinc-900 leading-none group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{stats.total}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Σύνολο')}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center gap-1 group hover:shadow-md transition-all duration-300">
            <p className="text-2xl font-black text-zinc-900 leading-none group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{stats.completed}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{toGreekUpperCase('Ολοκληρ')}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center gap-1 group hover:shadow-md transition-all duration-300">
            <p className="text-2xl font-black text-zinc-900 leading-none group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{stats.scheduled}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">{toGreekUpperCase('Προγραμμ')}</p>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder={toGreekUpperCase('Αναζήτηση...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 pr-4 bg-white rounded-lg border-zinc-100 shadow-sm focus:ring-emerald-500 font-bold text-xs placeholder:text-zinc-300 w-full"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={squadFilter} onValueChange={setSquadFilter}>
            <SelectTrigger className="h-10 px-4 rounded-lg bg-white border border-zinc-100 shadow-sm text-zinc-900 font-bold text-xs min-w-[160px] flex-1 md:flex-none uppercase">
              <SelectValue placeholder={toGreekUpperCase('Όλα τα τμηματα')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
              <SelectItem value="all" className="font-bold text-sm">{toGreekUpperCase('Όλα τα τμήματα')}</SelectItem>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id} className="font-bold text-sm">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 px-4 rounded-lg bg-white border border-zinc-100 shadow-sm text-zinc-900 font-bold text-xs min-w-[160px] flex-1 md:flex-none uppercase">
              <SelectValue placeholder={toGreekUpperCase('Καταστασεις')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
              <SelectItem value="all" className="font-bold text-sm">{toGreekUpperCase('Όλες οι Καταστάσεις')}</SelectItem>
              <SelectItem value="scheduled" className="font-bold text-sm">{toGreekUpperCase('Προγραμματισμένες')}</SelectItem>
              <SelectItem value="completed" className="font-bold text-sm">{toGreekUpperCase('Ολοκληρωμένες')}</SelectItem>
              <SelectItem value="cancelled" className="font-bold text-sm">{toGreekUpperCase('Ακυρωμένες')}</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || squadFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => { setSearchQuery(''); setSquadFilter('all'); setStatusFilter('all'); }}
              className="h-10 px-4 text-zinc-400 hover:text-red-500 font-bold rounded-lg hover:bg-red-50 transition-all text-[9px] uppercase tracking-widest"
            >
              {toGreekUpperCase('Καθαρισμός')}
            </Button>
          )}
        </div>
      </div>

      {/* Sessions by Date */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-[3rem] border-2 border-dashed border-zinc-100 bg-white p-20 text-center shadow-sm">
            <div className="mx-auto h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <Dumbbell className="h-12 w-12 text-zinc-200" />
            </div>
          <h3 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight">{toGreekUpperCase('Δεν βρέθηκαν προπονήσεις')}</h3>
          <p className="text-zinc-500 font-medium text-lg max-w-sm mx-auto">
            Δεν υπάρχουν προπονήσεις που να ταιριάζουν στα φίλτρα σας για αυτόν τον μήνα.
          </p>
          <Button asChild className="mt-12 h-16 px-12 rounded-[1.25rem] bg-emerald-600 text-white font-black text-lg shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all">
            <Link href="/management/academy/training/new">{toGreekUpperCase('Νέα Προπόνηση')}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {Array.from(groupedByDate.entries()).map(([date, daySessions]) => (
            <div key={date} className="relative">
              {/* Date header */}
              <div className="sticky top-0 z-20 flex items-center gap-3.5 py-3 bg-zinc-50/95 backdrop-blur-md mb-4 border-b border-zinc-100">
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
                      className="group flex flex-col rounded-xl border border-zinc-100 bg-white p-4 transition-all duration-300 hover:shadow-md hover:border-emerald-200 active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-transparent", typeColor.bg, typeColor.border)}>
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
    </div>
  );
}
