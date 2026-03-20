'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, venueService } from '@/lib/firebase-services';
import { Booking, Pitch, Venue } from '@/types';
import {
  CalendarDays,
  Activity,
  AlertTriangle,
  Phone,
  Plus,
  Loader2,
  Pencil,
  Eye,
  LayoutDashboard,
  Clock,
  Save,
  User,
  Users,
  Trophy,
  Smile,
  HeartPulse,
  XCircle,
  CreditCard,
  BanknoteIcon,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { academyPaymentService } from '@/lib/academy-services';
import { trainingService } from '@/lib/training-services';
import { Squad, AcademyUser, AcademyPayment, UserGroup } from '@/types/academy';
import { TrainingSession } from '@/types/training';

export interface DashboardSquad extends Squad {
  athleteCount?: number;
}

const FootballPitch = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <circle cx="12" cy="12" r="3" />
    <path d="M2 9c2 0 4 1 4 3s-2 3-4 3" />
    <path d="M22 9c-2 0-4 1-4 3s2 3 4 3" />
  </svg>
);
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, toGreekUpperCase } from '@/lib/utils';

function CoachDashboard() {
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [squads, setSquads] = useState<DashboardSquad[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [medicalAlerts, setMedicalAlerts] = useState<{ expired: AcademyUser[]; expiringSoon: AcademyUser[] }>({ expired: [], expiringSoon: [] });
  const [dataLoading, setDataLoading] = useState(true);

  const venueId = venueOwner?.venueId || '';
  const coachSquadIds = useMemo(() => venueOwner?.assignedSquadIds || [], [venueOwner?.assignedSquadIds]);
  const canViewAll = venueOwner?.coachViewMode === 'all_squads';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }

    const load = async () => {
      try {
        const [squadsData, trainingsData, usersData, groupsData] = await Promise.all([
          squadService.getByVenue(venueId),
          trainingService.getByVenue(venueId),
          academyUserService.getByVenue(venueId),
          userGroupService.getByVenue(venueId),
        ]);

        // Filter squads for coach and count athletes
        const visibleSquads = (canViewAll ? squadsData : squadsData.filter(s => coachSquadIds.includes(s.id))).map(s => {
          const count = usersData.filter(u => u.squad_id === s.id || u.squad_ids?.includes(s.id)).length;
          return { ...s, athleteCount: count };
        });
        setSquads(visibleSquads);

        // Filter trainings for coach's squads
        const visibleSquadIds = new Set(visibleSquads.map(s => s.id));
        const visibleTrainings = trainingsData.filter(t => t.squadId && visibleSquadIds.has(t.squadId));
        setTrainings(visibleTrainings);

        // Athletes in coach's squads (for evaluation section)
        const athleteGroupIds = new Set(groupsData.filter(g => g.capabilities?.includes('squad_assignment')).map(g => g.id));
        const visibleAthletes = usersData.filter(u => {
          if (!athleteGroupIds.has(u.groupId)) return false;
          const userSquads = u.squad_ids || (u.squad_id ? [u.squad_id] : []);
          return canViewAll || userSquads.some(sid => coachSquadIds.includes(sid));
        });
        setAthletes(visibleAthletes);

        // Medical alerts for athletes in coach's squads
        const medicalGroupIds = new Set(groupsData.filter(g => g.capabilities?.includes('medical_tracking')).map(g => g.id));
        const athletes = usersData.filter(u => {
          if (!medicalGroupIds.has(u.groupId)) return false;
          const userSquads = u.squad_ids || (u.squad_id ? [u.squad_id] : []);
          return canViewAll || userSquads.some(sid => coachSquadIds.includes(sid));
        });

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const in30Days = new Date(today); in30Days.setDate(in30Days.getDate() + 30);
        const expired: AcademyUser[] = [];
        const expiringSoon: AcademyUser[] = [];
        for (const u of athletes) {
          const expiry = u.fields?.medical_cert_expiry as string | undefined;
          if (!expiry) { expired.push(u); continue; }
          const d = new Date(expiry); d.setHours(0, 0, 0, 0);
          if (d < today) expired.push(u);
          else if (d <= in30Days) expiringSoon.push(u);
        }
        setMedicalAlerts({ expired, expiringSoon });
      } catch (err) {
        console.error('Coach dashboard error:', err);
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [user, venueOwner, authLoading, router, pathname, venueId, canViewAll, coachSquadIds]);

  if (authLoading || dataLoading) {
    return (
      <div className="space-y-6 p-6 lg:pl-[280px] animate-pulse">
        <div className="flex items-center gap-4 pb-4">
          <div className="h-12 w-12 rounded-2xl bg-zinc-200" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-zinc-200 rounded" />
            <div className="h-3 w-32 bg-zinc-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-100" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-zinc-100" />
        <div className="h-48 rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayTrainings = trainings.filter(t => t.date === todayStr && t.status !== 'cancelled');
  const upcomingTrainings = trainings
    .filter(t => t.date >= todayStr && t.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  const totalAthletes = squads.reduce((sum, s) => sum + (s.athleteCount || 0), 0);
  const totalMedicalIssues = medicalAlerts.expired.length + medicalAlerts.expiringSoon.length;

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-zinc-900">
            {toGreekUpperCase(`Γεια σου, ${venueOwner?.name?.split(' ')[0] || 'Προπονητή'}!`)}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Πίνακας ελέγχου προπονητή</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900">{squads.length}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Τμήματα</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900">{totalAthletes}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Αθλητές</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900">{todayTrainings.length}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Σήμερα</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", totalMedicalIssues > 0 ? "bg-red-50" : "bg-emerald-50")}>
                  <HeartPulse className={cn("h-5 w-5", totalMedicalIssues > 0 ? "text-red-600" : "text-emerald-600")} />
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-900">{totalMedicalIssues}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Ιατρικά</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Medical Alerts */}
        {totalMedicalIssues > 0 && (
          <Card className="rounded-2xl border-none shadow-sm mb-6 border-l-4 border-l-red-500">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="font-black text-zinc-900">{toGreekUpperCase('Ιατρικά Πιστοποιητικά')}</h3>
              </div>
              <div className="space-y-2">
                {medicalAlerts.expired.length > 0 && (
                  <p className="text-sm">
                    <span className="font-bold text-red-600">{medicalAlerts.expired.length}</span>
                    <span className="text-zinc-500"> αθλητές με ληγμένο πιστοποιητικό</span>
                  </p>
                )}
                {medicalAlerts.expiringSoon.length > 0 && (
                  <p className="text-sm">
                    <span className="font-bold text-amber-600">{medicalAlerts.expiringSoon.length}</span>
                    <span className="text-zinc-500"> λήγουν σε 30 ημέρες</span>
                  </p>
                )}
              </div>
              <Link href="/management/academy/medical" className="text-xs font-bold text-emerald-600 hover:underline mt-3 inline-block">
                Προβολή λεπτομερειών →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Trainings */}
        <Card className="rounded-2xl border-none shadow-sm mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-zinc-900">{toGreekUpperCase('Επόμενες Προπονήσεις')}</h3>
              <Link href="/management/academy/training">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600">
                  Όλες →
                </Button>
              </Link>
            </div>
            {upcomingTrainings.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">Δεν υπάρχουν προγραμματισμένες προπονήσεις</p>
            ) : (
              <div className="space-y-2">
                {upcomingTrainings.map(t => {
                  const squad = squads.find(s => s.id === t.squadId);
                  const isToday = t.date === todayStr;
                  return (
                    <div key={t.id} className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-colors",
                      isToday && "bg-emerald-50/50"
                    )}>
                      <Link href={`/management/academy/training/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex flex-col items-center justify-center text-center flex-shrink-0",
                          isToday ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
                        )}>
                          <span className="text-[9px] font-bold uppercase leading-none">
                            {new Date(t.date + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-black leading-none mt-0.5">
                            {new Date(t.date + 'T00:00:00').getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">{t.title}</p>
                          <p className="text-xs text-zinc-400 truncate">
                            {squad ? `${squad.name} (${squad.ageGroup})` : ''} · {t.startTime} - {t.endTime}
                          </p>
                        </div>
                      </Link>
                      {isToday ? (
                        <Link href={`/coach/attendance/${t.id}`} className="sm:hidden flex-shrink-0 ml-2">
                          <Button size="sm" className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]">
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            Απουσιολόγιο
                          </Button>
                        </Link>
                      ) : null}
                      {isToday ? (
                        <Badge className="hidden sm:inline-flex bg-emerald-100 text-emerald-700 text-[9px] font-black border-none ml-2">ΣΗΜΕΡΑ</Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Squads */}
        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-zinc-900">{toGreekUpperCase('Τα Τμήματά μου')}</h3>
              <Link href="/management/academy/squads">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600">
                  Όλα →
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {squads.map(s => (
                <Link key={s.id} href={`/management/academy/squads`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                      <p className="text-xs text-zinc-400">{s.ageGroup} · {s.athleteCount || 0} αθλητές</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Quick Evaluate — only on mobile */}
        {athletes.length > 0 && (
          <Card className="rounded-2xl border-none shadow-sm sm:hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-zinc-900">{toGreekUpperCase('Γρήγορη Αξιολόγηση')}</h3>
                <Link href="/management/academy/evaluations">
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600">
                    Όλες →
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {squads.map(squad => {
                  const squadAthletes = athletes.filter(a => {
                    const sids = a.squad_ids || (a.squad_id ? [a.squad_id] : []);
                    return sids.includes(squad.id);
                  });
                  if (squadAthletes.length === 0) return null;
                  return (
                    <div key={squad.id}>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2 px-1">
                        {squad.name} ({squad.ageGroup})
                      </p>
                      <div className="space-y-1">
                        {squadAthletes.map(a => (
                          <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50">
                            <p className="text-sm font-bold text-zinc-900 truncate flex-1">{a.displayName}</p>
                            <Link href={`/coach/evaluate/${a.id}`}>
                              <Button size="sm" className="h-7 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px]">
                                <Star className="h-3 w-3 mr-1" />
                                Αξιολόγηση
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:pl-[280px] animate-pulse">
      {/* Toggle skeleton */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-200" />
          <div className="space-y-2">
            <div className="h-4 w-48 bg-zinc-200 rounded" />
            <div className="h-3 w-64 bg-zinc-100 rounded" />
          </div>
        </div>
        <div className="h-7 w-12 bg-zinc-200 rounded-full" />
      </div>
      {/* Header skeleton */}
      <div className="flex items-center gap-4 pb-6">
        <div className="h-14 w-14 rounded-2xl bg-zinc-200" />
        <div className="space-y-2">
          <div className="h-6 w-56 bg-zinc-200 rounded" />
          <div className="h-3 w-32 bg-zinc-100 rounded" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-100" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-zinc-100" />
        <div className="h-64 rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { venueOwner, isLoading: authLoading, isCoach } = useAuth();

  // Show skeleton while loading
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  // Coach gets a dedicated simplified dashboard
  if (venueOwner && isCoach) {
    return <CoachDashboard />;
  }

  // Admin dashboard continues below
  return <AdminDashboard />;
}

function AdminDashboard() {
  const { user, venueOwner, isLoading: authLoading, setBookingsEnabled } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [squads, setSquads] = useState<DashboardSquad[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [academyUsers, setAcademyUsers] = useState<AcademyUser[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [medicalAlerts, setMedicalAlerts] = useState<{ expired: AcademyUser[]; expiringSoon: AcademyUser[] }>({ expired: [], expiringSoon: [] });
  const [paymentAlerts, setPaymentAlerts] = useState<{ user: AcademyUser; unpaidMonths: string[] }[]>([]);
  const [isMedicalExpanded, setIsMedicalExpanded] = useState(false);
  const [isPaymentsExpanded, setIsPaymentsExpanded] = useState(false);
  const [isSquadsExpanded, setIsSquadsExpanded] = useState(false);
  const [isPitchesExpanded, setIsPitchesExpanded] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [_isVenueInfoExpanded, _setIsVenueInfoExpanded] = useState(false);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [_showBookingMenu, _setShowBookingMenu] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{
    bookingId: string;
    newStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled';
    oldStatus: string;
    userName: string;
  } | null>(null);
  const [quickBookingData, setQuickBookingData] = useState({
    userName: '',
    userPhone: '',
    selectedPitchId: '',
    selectedDate: '',
    selectedSlot: '',
    notes: ''
  });

  // Loading state (moved up for proper hook ordering)
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!venueOwner?.venueId || !user) {
      return;
    }

    setLoadError(null);
    setDataLoading(true);

    try {
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      const response = await fetch('/api/dashboard/get-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: venueOwner.venueId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data = await response.json();

      const convertedBookings = (data.bookings || []).map((booking: Record<string, unknown>) => ({
        ...booking,
        startTime: new Date(booking.startTime as string),
        endTime: new Date(booking.endTime as string),
        createdAt: new Date(booking.createdAt as string),
        updatedAt: new Date(booking.updatedAt as string),
      }));

      const convertedPitches = (data.pitches || []).map((pitch: Record<string, unknown>) => ({
        ...pitch,
        createdAt: new Date(pitch.createdAt as string),
        updatedAt: new Date(pitch.updatedAt as string),
      }));

      const convertedVenue = data.venue ? {
        ...data.venue,
        createdAt: new Date(data.venue.createdAt),
        updatedAt: new Date(data.venue.updatedAt),
      } : null;

      setBookings(convertedBookings);
      setPitches(convertedPitches);
      setVenue(convertedVenue);

      // Fetch squads and trainings for academy list
      try {
        const [squadsData, trainingsData] = await Promise.all([
          squadService.getByVenue(venueOwner.venueId),
          trainingService.getByVenue(venueOwner.venueId)
        ]);
        setSquads(squadsData);
        setTrainings(trainingsData);

        // Medical alerts
        const [usersData, groupsData] = await Promise.all([
          academyUserService.getByVenue(venueOwner.venueId),
          userGroupService.getByVenue(venueOwner.venueId),
        ]);
        setAcademyUsers(usersData);
        setUserGroups(groupsData);
        const medicalGroupIds = new Set(
          groupsData.filter((g) => g.capabilities?.includes('medical_tracking')).map((g) => g.id)
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in30Days = new Date(today);
        in30Days.setDate(in30Days.getDate() + 30);

        const medicalUsers = usersData.filter((u) => medicalGroupIds.has(u.groupId));
        const expired: AcademyUser[] = [];
        const expiringSoon: AcademyUser[] = [];

        for (const u of medicalUsers) {
          const expiry = u.fields?.medical_cert_expiry as string | undefined;
          if (!expiry) {
            expired.push(u); // No cert = treat as expired
            continue;
          }
          const expiryDate = new Date(expiry);
          expiryDate.setHours(0, 0, 0, 0);
          if (expiryDate < today) {
            expired.push(u);
          } else if (expiryDate <= in30Days) {
            expiringSoon.push(u);
          }
        }
        setMedicalAlerts({ expired, expiringSoon });

        // Payment alerts – show athletes with unpaid months in the current year
        try {
          const paymentsData: AcademyPayment[] = await academyPaymentService.getByVenue(venueOwner.venueId);
          const paymentGroupIds = new Set(
            groupsData.filter((g) => g.capabilities?.includes('monthly_payment')).map((g) => g.id)
          );
          const paymentUsers = usersData.filter((u) => paymentGroupIds.has(u.groupId));
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth(); // 0-indexed
          const GREEK_MONTHS_SHORT = ['ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΪ', 'ΙΟΥΝ', 'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ'];
          const alerts: { user: AcademyUser; unpaidMonths: string[] }[] = [];
          for (const u of paymentUsers) {
            const unpaid: string[] = [];
            for (let m = 0; m <= currentMonth; m++) {
              const monthStr = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
              const payment = paymentsData.find((p) => p.userId === u.id && p.month === monthStr);
              if (!payment || !payment.paid) {
                unpaid.push(GREEK_MONTHS_SHORT[m]);
              }
            }
            if (unpaid.length > 0) {
              alerts.push({ user: u, unpaidMonths: unpaid });
            }
          }
          setPaymentAlerts(alerts);
        } catch (err) {
          console.error('Error loading payment alerts:', err);
        }
      } catch (err) {
        console.error('Error loading academy data:', err);
      }

      if (!convertedVenue && venueOwner.venueId) {
        setLoadError('Venue data not found. Please contact support.');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setLoadError(errorMessage);
    } finally {
      setDataLoading(false);
    }
  }, [venueOwner?.venueId, user]);

  // Close notifications when clicking outside
  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
  }, [user, venueOwner, authLoading, router, pathname]);

  useEffect(() => {
    if (venueOwner?.venueId) {
      loadDashboardData();
    }
  }, [venueOwner?.venueId, loadDashboardData]);

  // Smart refresh: 5 minutes when active, pause when inactive
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isActive = true;

    const startRefresh = () => {
      interval = setInterval(() => {
        if (venueOwner?.venueId && isActive) {
          loadDashboardData();
        }
      }, 300000); // 5 minutes
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActive = false;
        if (interval) clearInterval(interval);
      } else {
        isActive = true;
        startRefresh();
      }
    };

    const handleUserActivity = () => {
      if (!isActive) {
        isActive = true;
        startRefresh();
      }
    };

    // Start refresh when component mounts
    startRefresh();

    // Pause refresh when tab is hidden
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Resume refresh on user activity
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
    };
  }, [venueOwner?.venueId, loadDashboardData]);

  // Helper: create slug for /book/[venueName]
  function getVenueSlug(name?: string) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '');
  }

  const bookingPath = venue ? `/book/${getVenueSlug(venue.name)}` : '';

  // Show loading while checking authentication or fetching initial data
  if (authLoading || (dataLoading && (bookings.length === 0 || pitches.length === 0))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">
          {toGreekUpperCase('Φορτωση δεδομενων...')}
        </p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !venueOwner) {
    return null; // Will redirect to login
  }

  const getLiveBookings = () => {
    const now = new Date();
    return bookings.filter(booking => {
      // Check if booking is confirmed and currently running
      if (booking.status !== 'confirmed') return false;

      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);

      // A booking is "live" if it started and hasn't ended yet
      return startTime <= now && endTime > now;
    }).length;
  };

  const getTotalAthletes = () => {
    // Group IDs with 'squad_assignment' capability
    const athleteGroupIds = new Set(userGroups.filter(g => g.capabilities?.includes('squad_assignment')).map(g => g.id));
    return academyUsers.filter(u => athleteGroupIds.has(u.groupId)).length;
  };

  const getTodaysBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bookings
      .filter(booking => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= today && bookingDate < tomorrow && booking.status !== 'completed';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const getTodaysTrainings = () => {
    const today = new Date().toISOString().split('T')[0];
    return trainings
      .filter(t => t.date === today && t.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getPlayersPerPitch = (pitchType: string) => {
    switch (pitchType) {
      case '5x5': return 10; // 5v5 = 10 players
      case '6x6': return 12; // 6v6 = 12 players
      case '7x7': return 14; // 7v7 = 14 players
      case '8x8': return 16; // 8v8 = 16 players
      case '9x9': return 18; // 9v9 = 18 players
      default: return 10;
    }
  };

  const getPricePerPerson = (price: number, pitchType: string) => {
    const players = getPlayersPerPitch(pitchType);
    return (price / players).toFixed(0);
  };

  const generateAvailableSlots = (pitchId: string, date: string) => {
    const pitch = pitches.find(p => p.id === pitchId);
    if (!pitch) return [];

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const daySchedule = pitch.defaultOpeningHours[dayName];
    // Day schedule loaded

    if (!daySchedule || !daySchedule.isOpen) {
      // No opening hours for this day
      return [];
    }

    // Generate time slots based on opening hours and slot duration
    const slots: Array<{ time: string, display: string }> = [];

    if ('slots' in daySchedule && daySchedule.slots && daySchedule.slots.length > 0) {
      // New structure with slots array
      daySchedule.slots.forEach((openingSlot: { start: string; end: string }) => {
        // Processing time slot
        const startTime = new Date(`2000-01-01T${openingSlot.start}`);
        const endTime = new Date(`2000-01-01T${openingSlot.end}`);

        const currentTime = new Date(startTime);

        while (currentTime < endTime) {
          const slotStart = currentTime.toTimeString().slice(0, 5);
          const slotEnd = new Date(currentTime.getTime() + pitch.slotDuration * 60000);
          const slotEndTime = slotEnd.toTimeString().slice(0, 5);

          // Only add slot if it doesn't exceed closing time
          if (slotEnd <= endTime) {
            slots.push({
              time: `${slotStart} - ${slotEndTime}`,
              display: slotStart
            });
          }

          currentTime.setMinutes(currentTime.getMinutes() + pitch.slotDuration);
        }
      });
    } else if ('open' in daySchedule && 'close' in daySchedule && daySchedule.open && daySchedule.close) {
      // Old structure with open/close times
      const startTime = new Date(`2000-01-01T${daySchedule.open}`);
      const endTime = new Date(`2000-01-01T${daySchedule.close}`);

      const currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + pitch.slotDuration * 60000);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);

        // Only add slot if it doesn't exceed closing time
        if (slotEnd <= endTime) {
          slots.push({
            time: `${slotStart} - ${slotEndTime}`,
            display: slotStart
          });
        }

        currentTime.setMinutes(currentTime.getMinutes() + pitch.slotDuration);
      }
    }

    // Filter out already booked slots (including pending bookings)
    const bookedSlots = bookings
      .filter(booking =>
        booking.pitchId === pitchId &&
        booking.status !== 'cancelled' && // Don't count cancelled bookings
        new Date(booking.startTime).toDateString() === selectedDateObj.toDateString()
      )
      .map(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        const slotString = `${bookingStart.toTimeString().slice(0, 5)} - ${bookingEnd.toTimeString().slice(0, 5)}`;
        // Dashboard booking information
        return slotString;
      });

    // Dashboard slot information

    const availableSlots = slots.filter(slot => !bookedSlots.includes(slot.time));
    return availableSlots;
  };

  const handleQuickBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueOwner?.venueId) return;

    setIsCreatingBooking(true);
    try {
      const pitch = pitches.find(p => p.id === quickBookingData.selectedPitchId);
      if (!pitch) throw new Error('Pitch not found');

      // Parse the selected slot to get start time
      const [slotTime] = quickBookingData.selectedSlot.split(' - ');
      const [hours, minutes] = slotTime.split(':').map(Number);
      const startTime = new Date(quickBookingData.selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      // Calculate end time based on slot duration
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + pitch.slotDuration);

      const newBooking: Omit<Booking, 'id'> = {
        venueId: venueOwner.venueId,
        pitchId: quickBookingData.selectedPitchId,
        slotId: '', // Will be generated
        userId: '', // Will be generated
        userName: quickBookingData.userName,
        userEmail: '',
        userPhone: quickBookingData.userPhone,
        startTime: startTime,
        endTime: endTime,
        price: pitch.pricePerSlot,
        status: 'confirmed',
        notes: quickBookingData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await bookingService.create(newBooking);

      // Reset form
      setQuickBookingData({
        userName: '',
        userPhone: '',
        selectedPitchId: '',
        selectedDate: '',
        selectedSlot: '',
        notes: ''
      });
      setShowQuickBooking(false);

      // Reload data
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const _handleStatusChange = (bookingId: string, newStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled', oldStatus: string, userName: string) => {
    setStatusChangeData({
      bookingId,
      newStatus,
      oldStatus,
      userName
    });
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = async () => {
    if (!statusChangeData) return;

    try {
      await bookingService.update(statusChangeData.bookingId, {
        status: statusChangeData.newStatus,
        updatedAt: new Date()
      });

      // Reload data to reflect changes
      await loadDashboardData();

      // Close confirmation dialog
      setShowStatusConfirm(false);
      setStatusChangeData(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  if (!venueOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Παρακαλώ συνδεθείτε</h1>
          <Button asChild>
            <Link href="/venue-login">Σύνδεση</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Don't block rendering if venue is null - let the error state handle it

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Επιβεβαιωμένη</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Εκκρεμεί</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Ολοκληρωμένη</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Ακυρωμένη</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Error Alert */}
      {loadError && (
        <Alert variant="destructive" className="rounded-2xl border-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div>
                <p className="font-bold text-[16px]">Σφάλμα κατά τη φόρτωση δεδομένων</p>
                <p className="text-sm mt-1 opacity-90">{loadError}</p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="bg-white hover:bg-zinc-50 border-red-200 text-red-700 font-bold"
                onClick={() => {
                  setLoadError(null);
                  loadDashboardData();
                }}
              >
                Δοκιμάστε ξανά
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Online Bookings Toggle */}
      {venue && (
        <div className={cn(
          "flex items-center justify-between p-4 rounded-2xl border transition-all",
          (venue.bookingsEnabled ?? true)
            ? "bg-emerald-50/50 border-emerald-100"
            : "bg-zinc-50 border-zinc-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              (venue.bookingsEnabled ?? true) ? "bg-emerald-100" : "bg-zinc-200"
            )}>
              <CalendarDays className={cn("h-5 w-5", (venue.bookingsEnabled ?? true) ? "text-emerald-600" : "text-zinc-400")} />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">
                {(venue.bookingsEnabled ?? true) ? 'Online Κρατήσεις Ενεργές' : 'Online Κρατήσεις Ανενεργές'}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium">
                {(venue.bookingsEnabled ?? true)
                  ? `yabalitsa.com/book/${venue.name?.toLowerCase().replace(/\s+/g, '')}`
                  : 'Η σελίδα κρατήσεων και το QR code είναι απενεργοποιημένα'}
              </p>
            </div>
          </div>
          <div
            onClick={async () => {
              const newVal = !(venue.bookingsEnabled ?? true);
              try {
                // Optimistic update
                setVenue(prev => prev ? { ...prev, bookingsEnabled: newVal } : prev);
                setBookingsEnabled(newVal);
                await venueService.update(venue.id, { bookingsEnabled: newVal });
              } catch (err) {
                // Revert on error
                setVenue(prev => prev ? { ...prev, bookingsEnabled: !newVal } : prev);
                setBookingsEnabled(!newVal);
                console.error('Failed to toggle bookings:', err);
              }
            }}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors cursor-pointer flex-shrink-0",
              (venue.bookingsEnabled ?? true) ? "bg-emerald-500" : "bg-zinc-300"
            )}
          >
            <div className={cn(
              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              (venue.bookingsEnabled ?? true) && "translate-x-5"
            )} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-xl shadow-zinc-200 shrink-0 hover:border-emerald-200 transition-colors">
            <LayoutDashboard className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase">
              {toGreekUpperCase('Πίνακας Ελέγχου')}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                {toGreekUpperCase('Διαχειριση γηπεδου')} <span className="text-emerald-500 font-black">{venue?.name ? toGreekUpperCase(venue.name) : ''}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowQuickBooking(true)}
            className="h-12 px-6 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-[11px] shadow-lg shadow-zinc-900/10 transition-all active:scale-95 group uppercase tracking-widest"
          >
            <Plus className="h-4 w-4 mr-2 text-emerald-400 group-hover:rotate-90 transition-transform duration-500" />
            {toGreekUpperCase('Γρήγορη Κράτηση')}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (bookingPath) router.push(bookingPath);
            }}
            disabled={!bookingPath}
            className="h-12 px-6 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 font-black text-[11px] transition-all active:scale-95 shadow-sm uppercase tracking-widest"
          >
            {toGreekUpperCase('Σελιδα Booking')}
          </Button>
        </div>
      </div>

      {/* Stats Grids */}
      <div className="space-y-4">
        {/* Quick Stats Grid - Bookings & Venues */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'ΚΡΑΤΗΣΕΙΣ', value: bookings.length, detail: '30 ΗΜΕΡΕΣ', color: 'bg-emerald-500', image: '/dashboard/bookings.png' },
            { label: 'LIVE', value: getLiveBookings(), detail: 'ΤΩΡΑ', color: 'bg-blue-500', image: '/dashboard/live.png' },
            { label: 'ΣΗΜΕΡΑ', value: getTodaysBookings().length, detail: 'MATCHES', color: 'bg-amber-500', image: '/dashboard/today.png' },
            { label: 'ΠΕΛΑΤΕΣ', value: new Set(bookings.map(b => b.userName).filter(name => name && name.trim() !== '')).size, detail: 'DATABASE', color: 'bg-zinc-800', image: '/dashboard/customers.png' }
          ].map((stat, i) => (
            <Card key={i} className="rounded-2xl border-none shadow-sm overflow-hidden group transition-all duration-500 hover:shadow-md h-28 relative">
              <div className="absolute inset-0 z-0">
                <Image src={stat.image} alt="" fill className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              </div>
              <CardContent className="p-4 relative z-10 h-full flex flex-col justify-center">
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-white tracking-tighter leading-none">{stat.value}</p>
                </div>
                <p className="text-[8px] font-bold text-white/50 uppercase tracking-tight mt-1">{stat.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Academy Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'ΣΥΝΟΛΟ ΤΜΗΜΑΤΩΝ', value: squads.length, detail: 'ΕΝΕΡΓΑ ΤΜΗΜΑΤΑ', icon: <Trophy className="h-5 w-5 text-emerald-600" />, color: 'bg-emerald-50 border-b-4 border-emerald-200/50' },
            { label: 'ΣΥΝΟΛΟ ΑΘΛΗΤΩΝ', value: getTotalAthletes(), detail: 'ΕΝΕΡΓΟΙ ΑΘΛΗΤΕΣ', icon: <Users className="h-5 w-5 text-blue-600" />, color: 'bg-blue-50 border-b-4 border-blue-200/50' },
            { label: 'ΠΡΟΠΟΝΗΣΕΙΣ', value: getTodaysTrainings().length, detail: 'ΣΗΜΕΡΑ', icon: <CalendarDays className="h-5 w-5 text-amber-600" />, color: 'bg-amber-50 border-b-4 border-amber-200/50' },
            { label: 'ΙΑΤΡΙΚΑ', value: medicalAlerts.expired.length + medicalAlerts.expiringSoon.length, detail: 'ΕΚΚΡΕΜΟΤΗΤΕΣ', icon: <HeartPulse className="h-5 w-5 text-red-600" />, color: 'bg-red-50 border-b-4 border-red-200/50' }
          ].map((stat, i) => (
            <Card key={i} className={cn("rounded-[2rem] border-t border-x border-black/[0.02] shadow-xl shadow-zinc-200/50 transition-all hover:translate-y-[-2px] h-32 relative", stat.color)}>
              <CardContent className="p-5 h-full flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-zinc-900 tracking-tighter leading-none">{stat.value}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="h-1 w-1 rounded-full bg-zinc-300" />
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{stat.detail}</p>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-white shadow-sm border border-zinc-50 flex items-center justify-center shrink-0">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Today's Schedules - Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Today's Bookings */}
        <div className="space-y-8">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-lg hover:border-emerald-200 transition-colors">
                <Clock className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Σημερινές Κρατήσεις')}</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Πρόγραμμα ημέρας')}</p>
              </div>
            </div>
            <Button variant="outline" className="h-10 px-5 rounded-2xl border-none bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-black text-[10px] uppercase tracking-widest transition-all" asChild>
              <Link href="/management/bookings">
                {toGreekUpperCase('Προβολη ολων')}
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getTodaysBookings().slice(0, 4).length === 0 ? (
              <div className="col-span-full">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-zinc-50/50 shadow-none flex flex-col items-center justify-center p-12 text-center group transition-all hover:bg-zinc-50">
                  <div className="h-16 w-16 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm">
                    <Smile className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-zinc-900 font-black uppercase tracking-tight">{toGreekUpperCase('Δεν υπάρχουν κρατήσεις σήμερα')}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{toGreekUpperCase('Ολα ετοιμα για το επομενο match')}</p>
                </Card>
              </div>
            ) : (
              <>
                {getTodaysBookings().slice(0, 4).map((booking: Booking) => {
                  const pitch = pitches.find(p => p.id === booking.pitchId);
                  return (
                    <Card key={booking.id} className="rounded-[2.5rem] border border-black/[0.08] bg-white shadow-xl shadow-zinc-200/20 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500">
                      <CardContent className="p-8">
                        <div className="flex flex-col gap-6">
                          {/* User Info Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
                                <User className="h-6 w-6 text-emerald-600" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                                  {toGreekUpperCase(booking.userName || 'Unknown ')}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                  <p className="text-[10px] font-bold text-zinc-400">REGISTERED</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-zinc-900 tracking-tighter">
                                {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </p>
                              <p className="text-[10px] font-black text-emerald-500 uppercase">STARTING</p>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="flex items-center gap-4 py-3 border-y border-zinc-50">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100">
                              <FootballPitch className="h-3 w-3 text-zinc-400" />
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tight">{pitch ? toGreekUpperCase(pitch.name) : 'FIELD'}</span>
                            </div>
                            {booking.userPhone && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100">
                                <Phone className="h-3 w-3 text-zinc-400" />
                                <span className="text-[10px] font-black text-zinc-600 tracking-tight">{booking.userPhone}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Footer */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              {getStatusBadge(booking.status)}
                            </div>
                            <Button size="icon" variant="outline" className="h-10 w-10 rounded-2xl border-zinc-100 hover:bg-emerald-50 hover:border-emerald-200 text-zinc-400 transition-all" asChild>
                              <Link href={`/management/bookings/${booking.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {getTodaysBookings().slice(0, 4).length > 0 && getTodaysBookings().slice(0, 4).length < 2 && (
                  <Card className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-zinc-50/50 shadow-none flex flex-col items-center justify-center p-8 text-center opacity-60">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center mb-3">
                      <Smile className="h-5 w-5 text-emerald-300" />
                    </div>
                    <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-tight">{toGreekUpperCase('Δεν υπάρχουν άλλες κρατήσεις')}</h3>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Today's Trainings */}
        <div className="space-y-8">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-lg hover:border-emerald-200 transition-colors">
                <Trophy className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Σημερινές Προπονήσεις')}</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Πρόγραμμα ακαδημίας')}</p>
              </div>
            </div>
            <Button variant="outline" className="h-10 px-5 rounded-2xl border-none bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-black text-[10px] uppercase tracking-widest transition-all" asChild>
              <Link href="/management/academy/training">
                {toGreekUpperCase('Προβολη ολων')}
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getTodaysTrainings().slice(0, 4).length === 0 ? (
              <div className="col-span-full">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-zinc-50/50 shadow-none flex flex-col items-center justify-center p-12 text-center group transition-all hover:bg-zinc-50">
                  <div className="h-16 w-16 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm">
                    <Smile className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-zinc-900 font-black uppercase tracking-tight">{toGreekUpperCase('Δεν υπάρχουν προπονήσεις σήμερα')}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{toGreekUpperCase('Η ακαδημια εχει πρεσαρει αρκετα για σημερα')}</p>
                </Card>
              </div>
            ) : (
              <>
                {getTodaysTrainings().slice(0, 4).map((training: TrainingSession) => {
                  const squad = squads.find(s => s.id === training.squadId);
                  return (
                    <Card key={training.id} className="rounded-[2.5rem] border border-black/[0.08] bg-white shadow-xl shadow-zinc-200/20 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500">
                      <CardContent className="p-8">
                        <div className="flex flex-col gap-6">
                          {/* Session Info Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
                                <Activity className="h-6 w-6 text-emerald-600" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate max-w-[100px]">
                                  {toGreekUpperCase(squad?.name || 'SQUAD')}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{training.type}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-zinc-900 tracking-tighter">
                                {training.startTime}
                              </p>
                              <p className="text-[10px] font-black text-emerald-500 uppercase">START</p>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="flex items-center gap-4 py-3 border-y border-zinc-50">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100">
                              <User className="h-3 w-3 text-zinc-400" />
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tight">{toGreekUpperCase(training.coachName || 'COACH')}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100">
                              <Clock className="h-3 w-3 text-zinc-400" />
                              <span className="text-[10px] font-black text-zinc-600 tracking-tight">{training.endTime} END</span>
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 uppercase font-black text-[9px] px-2 py-0">
                                {toGreekUpperCase(training.status)}
                              </Badge>
                            </div>
                            <Button size="icon" variant="outline" className="h-10 w-10 rounded-2xl border-zinc-100 hover:bg-emerald-50 hover:border-emerald-200 text-zinc-400 transition-all" asChild>
                              <Link href={`/management/academy/training/${training.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {getTodaysTrainings().slice(0, 4).length > 0 && getTodaysTrainings().slice(0, 4).length < 2 && (
                  <Card className="rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-zinc-50/50 shadow-none flex flex-col items-center justify-center p-8 text-center opacity-60">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center mb-3">
                      <Smile className="h-5 w-5 text-emerald-300" />
                    </div>
                    <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-tight">{toGreekUpperCase('Δεν υπάρχουν άλλες προπονήσεις')}</h3>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Row: Medical + Payments */}
      {(medicalAlerts.expired.length > 0 || medicalAlerts.expiringSoon.length > 0 || paymentAlerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Medical Alerts - Left */}
          {(medicalAlerts.expired.length > 0 || medicalAlerts.expiringSoon.length > 0) && (
            <div className="rounded-3xl bg-white border-2 border-red-100 overflow-hidden shadow-lg shadow-red-50 h-fit">
              {/* Header */}
              <div
                className="bg-white border-b-2 border-red-100 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => setIsMedicalExpanded(!isMedicalExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <HeartPulse className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-red-600 uppercase tracking-wider">Ιατρικά Πιστοποιητικά</h3>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Απαιτείται άμεση ενέργεια</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 hidden sm:flex">
                    {medicalAlerts.expired.length > 0 && (
                      <div className="px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-black">
                        {medicalAlerts.expired.length} ΛΗΞΑΝΤΑ
                      </div>
                    )}
                  </div>
                  {isMedicalExpanded ? <ChevronUp className="h-5 w-5 text-red-500" /> : <ChevronDown className="h-5 w-5 text-red-500" />}
                </div>
              </div>

              <AnimatePresence>
                {isMedicalExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {/* Expired athletes list */}
                    <div className="divide-y divide-zinc-50 max-h-[400px] overflow-y-auto">
                      {medicalAlerts.expired.slice(0, 10).map((u) => (
                        <div key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-red-50/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <span className="text-sm font-bold text-zinc-900">{u.displayName}</span>
                          </div>
                          <span className="text-[10px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full">ΛΗΓΜΕΝΟ</span>
                        </div>
                      ))}
                      {medicalAlerts.expiringSoon.slice(0, 5).map((u) => (
                        <div key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-50/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="text-sm font-bold text-zinc-900">{u.displayName}</span>
                          </div>
                          <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full">ΛΗΓΕΙ ΣΥΝΤΟΜΑ</span>
                        </div>
                      ))}
                      {(medicalAlerts.expired.length + medicalAlerts.expiringSoon.length) > 15 && (
                        <div className="px-6 py-2 text-center text-[10px] font-black text-zinc-400 uppercase">
                          +{medicalAlerts.expired.length + medicalAlerts.expiringSoon.length - 15} ακόμα
                        </div>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="px-6 pb-6 pt-2">
                      <Link
                        href="/management/academy/medical"
                        className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Προβολή Ιατρικών
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Payment Alerts - Right */}
          {paymentAlerts.length > 0 && (
            <div className="rounded-3xl bg-white border-2 border-orange-100 overflow-hidden shadow-lg shadow-orange-50 h-fit">
              {/* Header */}
              <div
                className="bg-white border-b-2 border-orange-100 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors"
                onClick={() => setIsPaymentsExpanded(!isPaymentsExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center">
                    <BanknoteIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-orange-600 uppercase tracking-wider">Ανεξόφλητες Συνδρομές</h3>
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Τρέχον έτος · {new Date().getFullYear()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black hidden sm:block">
                    {paymentAlerts.length} ΑΘΛΗΤΕΣ
                  </div>
                  {isPaymentsExpanded ? <ChevronUp className="h-5 w-5 text-orange-500" /> : <ChevronDown className="h-5 w-5 text-orange-500" />}
                </div>
              </div>

              <AnimatePresence>
                {isPaymentsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {/* Unpaid athletes list */}
                    <div className="divide-y divide-zinc-50 max-h-[400px] overflow-y-auto">
                      {paymentAlerts.slice(0, 10).map(({ user: u, unpaidMonths }) => (
                        <div key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-orange-50/40 transition-colors gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                              <CreditCard className="h-4 w-4 text-orange-500" />
                            </div>
                            <span className="text-sm font-bold text-zinc-900 truncate">{u.displayName}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                            {unpaidMonths.slice(0, 4).map((m) => (
                              <span key={m} className="text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md">
                                {m}
                              </span>
                            ))}
                            {unpaidMonths.length > 4 && (
                              <span className="text-[9px] font-black text-orange-400 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md">
                                +{unpaidMonths.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {paymentAlerts.length > 10 && (
                        <div className="px-6 py-2 text-center text-[10px] font-black text-zinc-400 uppercase">
                          +{paymentAlerts.length - 10} ακόμα αθλητές
                        </div>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="px-6 pb-6 pt-2">
                      <Link
                        href="/management/academy/payments"
                        className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Προβολή Πληρωμών
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      )}

      {/* 50/50 Row for Academies and Pitches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
        {/* Academies List - Left Side */}
        <div className="rounded-3xl bg-white border border-zinc-200/80 overflow-hidden shadow-xl shadow-zinc-200/20 h-fit">
          <div
            className="flex items-center justify-between cursor-pointer group/header px-6 py-5 bg-zinc-50/50 hover:bg-zinc-50 transition-colors border-b border-zinc-100"
            onClick={() => setIsSquadsExpanded(!isSquadsExpanded)}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner group-hover/header:bg-emerald-200 transition-colors shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                  {toGreekUpperCase('Ακαδημίες')}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Τμήματα & Ομάδες
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-white shadow-sm border border-zinc-200 hover:bg-zinc-100 text-zinc-600 shrink-0" asChild onClick={(e) => e.stopPropagation()}>
                <Link href="/management/academy/squads">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              {isSquadsExpanded ? <ChevronUp className="h-5 w-5 text-zinc-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-zinc-400 shrink-0" />}
            </div>
          </div>

          <AnimatePresence>
            {isSquadsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden bg-white"
              >
                <div className="p-6 space-y-4">
                  {squads.length === 0 ? (
                    <div className="py-12 text-center bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-200 italic text-zinc-400 font-bold">
                      Δεν υπάρχουν ακαδημίες / τμήματα
                    </div>
                  ) : (
                    squads.slice(0, 5).map((squad) => (
                      <Card key={squad.id} className="rounded-3xl border border-black/[0.08] bg-white shadow-md shadow-zinc-200/20 overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0 relative">
                              <Trophy className="h-6 w-6 text-emerald-600 relative z-10" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate">{toGreekUpperCase(squad.name)}</h5>
                              <p className="text-[11px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">
                                {toGreekUpperCase(squad.ageGroup)}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                              <Link href={`/management/academy/squads`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pitches List - Right Side */}
        <div className="rounded-3xl bg-white border border-zinc-200/80 overflow-hidden shadow-xl shadow-zinc-200/20 h-fit">
          <div
            className="flex items-center justify-between cursor-pointer group/header px-6 py-5 bg-zinc-50/50 hover:bg-zinc-50 transition-colors border-b border-zinc-100"
            onClick={() => setIsPitchesExpanded(!isPitchesExpanded)}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner group-hover/header:bg-emerald-200 transition-colors shrink-0">
                <FootballPitch className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                  {toGreekUpperCase('Γήπεδα')}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Εγκαταστάσεις Venue
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-white shadow-sm border border-zinc-200 hover:bg-zinc-100 text-zinc-600 shrink-0" asChild onClick={(e) => e.stopPropagation()}>
                <Link href="/management/pitches/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              {isPitchesExpanded ? <ChevronUp className="h-5 w-5 text-zinc-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-zinc-400 shrink-0" />}
            </div>
          </div>

          <AnimatePresence>
            {isPitchesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden bg-white"
              >
                <div className="p-6 space-y-4">
                  {pitches.length === 0 ? (
                    <div className="py-12 text-center bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-200 italic text-zinc-400 font-bold">
                      Δεν υπάρχουν γήπεδα
                    </div>
                  ) : (
                    pitches.slice(0, 5).map((pitch) => (
                      <Card key={pitch.id} className="rounded-3xl border border-black/[0.08] bg-white shadow-md shadow-zinc-200/10 overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0 relative">
                              <FootballPitch className="h-10 w-16 text-emerald-600/20 absolute -right-2 -bottom-2 rotate-12" />
                              <FootballPitch className="h-6 w-6 text-emerald-600 relative z-10" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate">{toGreekUpperCase(pitch.name)} <span className="text-[10px] text-zinc-400 ml-1">{pitch.type}</span></h5>
                              <p className="text-[11px] font-bold text-zinc-500 mt-1">
                                €{pitch.pricePerSlot} <span className="text-zinc-300 mx-1">•</span> €{getPricePerPerson(pitch.pricePerSlot, pitch.type)}/άτομο
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                              <Link href={`/management/pitches/${pitch.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={showQuickBooking} onOpenChange={setShowQuickBooking}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Plus className="h-20 w-20 rotate-12" />
            </div>
            <DialogHeader className="relative z-10 text-left">
              <DialogTitle className="text-2xl font-black flex items-center gap-4 uppercase tracking-tight">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-zinc-900 shadow-lg shadow-emerald-500/20">
                  <Plus className="h-5 w-5" />
                </div>
                {toGreekUpperCase('Γρήγορη Κράτηση')}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 font-bold text-xs mt-1.5 uppercase tracking-widest pl-14">
                {toGreekUpperCase('Αμεση δημιουργια κρατησης')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleQuickBookingSubmit} className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Όνομα Πελάτη *')}</Label>
                <Input
                  id="userName"
                  placeholder={toGreekUpperCase('Ονοματεπωνυμο')}
                  value={quickBookingData.userName}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, userName: e.target.value })}
                  required
                  className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-bold text-sm focus:bg-white transition-all uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPhone" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Τηλέφωνο Επικοινωνίας *')}</Label>
                <Input
                  id="userPhone"
                  type="tel"
                  placeholder="69XXXXXXXX"
                  value={quickBookingData.userPhone}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, userPhone: e.target.value })}
                  required
                  className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-bold text-sm focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pitch" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Επιλογή Γηπέδου *')}</Label>
                <Select
                  value={quickBookingData.selectedPitchId}
                  onValueChange={(value: string) => setQuickBookingData({ ...quickBookingData, selectedPitchId: value, selectedSlot: '' })}
                  required
                >
                  <SelectTrigger id="pitch" className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-black text-sm focus:ring-0 transition-all uppercase shadow-inner">
                    <SelectValue placeholder={toGreekUpperCase('Επιλεξτε γηπεδο')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-2xl p-1">
                    {pitches.map((pitch) => (
                      <SelectItem key={pitch.id} value={pitch.id} className="cursor-pointer py-2.5 font-bold text-[13px] rounded-lg hover:bg-zinc-50 uppercase">
                        {toGreekUpperCase(`${pitch.name} (${pitch.type})`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Ημερομηνία *')}</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={quickBookingData.selectedDate}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, selectedDate: e.target.value, selectedSlot: '' })}
                  required
                  className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-bold text-sm focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Διαθέσιμες Ώρες')}</Label>
              {!quickBookingData.selectedPitchId || !quickBookingData.selectedDate ? (
                <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center gap-2.5">
                  <Clock className="h-6 w-6 text-zinc-200" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {toGreekUpperCase('Επιλεξτε γηπεδο και ημερομηνια')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).length === 0 ? (
                    <div className="col-span-full p-4 text-center bg-red-50 rounded-xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest">
                      {toGreekUpperCase('Δεν υπαρχουν διαθεσιμες ωρες')}
                    </div>
                  ) : (
                    generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setQuickBookingData({ ...quickBookingData, selectedSlot: slot.time })}
                        className={cn(
                          "h-10 rounded-lg text-[11px] font-black transition-all border-2 active:scale-95 uppercase tracking-tighter",
                          quickBookingData.selectedSlot === slot.time
                            ? "bg-zinc-900 border-zinc-900 text-white scale-105 z-10"
                            : "bg-white border-zinc-100 text-zinc-400 hover:border-emerald-200"
                        )}
                      >
                        {slot.display}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Σημειώσεις')}</Label>
              <Textarea
                id="notes"
                placeholder={toGreekUpperCase('Παρατηρήσεις...')}
                value={quickBookingData.notes}
                onChange={(e) => setQuickBookingData({ ...quickBookingData, notes: e.target.value })}
                className="min-h-[140px] rounded-[2rem] bg-zinc-50 border-none px-8 py-6 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-300 resize-none shadow-inner"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl font-bold text-zinc-400 hover:text-zinc-600 border-none bg-zinc-50 hover:bg-zinc-100 transition-all text-sm uppercase tracking-widest"
                onClick={() => setShowQuickBooking(false)}
              >
                {toGreekUpperCase('Ακύρωση')}              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg transition-all active:scale-[0.98] text-sm uppercase tracking-widest group"
                disabled={isCreatingBooking}
              >
                {isCreatingBooking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    {toGreekUpperCase('Δημιουργία...')}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-3 text-emerald-300 transition-transform" />
                    {toGreekUpperCase('Επιβεβαίωση')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Improved Confirmation Alert Dialog */}
      <AlertDialog open={showStatusConfirm && !!statusChangeData} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowStatusConfirm(false);
          setStatusChangeData(null);
        }
      }}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-w-md">
          <div className="p-8 pt-10">
            <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>

            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-2xl font-black text-zinc-900 uppercase leading-tight">
                {toGreekUpperCase('Αλλαγή Κατάστασης Κράτησης')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[16px] font-medium text-zinc-500 mt-3 px-2">
                Πρόκειται να αλλάξετε την κατάσταση της κράτησης του/της <span className="text-zinc-900 font-bold">{statusChangeData?.userName}</span> σε <span className="font-bold text-emerald-600">
                  {statusChangeData?.newStatus === 'confirmed' ? 'Επιβεβαιωμένη' :
                    statusChangeData?.newStatus === 'pending' ? 'Εκκρεμεί' :
                      statusChangeData?.newStatus === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη'}
                </span>.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="p-8 pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                variant="ghost"
                className="w-full h-12 rounded-xl font-bold text-zinc-500 flex-1 hover:bg-zinc-50"
                onClick={() => {
                  setShowStatusConfirm(false);
                  setStatusChangeData(null);
                }}
              >
                Πίσω
              </Button>
              <Button
                className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1 shadow-md shadow-emerald-600/20"
                onClick={confirmStatusChange}
              >
                Επιβεβαίωση
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
