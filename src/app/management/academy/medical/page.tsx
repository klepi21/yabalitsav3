'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, toGreekUpperCase } from '@/lib/utils';

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

  const [isLoading, setIsLoading] = useState(true);
  const [athletes, setAthletes] = useState<AthleteWithMedical[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MedicalStatus | 'all'>('all');

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

      // Find groups with medical_tracking capability
      const medicalGroupIds = new Set(
        groupsData.filter((g) => g.capabilities.includes('medical_tracking')).map((g) => g.id)
      );

      // Get athletes in those groups
      const medicalAthletes: AthleteWithMedical[] = usersData
        .filter((u) => medicalGroupIds.has(u.groupId))
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
  }, [venueId]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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

                {/* Edit button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  asChild
                >
                  <Link href={`/management/academy/users/${athlete.user.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
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
    </div>
  );
}
