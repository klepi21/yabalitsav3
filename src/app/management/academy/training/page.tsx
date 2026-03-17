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
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <div>
                <p className="text-red-700 font-black text-lg uppercase tracking-tight">{toGreekUpperCase('Σφάλμα Συστήματος')}</p>
                <p className="text-red-600 font-bold">{error}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)} 
              className="h-14 px-8 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-black uppercase tracking-widest text-xs"
            >
              {toGreekUpperCase('Κλείσιμο')}
            </Button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
        <div className="flex items-center gap-8">
          <div className="h-24 w-24 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Dumbbell className="h-12 w-12 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Προπονήσεις')}
            </h1>
            <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
              {toGreekUpperCase('ΔΙΑΧΕΙΡΙΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ ΚΑΙ ΠΑΡΟΥΣΙΩΝ')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" asChild className="h-20 px-10 rounded-[1.75rem] border-zinc-200/60 bg-white hover:bg-zinc-50 font-black text-zinc-900 text-xl shadow-sm transition-all active:scale-95 group">
            <Link href="/management/academy/training/stats" className="flex items-center gap-4">
              <BarChart3 className="h-8 w-8 text-emerald-500 group-hover:scale-110 transition-transform" />
              {toGreekUpperCase('Στατιστικά')}
            </Link>
          </Button>
          <Button asChild className="h-20 px-10 rounded-[1.75rem] bg-zinc-900 hover:bg-black text-white font-black text-xl shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
            <Link href="/management/academy/training/new" className="flex items-center gap-4">
              <Plus className="h-8 w-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              {toGreekUpperCase('Νέα Προπόνηση')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Month Selection and Quick Stats */}
      <div className="flex flex-col 2xl:flex-row items-stretch gap-8">
        {/* Month Navigator - Premium Widget Style */}
        <div className="flex-1 bg-white p-6 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-200/40 transform transition-all hover:shadow-2xl">
          <div className="flex items-center justify-between h-full min-h-[120px]">
            <button 
              onClick={() => navigateMonth(-1)} 
              className="h-24 w-24 rounded-[2rem] flex items-center justify-center bg-zinc-50 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all shadow-inner active:scale-90 group"
            >
              <ChevronLeft className="h-10 w-10 group-hover:-translate-x-1 transition-transform" />
            </button>
            
            <div className="px-8 text-center space-y-2">
              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] leading-none">ΕΠΙΛΟΓΗ ΜΗΝΑ</span>
              <h2 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter">
                {toGreekUpperCase(monthLabel)}
              </h2>
            </div>
            
            <button 
              onClick={() => navigateMonth(1)} 
              className="h-24 w-24 rounded-[2rem] flex items-center justify-center bg-zinc-50 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all shadow-inner active:scale-90 group"
            >
              <ChevronRight className="h-10 w-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 2xl:w-[700px]">
          <div className="bg-white p-8 rounded-[3rem] border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all duration-300">
            <p className="text-5xl font-black text-zinc-900 leading-none mb-4 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{stats.total}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-600">{toGreekUpperCase('Σύνολο')}</p>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all duration-300">
            <p className="text-5xl font-black text-zinc-900 leading-none mb-4 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{stats.completed}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600/80">{toGreekUpperCase('Ολοκληρ')}</p>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all duration-300">
            <p className="text-5xl font-black text-zinc-900 leading-none mb-4 group-hover:text-blue-500 transition-colors uppercase tracking-tight">{stats.scheduled}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600/80">{toGreekUpperCase('Προγραμμ')}</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col 2xl:flex-row items-center gap-6 bg-zinc-50/50 p-4 rounded-[2.5rem] border border-zinc-100">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
          <Input
            placeholder={toGreekUpperCase('Αναζήτηση με τίτλο ή προπονητή...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-20 pl-20 pr-8 bg-white rounded-[1.75rem] border-zinc-100 shadow-sm focus:ring-4 focus:ring-emerald-500/10 font-black text-xl placeholder:text-zinc-300 w-full uppercase"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full 2xl:w-auto">
          <Select value={squadFilter} onValueChange={setSquadFilter}>
            <SelectTrigger className="h-20 px-8 rounded-[1.75rem] bg-white border border-zinc-100 shadow-sm text-zinc-900 font-black text-lg min-w-[240px] flex-1 2xl:flex-none uppercase tracking-tight">
              <SelectValue placeholder={toGreekUpperCase('Ολα τα Τμήματα')} />
            </SelectTrigger>
            <SelectContent className="rounded-[2rem] border-zinc-100 shadow-2xl p-2 min-w-[300px]">
              <SelectItem value="all" className="font-black text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase('Όλα τα Τμήματα')}</SelectItem>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id} className="font-bold text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-20 px-8 rounded-[1.75rem] bg-white border border-zinc-100 shadow-sm text-zinc-900 font-black text-lg min-w-[240px] flex-1 2xl:flex-none uppercase tracking-tight">
              <SelectValue placeholder={toGreekUpperCase('Ολες οι Καταστάσεις')} />
            </SelectTrigger>
            <SelectContent className="rounded-[2rem] border-zinc-100 shadow-2xl p-2 min-w-[240px]">
              <SelectItem value="all" className="font-black text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase('Όλες οι Καταστάσεις')}</SelectItem>
              <SelectItem value="scheduled" className="font-bold text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase('Προγραμματισμένες')}</SelectItem>
              <SelectItem value="completed" className="font-bold text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase('Ολοκληρωμένες')}</SelectItem>
              <SelectItem value="cancelled" className="font-bold text-lg p-4 rounded-2xl mb-1">{toGreekUpperCase('Ακυρωμένες')}</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || squadFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => { setSearchQuery(''); setSquadFilter('all'); setStatusFilter('all'); }}
              className="h-20 px-10 text-zinc-400 hover:text-red-600 font-black rounded-[1.75rem] hover:bg-red-50 transition-all text-[13px] uppercase tracking-widest"
            >
              {toGreekUpperCase('Καθαρισμός')}
            </Button>
          )}
        </div>
      </div>

      {/* Main List Display */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-[4rem] border-2 border-dashed border-zinc-100 bg-white p-24 text-center shadow-sm">
            <div className="mx-auto h-32 w-32 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-inner group transform transition-transform hover:rotate-12 duration-500">
                <Dumbbell className="h-16 w-16 text-zinc-200 group-hover:text-emerald-300 transition-colors" />
            </div>
          <h3 className="text-4xl font-black text-zinc-900 mb-6 uppercase tracking-tight">{toGreekUpperCase('Δεν βρέθηκαν προπονήσεις')}</h3>
          <p className="text-zinc-400 font-bold text-xl max-w-lg mx-auto uppercase tracking-tight mb-12">
            ΔΕΝ ΥΠΑΡΧΟΥΝ ΠΡΟΠΟΝΗΣΕΙΣ ΠΟΥ ΝΑ ΤΑΙΡΙΑΖΟΥΝ ΣΤΑ ΦΙΛΤΡΑ ΣΑΣ ΓΙΑ ΑΥΤΟΝ ΤΟΝ ΜΗΝΑ.
          </p>
          <Button asChild className="h-20 px-16 rounded-[2rem] bg-emerald-600 text-white font-black text-xl shadow-2xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all">
            <Link href="/management/academy/training/new" className="flex items-center gap-4">
               <Plus className="h-8 w-8" />
               {toGreekUpperCase('Νέα Προπόνηση')}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-16">
          {Array.from(groupedByDate.entries()).map(([date, daySessions]) => (
            <div key={date} className="relative pt-4">
              {/* Date Block - Sidebar Style for Desktop */}
              <div className="sticky top-[100px] z-30 flex items-center gap-10 py-8 bg-zinc-50/95 backdrop-blur-xl mb-10 rounded-[2.5rem] px-8 border border-zinc-100/50 shadow-sm">
                <div className="h-24 w-24 rounded-[2rem] bg-zinc-900 border-4 border-zinc-800 flex flex-col items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0 transform -rotate-3 hover:rotate-0 transition-all">
                    <span className="text-[12px] font-black uppercase tracking-widest leading-none mb-1.5 text-emerald-400">
                        {toGreekUpperCase(new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'short' }))}
                    </span>
                    <span className="text-4xl font-black leading-none tracking-tighter">
                        {new Date(date + 'T00:00:00').getDate()}
                    </span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-3xl font-black text-zinc-900 uppercase tracking-tighter leading-tight">
                    {new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-4">
                      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.25em] leading-none">
                        {daySessions.length} {daySessions.length === 1 ? 'ΠΡΟΠΟΝΗΣΗ' : 'ΠΡΟΠΟΝΗΣΕΙΣ'}
                      </p>
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-[0.25em] leading-none">
                         {toGreekUpperCase(new Date(date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long' }))}
                      </p>
                  </div>
                </div>
                <div className="h-px bg-zinc-200/50 flex-1 hidden xl:block"></div>
              </div>

              {/* Session Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0">
                {daySessions.map((session) => {
                  const typeColor = TRAINING_TYPE_COLORS[session.type];
                  const presentCount = session.attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
                  const totalCount = session.attendance.length;

                  return (
                    <Link
                      key={session.id}
                      href={`/management/academy/training/${session.id}`}
                      className="group flex flex-col rounded-[3.5rem] border border-zinc-100 bg-white p-12 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:border-emerald-200 hover:-translate-y-2 active:scale-[0.98] relative overflow-hidden"
                    >
                      {/* Decorative Background Icon */}
                      <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none group-hover:scale-125 duration-700">
                          <Dumbbell className="h-64 w-64 rotate-12" />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8 mb-12">
                        <div className="flex items-center gap-6 min-w-0">
                          <div className={cn("h-20 w-20 rounded-[1.75rem] flex items-center justify-center shrink-0 transition-all duration-500 group-hover:rotate-6 shadow-lg border-2", typeColor.bg, typeColor.border, "group-hover:shadow-xl")}>
                            <Dumbbell className={cn("h-10 w-10", typeColor.text)} />
                          </div>
                          <div className="min-w-0 space-y-2">
                            <h3 className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight truncate pr-4 leading-tight">{toGreekUpperCase(session.title)}</h3>
                            <div className="flex flex-wrap items-center gap-4">
                                <span className={cn("text-[11px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-xl border-2 shadow-sm", typeColor.bg, typeColor.text, typeColor.border)}>
                                    {toGreekUpperCase(TRAINING_TYPE_LABELS[session.type])}
                                </span>
                                <span className="text-[13px] font-black text-zinc-400 flex items-center gap-2.5 bg-zinc-50 px-4 py-1.5 rounded-xl border border-zinc-100 shadow-inner group-hover:bg-white transition-colors">
                                    <Clock className="h-4 w-4 text-emerald-500/50" />
                                    {session.startTime} - {session.endTime}
                                </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={cn(
                            "flex items-center gap-3 p-3 px-5 rounded-[1.5rem] transition-all border shadow-sm self-start group-hover:-translate-y-1 group-active:translate-y-0",
                            session.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                            session.status === 'cancelled' ? "bg-red-50 border-red-100 text-red-600" :
                            "bg-blue-50 border-blue-100 text-blue-700"
                        )}>
                          {statusIcon(session.status)}
                          <span className="text-[12px] font-black uppercase tracking-widest">{toGreekUpperCase(statusLabel(session.status))}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-auto pt-10 border-t border-zinc-100 group-hover:border-emerald-100/50 transition-colors">
                        <div className="space-y-4">
                            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2">{toGreekUpperCase('Τμήμα & Προπονητής')}</p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </div>
                                    <p className="text-lg font-black text-zinc-900 truncate uppercase tracking-tight">{toGreekUpperCase(getSquadName(session.squadId))}</p>
                                </div>
                                <div className="flex items-center gap-3 ml-1">
                                    <div className="h-3 w-3 rounded-full bg-zinc-200" />
                                    <p className="text-[15px] font-bold text-zinc-500 truncate uppercase tracking-tight">{toGreekUpperCase(session.coachName)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-end">
                            {totalCount > 0 ? (
                                <div className="text-right w-full space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Παρουσίες')}</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-black text-zinc-900 tracking-tighter group-hover:text-emerald-600 transition-colors pr-1">{presentCount}</span>
                                            <span className="text-xl font-bold text-zinc-300">/ {totalCount}</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-4 rounded-full bg-zinc-50 overflow-hidden shadow-inner border border-zinc-100 p-1">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-[1.5s] ease-out shadow-[0_0_15px_rgba(16,185,129,0.4)] relative" 
                                            style={{ width: `${(presentCount / totalCount) * 100}%` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-24 rounded-[2rem] bg-zinc-50 border border-zinc-100 border-dashed flex flex-col items-center justify-center group-hover:bg-zinc-100/50 transition-colors">
                                    <Users className="h-8 w-8 text-zinc-200 mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('ΧΩΡΙΣ ΠΑΡΟΥΣΙΕΣ')}</span>
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
