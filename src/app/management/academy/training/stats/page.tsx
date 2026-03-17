'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService } from '@/lib/training-services';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { TrainingSession } from '@/types/training';
import { Squad, AcademyUser } from '@/types/academy';
import {
  Loader2, ArrowLeft, BarChart3, Users, CheckCircle2,
  AlertCircle, Trophy, TrendingUp, TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, toGreekUpperCase } from '@/lib/utils';

interface AthleteStats {
  id: string;
  name: string;
  squadIds: string[];
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  injured: number;
  attendanceRate: number;
}

export default function TrainingStatsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [sessionsData, squadsData, groups, allUsers] = await Promise.all([
          trainingService.getByVenue(venueId),
          squadService.getByVenue(venueId),
          userGroupService.getOrSeed(venueId),
          academyUserService.getByVenue(venueId),
        ]);
        setSessions(sessionsData);
        setSquads(squadsData);

        const athleteGroupIds = groups
          .filter((g) => g.capabilities?.includes('squad_assignment'))
          .map((g) => g.id);
        setAthletes(allUsers.filter((u) => athleteGroupIds.includes(u.groupId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  // Filter sessions by period
  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter((s) => s.status === 'completed');

    if (periodFilter !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (periodFilter) {
        case 'week': cutoff = new Date(now.getTime() - 7 * 86400000); break;
        case 'month': cutoff = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case '3months': cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
        case '6months': cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1); break;
        default: cutoff = new Date(0);
      }
      filtered = filtered.filter((s) => new Date(s.date) >= cutoff);
    }

    if (squadFilter !== 'all') {
      filtered = filtered.filter((s) => s.squadId === squadFilter);
    }

    return filtered;
  }, [sessions, periodFilter, squadFilter]);

  // Calculate per-athlete stats
  const athleteStats = useMemo((): AthleteStats[] => {
    const statsMap = new Map<string, AthleteStats>();

    // Initialize from athletes list
    for (const athlete of athletes) {
      const squadIds = athlete.squad_ids || (athlete.squad_id ? [athlete.squad_id] : []);
      if (squadFilter !== 'all' && !squadIds.includes(squadFilter)) continue;

      statsMap.set(athlete.id, {
        id: athlete.id,
        name: athlete.displayName,
        squadIds,
        totalSessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        injured: 0,
        attendanceRate: 0,
      });
    }

    // Accumulate from sessions
    for (const session of filteredSessions) {
      for (const att of session.attendance) {
        const stat = statsMap.get(att.athleteId);
        if (!stat) continue;
        stat.totalSessions++;
        if (att.status === 'present') stat.present++;
        else if (att.status === 'absent') stat.absent++;
        else if (att.status === 'late') stat.late++;
        else if (att.status === 'injured') stat.injured++;
      }
    }

    // Calculate rates
    const result: AthleteStats[] = [];
    for (const stat of statsMap.values()) {
      if (stat.totalSessions > 0) {
        stat.attendanceRate = Math.round(((stat.present + stat.late) / stat.totalSessions) * 100);
      }
      result.push(stat);
    }

    return result.sort((a, b) => b.attendanceRate - a.attendanceRate || b.totalSessions - a.totalSessions);
  }, [athletes, filteredSessions, squadFilter]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalAttendanceRecords = filteredSessions.reduce((sum, s) => sum + s.attendance.length, 0);
    const totalPresent = filteredSessions.reduce((sum, s) => sum + s.attendance.filter((a) => a.status === 'present' || a.status === 'late').length, 0);
    const avgAttendance = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0;
    const avgPerSession = totalSessions > 0 ? Math.round(totalPresent / totalSessions) : 0;

    return { totalSessions, totalAttendanceRecords, totalPresent, avgAttendance, avgPerSession };
  }, [filteredSessions]);

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? squad.name : '';
  };

  const rateColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-700 bg-emerald-50';
    if (rate >= 70) return 'text-blue-700 bg-blue-50';
    if (rate >= 50) return 'text-amber-700 bg-amber-50';
    return 'text-red-700 bg-red-50';
  };

  const rateBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
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
              {toGreekUpperCase('Κλείσιμο')}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-1 border-b border-zinc-50">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-zinc-100 hover:bg-zinc-50 shrink-0 shadow-sm" asChild>
          <Link href="/management/academy/training">
            <ArrowLeft className="h-4 w-4 text-zinc-600" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-md shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 mb-0.5 uppercase">
            {toGreekUpperCase('Στατιστικά Προπονήσεων')}
          </h1>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">{toGreekUpperCase('Ανάλυση παρουσιών και απόδοσης αθλητών.')}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl border border-zinc-100 shadow-sm">
            <select
            value={squadFilter}
            onChange={(e) => setSquadFilter(e.target.value)}
            className="h-9 px-4 rounded-lg bg-zinc-50 border-none text-zinc-900 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-zinc-200 min-w-[170px]"
            >
            <option value="all">{toGreekUpperCase('Όλα τα Τμήματα')}</option>
            {squads.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
            ))}
            </select>

            <div className="h-6 w-px bg-zinc-100 hidden sm:block" />

            <div className="flex gap-1 bg-zinc-50 p-1 rounded-lg">
            {[
                { value: 'all', label: toGreekUpperCase('Όλα') },
                { value: 'week', label: toGreekUpperCase('7 Ημέρες') },
                { value: 'month', label: toGreekUpperCase('Μήνας') },
                { value: '3months', label: toGreekUpperCase('3 Μήνες') },
                { value: '6months', label: toGreekUpperCase('6 Μήνες') },
            ].map((period) => (
                <button
                key={period.value}
                onClick={() => setPeriodFilter(period.value)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                    periodFilter === period.value
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
                >
                {period.label}
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: toGreekUpperCase('Ολοκληρωμένες'), value: globalStats.totalSessions.toString(), icon: CheckCircle2, color: 'violet' },
            { label: toGreekUpperCase('Μέση Παρουσία'), value: `${globalStats.avgAttendance}%`, icon: TrendingUp, color: 'emerald' },
            { label: toGreekUpperCase('Μ.Ο. ανά Προπόνηση'), value: globalStats.avgPerSession.toString(), icon: Users, color: 'blue' },
            { label: toGreekUpperCase('Σύνολο Αθλητών'), value: athleteStats.length.toString(), icon: Trophy, color: 'amber' },
        ].map((metric) => {
            const Icon = metric.icon;
            const colorStyles: Record<string, string> = {
                violet: 'bg-violet-50 text-violet-600',
                emerald: 'bg-emerald-50 text-emerald-600',
                blue: 'bg-blue-50 text-blue-600',
                amber: 'bg-amber-50 text-amber-600',
            };
            return (
                <div key={metric.label} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm transition-all hover:shadow-md">
                    <div className={`h-8 w-8 rounded-lg ${colorStyles[metric.color]} flex items-center justify-center mb-4`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 mb-0.5 leading-none">{metric.value}</p>
                    <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">{metric.label}</p>
                </div>
            );
        })}
      </div>

      {/* Top / Bottom performers */}
      {athleteStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Attendance */}
          <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-50 bg-zinc-50/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-black text-zinc-900 tracking-tight">{toGreekUpperCase('Κορυφαίες Παρουσίες')}</h3>
                </div>
                <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                </div>
            </div>
            <div className="p-4 space-y-3">
              {athleteStats.filter((a) => a.totalSessions > 0).slice(0, 5).map((athlete, i) => (
                <div key={athlete.id} className="flex items-center gap-3 group">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-black transition-all",
                    i === 0 ? "bg-amber-100 text-amber-700 shadow-sm" :
                    i === 1 ? "bg-zinc-100 text-zinc-500" :
                    i === 2 ? "bg-orange-50 text-orange-600" :
                    "bg-zinc-50 text-zinc-400"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{athlete.name}</p>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{athlete.totalSessions} {toGreekUpperCase('Προπονήσεις')}</p>
                  </div>
                  <div className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all group-hover:scale-105 shadow-sm", rateColor(athlete.attendanceRate))}>
                    {athlete.attendanceRate}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lowest Attendance */}
          <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-50 bg-zinc-50/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </div>
                    <h3 className="text-base font-black text-zinc-900 tracking-tight">{toGreekUpperCase('Χαμηλότερες Παρουσίες')}</h3>
                </div>
                <div className="h-7 w-7 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                </div>
            </div>
            <div className="p-4 space-y-3">
              {[...athleteStats].filter((a) => a.totalSessions > 0).sort((a, b) => a.attendanceRate - b.attendanceRate).slice(0, 5).map((athlete, i) => (
                <div key={athlete.id} className="flex items-center gap-3 group">
                  <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-[11px] font-black text-red-500 transition-all">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate group-hover:text-red-700 transition-colors uppercase tracking-tight">{athlete.name}</p>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{athlete.totalSessions} {toGreekUpperCase('Προπονήσεις')}</p>
                  </div>
                  <div className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all group-hover:scale-105 shadow-sm", rateColor(athlete.attendanceRate))}>
                    {athlete.attendanceRate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Athletes Table */}
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                    <Users className="h-4 w-4 text-zinc-400" />
                </div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight">{toGreekUpperCase('Αναλυτικά ανά Αθλητή')}</h3>
            </div>
            <div className="px-3 py-1 rounded-lg bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                {athleteStats.length} {toGreekUpperCase('ΑΘΛΗΤΕΣ')}
            </div>
        </div>

        {athleteStats.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-20 w-20 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center mb-6">
                <Users className="h-10 w-10 text-zinc-200" />
            </div>
            <p className="text-base font-bold text-zinc-400">{toGreekUpperCase('Δεν υπάρχουν δεδομένα για τα επιλεγμένα φίλτρα')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50">
                  <th className="py-3 px-5 text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Αθλητής')}</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Τμήμα')}</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Προπ.')}</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Παρών')}</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Απών')}</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Καθ.')}</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Τραυμ.')}</th>
                  <th className="py-3 px-5 text-[9px] font-black uppercase tracking-widest text-zinc-400 lg:min-w-[180px]">{toGreekUpperCase('Παρουσία')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {athleteStats.map((athlete) => (
                  <tr key={athlete.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-5">
                      <p className="text-xs font-black text-zinc-900 uppercase tracking-tight group-hover:text-violet-700 transition-colors">{athlete.name}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">
                        {athlete.squadIds.map((sid) => getSquadName(sid)).filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-black text-zinc-900">{athlete.totalSessions}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-emerald-600">{athlete.present}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-red-500">{athlete.absent}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-amber-600">{athlete.late}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-zinc-400">{athlete.injured}</span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden shadow-inner">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", rateBarColor(athlete.attendanceRate))}
                            style={{ width: `${athlete.attendanceRate}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black min-w-[35px] text-right rounded-md px-1.5 py-0.5",
                          athlete.totalSessions === 0 ? "text-zinc-300" : rateColor(athlete.attendanceRate)
                        )}>
                          {athlete.totalSessions === 0 ? '—' : `${athlete.attendanceRate}%`}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
