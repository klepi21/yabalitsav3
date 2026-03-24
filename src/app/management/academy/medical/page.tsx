'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachFilter } from '@/hooks/useCoachFilter';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad } from '@/types/academy';
import {
  Loader2,
  HeartPulse,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Pencil,
  Users,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, toGreekUpperCase } from '@/lib/utils';
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

type MedicalStatus = 'expired' | 'expiring_soon' | 'valid' | 'missing';

interface AthleteWithMedical {
  user: AcademyUser;
  group: UserGroup | undefined;
  squad: Squad | undefined;
  expiryDate: string | null;
  status: MedicalStatus;
  daysUntilExpiry: number | null;
}

function getMedicalStatus(expiryDate: string | null): { status: MedicalStatus; daysUntilExpiry: number | null } {
  if (!expiryDate) return { status: 'missing', daysUntilExpiry: null };

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'expired', daysUntilExpiry: diffDays };
  if (diffDays <= 30) return { status: 'expiring_soon', daysUntilExpiry: diffDays };
  return { status: 'valid', daysUntilExpiry: diffDays };
}

const STATUS_CONFIG: Record<MedicalStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  expired: { label: 'Ληγμένο', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle },
  expiring_soon: { label: 'Λήγει σύντομα', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  valid: { label: 'Σε ισχύ', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  missing: { label: 'Χωρίς πιστοποιητικό', color: 'text-zinc-400', bg: 'bg-zinc-50 border-zinc-200', icon: HelpCircle },
};

export default function MedicalTrackingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const { isUserInVisibleSquad } = useCoachFilter();

  const [isLoading, setIsLoading] = useState(true);
  const [athletes, setAthletes] = useState<AthleteWithMedical[]>([]);
  const [allUsers, setAllUsers] = useState<AcademyUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MedicalStatus | 'all'>('all');
  const [notifyConfirm, setNotifyConfirm] = useState<AthleteWithMedical | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, venueOwner, authLoading, router, pathname]);

  const loadData = useCallback(async () => {
    if (!venueId) return;
    try {
      setIsLoading(true);
      const [usersData, groupsData, squadsData] = await Promise.all([
        academyUserService.getByVenue(venueId),
        userGroupService.getByVenue(venueId),
        squadService.getByVenue(venueId),
      ]);

      setAllUsers(usersData);

      // Find groups with medical_tracking capability
      const medicalGroupIds = new Set(
        groupsData.filter((g) => g.capabilities.includes('medical_tracking')).map((g) => g.id)
      );

      // Get athletes in those groups (filtered by coach visibility)
      const medicalAthletes: AthleteWithMedical[] = usersData
        .filter((u) => medicalGroupIds.has(u.groupId) && isUserInVisibleSquad(u))
        .map((u) => {
          const expiryDate = (u.fields?.medical_cert_expiry as string) || null;
          const { status, daysUntilExpiry } = getMedicalStatus(expiryDate);
          const group = groupsData.find((g) => g.id === u.groupId);
          const squadId = u.squad_ids?.[0] || u.squad_id;
          const squad = squadId ? squadsData.find((s) => s.id === squadId) : undefined;
          return { user: u, group, squad, expiryDate, status, daysUntilExpiry };
        })
        // Sort: expired first, then expiring_soon, then missing, then valid
        .sort((a, b) => {
          const order: Record<MedicalStatus, number> = { expired: 0, expiring_soon: 1, missing: 2, valid: 3 };
          return order[a.status] - order[b.status];
        });

      setAthletes(medicalAthletes);
    } catch (err) {
      console.error('Failed to load medical data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, isUserInVisibleSquad]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return athletes.filter((a) => {
      const matchesSearch = !search || a.user.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [athletes, search, statusFilter]);

  const stats = useMemo(() => ({
    total: athletes.length,
    expired: athletes.filter((a) => a.status === 'expired').length,
    expiring_soon: athletes.filter((a) => a.status === 'expiring_soon').length,
    valid: athletes.filter((a) => a.status === 'valid').length,
    missing: athletes.filter((a) => a.status === 'missing').length,
  }), [athletes]);

  const venueName = venueOwner?.name || '';

  // Find parent for an athlete
  const findParent = (athleteId: string) => {
    return allUsers.find((u) => u.linked_athletes?.includes(athleteId));
  };

  // Get notification email (parent → contact_email → email)
  const getNotificationEmail = (athleteUser: AcademyUser) => {
    const parent = findParent(athleteUser.id);
    if (parent?.fields?.email) return { email: parent.fields.email as string, name: parent.displayName, isParent: true };
    if (athleteUser.fields?.contact_email) return { email: athleteUser.fields.contact_email as string, name: athleteUser.displayName, isParent: false };
    if (athleteUser.fields?.email) return { email: athleteUser.fields.email as string, name: athleteUser.displayName, isParent: false };
    return null;
  };

  const handleNotify = async (athlete: AthleteWithMedical) => {
    const contact = getNotificationEmail(athlete.user);
    if (!contact) return;

    setNotifying(athlete.user.id);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/academy/notify-medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          recipientEmail: contact.email,
          recipientName: contact.name,
          athleteName: athlete.user.displayName,
          expiryDate: athlete.expiryDate,
          status: athlete.status,
          venueName,
          venueId,
        }),
      });
      if (!res.ok) throw new Error('Failed');

      // Save lastMedicalNotifiedAt on the user record
      const now = new Date().toISOString();
      await academyUserService.update(athlete.user.id, { lastMedicalNotifiedAt: now });
      setAthletes((prev) =>
        prev.map((a) =>
          a.user.id === athlete.user.id
            ? { ...a, user: { ...a.user, lastMedicalNotifiedAt: now } }
            : a
        )
      );

      setNotifySuccess(athlete.user.id);
      setTimeout(() => setNotifySuccess(null), 3000);
    } catch {
      console.error('Failed to notify');
    } finally {
      setNotifying(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-52 bg-zinc-200 rounded" />
              <div className="h-3 w-64 bg-zinc-100 rounded" />
            </div>
          </div>
        </div>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-zinc-100" />
          ))}
        </div>
        {/* Search skeleton */}
        <div className="h-11 w-full max-w-md rounded-xl bg-zinc-100" />
        {/* List skeleton */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-100 h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-xl shadow-red-200 shrink-0">
            <HeartPulse className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Ιατρικά Πιστοποιητικά')}
            </h1>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-tight">
              {toGreekUpperCase('Παρακολούθηση λήξης πιστοποιητικών')}
            </p>
          </div>
        </div>
      </div>

      {/* Alert banner for expired */}
      {stats.expired > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in">
          <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-black text-red-700">
              {stats.expired} {stats.expired === 1 ? 'αθλητής έχει' : 'αθλητές έχουν'} ληγμένο ιατρικό πιστοποιητικό!
            </p>
            <p className="text-sm text-red-500 font-medium mt-1">
              Η συμμετοχή τους σε προπονήσεις και αγώνες ενέχει νομικό κίνδυνο.
            </p>
          </div>
        </div>
      )}

      {stats.expiring_soon > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in">
          <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-black text-amber-700">
              {stats.expiring_soon} {stats.expiring_soon === 1 ? 'αθλητής' : 'αθλητές'} με πιστοποιητικό που λήγει εντός 30 ημερών
            </p>
            <p className="text-sm text-amber-500 font-medium mt-1">
              Ενημερώστε τους γονείς για ανανέωση.
            </p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: 'expired' as const, label: 'Ληγμένα', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', count: stats.expired },
          { key: 'expiring_soon' as const, label: 'Λήγουν σύντομα', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', count: stats.expiring_soon },
          { key: 'valid' as const, label: 'Σε ισχύ', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', count: stats.valid },
          { key: 'missing' as const, label: 'Χωρίς', icon: HelpCircle, color: 'text-zinc-400', bg: 'bg-zinc-50', count: stats.missing },
        ]).map((stat) => (
          <button
            key={stat.key}
            onClick={() => setStatusFilter(statusFilter === stat.key ? 'all' : stat.key)}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all text-left",
              statusFilter === stat.key
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg scale-105'
                : `border-zinc-100 bg-white hover:shadow-md`
            )}
          >
            <stat.icon className={cn("h-5 w-5 mb-2", statusFilter === stat.key ? 'text-white' : stat.color)} />
            <p className={cn("text-2xl font-black", statusFilter === stat.key ? 'text-white' : 'text-zinc-900')}>{stat.count}</p>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest", statusFilter === stat.key ? 'text-zinc-400' : 'text-zinc-400')}>
              {toGreekUpperCase(stat.label)}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
        <Input
          placeholder={toGreekUpperCase('Αναζήτηση αθλητή...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-11 bg-white rounded-xl"
        />
      </div>

      {/* Athletes list */}
      {athletes.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-zinc-100 bg-white p-16 text-center">
          <div className="mx-auto h-20 w-20 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center mb-6">
            <HeartPulse className="h-10 w-10 text-zinc-200" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 mb-2">Δεν υπάρχουν αθλητές</h3>
          <p className="text-zinc-500 max-w-md mx-auto">
            Ενεργοποιήστε τη δυνατότητα &quot;Ιατρικό πιστοποιητικό&quot; σε μια κατηγορία χρηστών για να ξεκινήσετε την παρακολούθηση.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((athlete) => {
            const cfg = STATUS_CONFIG[athlete.status];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={athlete.user.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 bg-white transition-all hover:shadow-md group",
                  athlete.status === 'expired' && 'border-red-200 bg-red-50/30',
                  athlete.status === 'expiring_soon' && 'border-amber-200 bg-amber-50/30',
                  athlete.status === 'valid' && 'border-zinc-100',
                  athlete.status === 'missing' && 'border-zinc-100',
                )}
              >
                {/* Status icon */}
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                  <StatusIcon className={cn("h-5 w-5", cfg.color)} />
                </div>

                {/* Athlete info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate">
                    {toGreekUpperCase(athlete.user.displayName)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {athlete.squad && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {athlete.squad.name}
                      </span>
                    )}
                    {athlete.user.fields?.birth_year && (
                      <span className="text-[10px] font-bold text-zinc-400">
                        {athlete.user.fields.birth_year}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expiry date */}
                <div className="text-right shrink-0">
                  {athlete.expiryDate ? (
                    <>
                      <p className={cn("text-sm font-black", cfg.color)}>
                        {new Date(athlete.expiryDate).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className={cn("text-[10px] font-bold", cfg.color)}>
                        {athlete.status === 'expired'
                          ? `Ληγμένο ${Math.abs(athlete.daysUntilExpiry!)} ημέρες`
                          : athlete.status === 'expiring_soon'
                            ? `Λήγει σε ${athlete.daysUntilExpiry} ημέρες`
                            : `Λήγει σε ${athlete.daysUntilExpiry} ημέρες`
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-zinc-300">Δεν έχει οριστεί</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {athlete.status !== 'valid' && getNotificationEmail(athlete.user) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-xl transition-all",
                        notifySuccess === athlete.user.id
                          ? "text-emerald-500"
                          : athlete.user.lastMedicalNotifiedAt
                            ? "text-amber-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-zinc-300 hover:text-amber-500 hover:bg-amber-50"
                      )}
                      onClick={() => setNotifyConfirm(athlete)}
                      disabled={notifying === athlete.user.id}
                      title={athlete.user.lastMedicalNotifiedAt
                        ? `Τελευταία ειδοποίηση: ${new Date(athlete.user.lastMedicalNotifiedAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'Αποστολή ειδοποίησης'
                      }
                    >
                      {notifying === athlete.user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : notifySuccess === athlete.user.id ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <Link href={`/management/academy/users/${athlete.user.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400 font-bold">Δεν βρέθηκαν αθλητές</p>
            </div>
          )}
        </div>
      )}
      {/* Notify Confirmation Dialog */}
      <AlertDialog open={notifyConfirm !== null} onOpenChange={(open) => !open && setNotifyConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {notifyConfirm && (() => {
            const contact = getNotificationEmail(notifyConfirm.user);
            const cfg = STATUS_CONFIG[notifyConfirm.status];
            return (
              <>
                <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-600 px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-800/20">
                    <HeartPulse className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      Ειδοποίηση Πιστοποιητικού
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-red-100 text-sm mt-1">
                      Υπενθύμιση ανανέωσης ιατρικού
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>

                <div className="px-8 py-6 space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", cfg.bg)}>
                      <cfg.icon className={cn("h-5 w-5", cfg.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{notifyConfirm.user.displayName}</p>
                      <p className={cn("text-[11px] font-bold", cfg.color)}>
                        {notifyConfirm.expiryDate
                          ? `${cfg.label} — ${new Date(notifyConfirm.expiryDate).toLocaleDateString('el-GR')}`
                          : 'Χωρίς πιστοποιητικό'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">{toGreekUpperCase('Παραλήπτης')}</p>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{contact?.name || '—'}</p>
                        <p className="text-[11px] text-zinc-400 font-medium">
                          {contact?.email || 'Δεν υπάρχει email'}
                          {contact?.isParent && <span className="ml-1 text-blue-400">(Γονέας)</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {notifyConfirm.user.lastMedicalNotifiedAt && (
                  <div className="px-8">
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <p className="text-[11px] text-amber-700 font-medium">
                        Τελευταία ειδοποίηση: {new Date(notifyConfirm.user.lastMedicalNotifiedAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col">
                    <AlertDialogAction
                      onClick={() => {
                        handleNotify(notifyConfirm);
                        setNotifyConfirm(null);
                      }}
                      className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] m-0"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Αποστολή Email
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-10 w-full rounded-xl border-none bg-transparent text-zinc-400 hover:text-zinc-600 font-bold text-sm m-0">
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
