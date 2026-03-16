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
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-200 shrink-0" asChild>
          <Link href="/management/academy/training">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Στατιστικά Προπονήσεων</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Παρουσίες και απουσίες αθλητών</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={squadFilter}
          onChange={(e) => setSquadFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-zinc-200/70 bg-white px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="all">Όλα τα Τμήματα</option>
          {squads.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
          ))}
        </select>
        <div className="flex gap-1 rounded-lg bg-zinc-100/80 p-0.5">
          {[
            { value: 'all', label: 'Όλα' },
            { value: 'week', label: 'Εβδομάδα' },
            { value: 'month', label: 'Μήνας' },
            { value: '3months', label: '3 Μήνες' },
            { value: '6months', label: '6 Μήνες' },
          ].map((period) => (
            <button
              key={period.value}
              onClick={() => setPeriodFilter(period.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                periodFilter === period.value
                  ? 'bg-white shadow-sm text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900">{globalStats.totalSessions}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Ολοκληρωμένες</p>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900">{globalStats.avgAttendance}%</p>
          <p className="text-xs text-zinc-400 mt-0.5">Μέση Παρουσία</p>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900">{globalStats.avgPerSession}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Μ.Ο. ανά Προπόνηση</p>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900">{athleteStats.length}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Αθλητές</p>
        </div>
      </div>

      {/* Top / Bottom performers */}
      {athleteStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top Attendance */}
          <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Κορυφαίες Παρουσίες
            </h3>
            <div className="space-y-2">
              {athleteStats.filter((a) => a.totalSessions > 0).slice(0, 5).map((athlete, i) => (
                <div key={athlete.id} className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-zinc-200 text-zinc-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-zinc-100 text-zinc-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{athlete.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${rateColor(athlete.attendanceRate)}`}>
                    {athlete.attendanceRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lowest Attendance */}
          <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              Χαμηλότερες Παρουσίες
            </h3>
            <div className="space-y-2">
              {[...athleteStats].filter((a) => a.totalSessions > 0).sort((a, b) => a.attendanceRate - b.attendanceRate).slice(0, 5).map((athlete, i) => (
                <div key={athlete.id} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-md bg-red-50 flex items-center justify-center text-[11px] font-bold text-red-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{athlete.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${rateColor(athlete.attendanceRate)}`}>
                    {athlete.attendanceRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Athletes Table */}
      <div className="rounded-xl border border-zinc-100/60 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100/60">
          <h3 className="text-sm font-semibold text-zinc-900">Αναλυτικά ανά Αθλητή</h3>
        </div>
        {athleteStats.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            Δεν υπάρχουν δεδομένα για τα επιλεγμένα φίλτρα
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100/60">
                  <th className="text-left text-[13px] text-zinc-400 font-medium px-5 py-3">Αθλητής</th>
                  <th className="text-center text-[13px] text-zinc-400 font-medium px-3 py-3">Τμήμα</th>
                  <th className="text-center text-[13px] text-zinc-400 font-medium px-3 py-3">Προπ.</th>
                  <th className="text-center text-[13px] text-zinc-400 font-medium px-3 py-3">
                    <span className="text-emerald-500">✓</span>
                  </th>
                  <th className="text-center text-[13px] text-zinc-400 font-medium px-3 py-3">
                    <span className="text-red-400">✕</span>
                  </th>
                  <th className="text-center text-[13px] text-zinc-400 font-medium px-3 py-3">
                    <span className="text-amber-500">⏱</span>
                  </th>
                  <th className="text-center text-[13px] text-zinc-400 font-medium px-3 py-3">
                    <span className="text-zinc-400">🏥</span>
                  </th>
                  <th className="text-left text-[13px] text-zinc-400 font-medium px-5 py-3 min-w-[160px]">Παρουσία</th>
                </tr>
              </thead>
              <tbody>
                {athleteStats.map((athlete) => (
                  <tr key={athlete.id} className="border-b border-zinc-100/40 hover:bg-zinc-50/50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-zinc-900">{athlete.name}</p>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs text-zinc-500">
                        {athlete.squadIds.map((sid) => getSquadName(sid)).filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-sm font-semibold text-zinc-900">{athlete.totalSessions}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-sm text-emerald-600 font-medium">{athlete.present}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-sm text-red-500 font-medium">{athlete.absent}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-sm text-amber-600 font-medium">{athlete.late}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-sm text-zinc-400 font-medium">{athlete.injured}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rateBarColor(athlete.attendanceRate)} transition-all`}
                            style={{ width: `${athlete.attendanceRate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold min-w-[36px] text-right ${
                          athlete.totalSessions === 0 ? 'text-zinc-300' : rateColor(athlete.attendanceRate).split(' ')[0]
                        }`}>
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
