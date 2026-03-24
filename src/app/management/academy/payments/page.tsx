'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { academyPaymentService, userGroupService, academyUserService, squadService } from '@/lib/academy-services';
import { AcademyPayment, AcademyUser, UserGroup, Squad, PaymentMethod, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '@/types/academy';
import {
  Loader2,
  Euro,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toGreekUpperCase } from '@/lib/utils';
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

const GREEK_MONTHS = [
  'ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΪ', 'ΙΟΥΝ',
  'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ',
];

const GREEK_MONTHS_FULL = [
  'Ιανουάριο', 'Φεβρουάριο', 'Μάρτιο', 'Απρίλιο', 'Μάιο', 'Ιούνιο',
  'Ιούλιο', 'Αύγουστο', 'Σεπτέμβριο', 'Οκτώβριο', 'Νοέμβριο', 'Δεκέμβριο',
];

export default function PaymentsDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPayments, setAllPayments] = useState<AcademyPayment[]>([]);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [allUsers, setAllUsers] = useState<AcademyUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [defaultAmount, setDefaultAmount] = useState(50);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null);
  const [focusedMonth, setFocusedMonth] = useState<number | null>(new Date().getMonth());
  const [notifyConfirm, setNotifyConfirm] = useState<{ athlete: AcademyUser; month: number } | null>(null);
  const [payConfirm, setPayConfirm] = useState<{ athlete: AcademyUser; month: number; payment?: AcademyPayment } | null>(null);
  const [unpayConfirm, setUnpayConfirm] = useState<{ athlete: AcademyUser; month: number; payment: AcademyPayment } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');

  const venueId = venueOwner?.venueId || '';
  const venueName = venueOwner?.name || '';

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
      const [paymentsData, usersData, groupsData, squadsData] = await Promise.all([
        academyPaymentService.getByVenue(venueId),
        academyUserService.getByVenue(venueId),
        userGroupService.getByVenue(venueId),
        squadService.getByVenue(venueId),
      ]);
      setAllPayments(paymentsData);
      setAllUsers(usersData);
      setGroups(groupsData);
      const enabledSquads = squadsData.filter(s => s.paymentsEnabled);
      setSquads(enabledSquads);

      const enabledSquadIds = new Set(enabledSquads.map(s => s.id));
      const paymentGroups = groupsData.filter((g) => g.capabilities.includes('monthly_payment'));
      const paymentGroupIds = new Set(paymentGroups.map((g) => g.id));
      // Only show athletes that belong to a squad with payments enabled
      setAthletes(usersData.filter((u) => {
        if (!paymentGroupIds.has(u.groupId)) return false;
        const userSquadIds = u.squad_ids || (u.squad_id ? [u.squad_id] : []);
        return userSquadIds.some(sid => enabledSquadIds.has(sid));
      }));

      const firstGroupAmount = paymentGroups.find((g) => g.monthlyAmount)?.monthlyAmount;
      if (firstGroupAmount) setDefaultAmount(firstGroupAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get the expected amount for an athlete (squad > group > default)
  const getExpectedAmount = useCallback((athlete: AcademyUser) => {
    const athleteSquadIds = athlete.squad_ids || (athlete.squad_id ? [athlete.squad_id] : []);
    for (const sid of athleteSquadIds) {
      const squad = squads.find((s) => s.id === sid);
      if (squad?.monthlyAmount) return squad.monthlyAmount;
    }
    const group = groups.find((g) => g.id === athlete.groupId);
    if (group?.monthlyAmount) return group.monthlyAmount;
    return defaultAmount;
  }, [squads, groups, defaultAmount]);

  // Get payment record (or null if none exists yet)
  const getPayment = (userId: string, month: number) => {
    const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
    return allPayments.find((p) => p.userId === userId && p.month === monthStr) || null;
  };

  // Create a payment record on-the-fly (lazy creation)
  const ensurePaymentRecord = async (athlete: AcademyUser, month: number): Promise<AcademyPayment> => {
    const existing = getPayment(athlete.id, month);
    if (existing) return existing;

    const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
    const amount = getExpectedAmount(athlete);
    const id = await academyPaymentService.create({
      venueId,
      userId: athlete.id,
      userName: athlete.displayName,
      month: monthStr,
      amount,
      paid: false,
    });
    const newPayment: AcademyPayment = {
      id,
      venueId,
      userId: athlete.id,
      userName: athlete.displayName,
      month: monthStr,
      amount,
      paid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAllPayments((prev) => [...prev, newPayment]);
    return newPayment;
  };

  // Click on payment cell
  const handlePaymentClick = (athlete: AcademyUser, month: number) => {
    const payment = getPayment(athlete.id, month);
    if (payment?.paid) {
      setUnpayConfirm({ athlete, month, payment });
    } else {
      setSelectedPaymentMethod('cash');
      setPayConfirm({ athlete, month, payment: payment || undefined });
    }
  };

  // Mark as paid
  const handleConfirmPayment = async () => {
    if (!payConfirm) return;
    const { athlete, month } = payConfirm;
    const key = `pay-${athlete.id}-${month}`;
    setTogglingPayment(key);
    setPayConfirm(null);
    try {
      const payment = await ensurePaymentRecord(athlete, month);
      await academyPaymentService.togglePaid(payment.id, true, selectedPaymentMethod);
      setAllPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, paid: true, paidAt: new Date().toISOString(), paymentMethod: selectedPaymentMethod }
            : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης');
    } finally {
      setTogglingPayment(null);
    }
  };

  // Unmark payment
  const handleConfirmUnpay = async () => {
    if (!unpayConfirm) return;
    const { payment } = unpayConfirm;
    setTogglingPayment(`unpay-${payment.id}`);
    setUnpayConfirm(null);
    try {
      await academyPaymentService.togglePaid(payment.id, false);
      setAllPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, paid: false, paidAt: undefined, paymentMethod: undefined }
            : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης');
    } finally {
      setTogglingPayment(null);
    }
  };

  // Find parent for an athlete
  const findParent = (athleteId: string) => {
    return allUsers.find((u) => u.linked_athletes?.includes(athleteId));
  };

  // Get notification email
  const getNotificationEmail = (athlete: AcademyUser) => {
    const parent = findParent(athlete.id);
    if (parent?.fields?.email) return { email: parent.fields.email as string, name: parent.displayName, isParent: true };
    if (athlete.fields?.contact_email) return { email: athlete.fields.contact_email as string, name: athlete.displayName, isParent: false };
    if (athlete.fields?.email) return { email: athlete.fields.email as string, name: athlete.displayName, isParent: false };
    return null;
  };

  // Notify parent
  const handleNotifyParent = async (athlete: AcademyUser, month: number) => {
    const contact = getNotificationEmail(athlete);
    if (!contact) {
      setError(`Δεν βρέθηκε email για τον/την ${athlete.displayName}`);
      return;
    }
    const key = `${athlete.id}-${month}`;
    setNotifying(key);
    try {
      const payment = await ensurePaymentRecord(athlete, month);
      const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
      const token = await user?.getIdToken();
      const res = await fetch('/api/academy/notify-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          parentEmail: contact.email,
          parentName: contact.name,
          athleteName: athlete.displayName,
          month: monthStr,
          amount: payment.amount,
          venueName,
          venueId,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const now = new Date().toISOString();
      await academyPaymentService.update(payment.id, { lastNotifiedAt: now });
      setAllPayments((prev) =>
        prev.map((p) => p.id === payment.id ? { ...p, lastNotifiedAt: now } : p)
      );
      setNotifySuccess(key);
      setTimeout(() => setNotifySuccess(null), 3000);
    } catch {
      setError('Αποτυχία αποστολής ειδοποίησης');
    } finally {
      setNotifying(null);
    }
  };

  // Stats for a month (combines real records + virtual)
  const getMonthStats = (month: number) => {
    const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
    const monthPayments = allPayments.filter((p) => p.month === monthStr);
    const paidFromRecords = monthPayments.filter((p) => p.paid).length;
    const unpaidFromRecords = monthPayments.filter((p) => !p.paid).length;
    // Athletes without a record are implicitly unpaid
    const athletesWithRecord = new Set(monthPayments.map((p) => p.userId));
    const athletesWithoutRecord = athletes.filter((a) => !athletesWithRecord.has(a.id)).length;
    const totalPaid = paidFromRecords;
    const totalUnpaid = unpaidFromRecords + athletesWithoutRecord;
    const totalCollected = monthPayments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);
    return { paid: totalPaid, unpaid: totalUnpaid, total: totalCollected, count: athletes.length };
  };

  const filteredAthletes = athletes.filter((a) =>
    a.displayName.toLowerCase().includes(search.toLowerCase())
  );

  // Group athletes by squad
  const athletesBySquad = (() => {
    const grouped: { squad: Squad | null; athletes: AcademyUser[] }[] = [];
    const squadMap = new Map<string, AcademyUser[]>();
    const noSquad: AcademyUser[] = [];

    const enabledSquadIds = new Set(squads.map(s => s.id));
    for (const athlete of filteredAthletes) {
      const athleteSquadIds = athlete.squad_ids || (athlete.squad_id ? [athlete.squad_id] : []);
      // Find the first squad that has payments enabled
      const primarySquadId = athleteSquadIds.find(sid => enabledSquadIds.has(sid));
      if (!primarySquadId) {
        noSquad.push(athlete);
      } else {
        if (!squadMap.has(primarySquadId)) {
          squadMap.set(primarySquadId, []);
        }
        squadMap.get(primarySquadId)!.push(athlete);
      }
    }

    // Sort squads alphabetically
    const sortedSquadIds = Array.from(squadMap.keys()).sort((a, b) => {
      const sa = squads.find((s) => s.id === a);
      const sb = squads.find((s) => s.id === b);
      return (sa?.name || '').localeCompare(sb?.name || '');
    });

    for (const squadId of sortedSquadIds) {
      const squad = squads.find((s) => s.id === squadId) || null;
      grouped.push({ squad, athletes: squadMap.get(squadId)! });
    }

    if (noSquad.length > 0) {
      grouped.push({ squad: null, athletes: noSquad });
    }

    return grouped;
  })();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-36 bg-zinc-200 rounded" />
              <div className="h-3 w-52 bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-zinc-100" />
            <div className="h-6 w-16 bg-zinc-200 rounded" />
            <div className="h-10 w-10 rounded-xl bg-zinc-100" />
          </div>
        </div>
        {/* Month grid skeleton */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-100" />
          ))}
        </div>
        {/* Search skeleton */}
        <div className="h-11 w-full max-w-sm rounded-lg bg-zinc-100" />
        {/* Table skeleton */}
        <div className="rounded-2xl bg-white border border-zinc-100 overflow-hidden">
          <div className="h-10 bg-zinc-50" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-zinc-50">
              <div className="h-8 w-8 rounded-lg bg-zinc-100" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 bg-zinc-100 rounded" />
                <div className="h-3 w-48 bg-zinc-50 rounded" />
              </div>
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-8 w-8 rounded-lg bg-zinc-50 hidden sm:block" />
              ))}
            </div>
          ))}
        </div>
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
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-200 shrink-0">
            <Euro className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Πληρωμές')}
            </h1>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-tight">
              {toGreekUpperCase('Ετήσια επισκόπηση πληρωμών')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setSelectedYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-black text-zinc-900 min-w-[80px] text-center">{selectedYear}</span>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setSelectedYear((y) => y + 1)} disabled={selectedYear >= currentYear}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month summary cards */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {Array.from({ length: 12 }, (_, i) => {
          const stats = getMonthStats(i);
          const isCurrentMonth = i === currentMonth && selectedYear === currentYear;
          return (
            <div
              key={i}
              className={`rounded-xl p-2.5 text-center border transition-all cursor-pointer ${
                focusedMonth === i
                  ? 'border-emerald-400 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                  : isCurrentMonth
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-zinc-100 bg-white hover:border-zinc-200'
              }`}
              onClick={() => setFocusedMonth(i)}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{GREEK_MONTHS[i]}</p>
              {athletes.length > 0 ? (
                <>
                  <p className="text-sm font-black text-emerald-600 mt-1">{stats.paid}</p>
                  <p className="text-[8px] font-bold text-zinc-300">/{stats.count}</p>
                  {stats.unpaid > 0 && (
                    <p className="text-[8px] font-bold text-red-400 mt-0.5">{stats.unpaid} ανεξόφλ.</p>
                  )}
                </>
              ) : (
                <p className="text-[9px] font-bold text-zinc-300 mt-2">—</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Αναζήτηση αθλητή..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 max-w-sm bg-white"
        />
        <span className="text-sm font-bold text-zinc-400">
          {filteredAthletes.length} {toGreekUpperCase('αθλητές')}
        </span>
      </div>

      {athletes.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-zinc-100 bg-white p-16 text-center">
          <div className="mx-auto h-20 w-20 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center mb-6">
            <Users className="h-10 w-10 text-zinc-200" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 mb-2">Δεν υπάρχουν αθλητές με πληρωμές</h3>
          <p className="text-zinc-500 max-w-md mx-auto">
            Βεβαιωθείτε ότι έχετε δημιουργήσει κατηγορία χρηστών με τη δυνατότητα &quot;Μηνιαία πληρωμή&quot; ενεργοποιημένη.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left p-3 text-[9px] font-bold uppercase tracking-widest text-zinc-400 sticky left-0 bg-white z-10 min-w-[200px]">
                    {toGreekUpperCase('Αθλητής')}
                  </th>
                  {Array.from({ length: 12 }, (_, i) => {
                    const isCurrentMonth = i === currentMonth && selectedYear === currentYear;
                    return (
                      <th
                        key={i}
                        className={`text-center p-2 text-[9px] font-bold uppercase tracking-wider ${
                          focusedMonth === i
                            ? 'text-emerald-700 bg-emerald-100/60'
                            : isCurrentMonth ? 'text-emerald-600 bg-emerald-50/50' : 'text-zinc-400'
                        }`}
                      >
                        <div>{GREEK_MONTHS[i]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {athletesBySquad.map(({ squad, athletes: squadAthletes }, groupIdx) => (
                  <React.Fragment key={squad?.id || `no-squad-${groupIdx}`}>
                    {/* Squad header row */}
                    <tr className={`${groupIdx > 0 ? 'border-t-2 border-zinc-200' : ''}`}>
                      <td className="p-3 sticky left-0 bg-zinc-50 z-10" colSpan={1}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📋</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {squad ? toGreekUpperCase(squad.name) : toGreekUpperCase('Χωρίς τμήμα')}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-300 ml-1">
                            ({squadAthletes.length})
                          </span>
                          <span className="text-[9px] font-bold text-emerald-500 ml-auto">
                            €{squad?.monthlyAmount || defaultAmount}/μήνα
                            {!squad?.monthlyAmount && <span className="text-zinc-300 ml-1"></span>}
                          </span>
                        </div>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => (
                        <td key={i} className={`bg-zinc-50 ${focusedMonth === i ? 'bg-emerald-50/80' : ''}`} />
                      ))}
                    </tr>
                    {/* Athletes in this squad */}
                    {squadAthletes.map((athlete) => {
                      const parent = findParent(athlete.id);
                      const group = groups.find((g) => g.id === athlete.groupId);
                      const expectedAmount = getExpectedAmount(athlete);
                      return (
                        <tr key={athlete.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                          <td className="p-3 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-sm">
                                {group?.icon || '⚽'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{athlete.displayName}</p>
                                {parent && (
                                  <p className="text-[10px] text-zinc-400">
                                    {parent.displayName}
                                    {parent.fields?.email && (
                                      <span className="ml-1 text-zinc-300">({parent.fields.email as string})</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          {Array.from({ length: 12 }, (_, month) => {
                            const payment = getPayment(athlete.id, month);
                            const isCurrentMonth = month === currentMonth && selectedYear === currentYear;
                            const key = `${athlete.id}-${month}`;
                            const amount = expectedAmount;
                            const isPaid = payment?.paid || false;
                            const isToggling = togglingPayment === `pay-${athlete.id}-${month}` || togglingPayment === `unpay-${payment?.id}`;

                            return (
                              <td key={month} className={`text-center p-1.5 group/cell ${focusedMonth === month ? 'bg-emerald-50/50' : isCurrentMonth ? 'bg-emerald-50/30' : ''}`}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <button
                                    onClick={() => handlePaymentClick(athlete, month)}
                                    disabled={isToggling}
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                                      isPaid
                                        ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                    }`}
                                    title={isPaid
                                      ? `Εξοφλημένο - €${amount}${payment?.paymentMethod ? ` (${PAYMENT_METHOD_LABELS[payment.paymentMethod]})` : ''}`
                                      : `Ανεξόφλητο - €${amount}`
                                    }
                                  >
                                    {isToggling ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : isPaid ? (
                                      <span className="text-xs">{payment?.paymentMethod ? PAYMENT_METHOD_ICONS[payment.paymentMethod] : <Check className="h-3.5 w-3.5" />}</span>
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <span className="text-[8px] font-bold text-zinc-400">
                                    €{amount}
                                  </span>
                                  {isPaid && payment?.paymentMethod && (
                                    <span className="text-[7px] font-bold text-emerald-400 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                      {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                                    </span>
                                  )}
                                  {!isPaid && getNotificationEmail(athlete) && (
                                    <button
                                      onClick={() => setNotifyConfirm({ athlete, month })}
                                      disabled={notifying === key}
                                      className={`text-[8px] transition-colors ${
                                        payment?.lastNotifiedAt
                                          ? 'text-amber-400 hover:text-amber-600'
                                          : 'text-zinc-300 hover:text-amber-500'
                                      }`}
                                      title={payment?.lastNotifiedAt
                                        ? `Τελευταία ειδοποίηση: ${new Date(payment.lastNotifiedAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                        : 'Ειδοποίηση'
                                      }
                                    >
                                      {notifying === key ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : notifySuccess === key ? (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <Send className="h-3 w-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Year totals */}
      {athletes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(() => {
            const yearPayments = allPayments.filter((p) => p.month.startsWith(`${selectedYear}-`));
            const totalPaid = yearPayments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
            const totalUnpaid = yearPayments.filter((p) => !p.paid).reduce((s, p) => s + p.amount, 0);
            // Add expected amounts for athletes without records
            const virtualUnpaid = athletes.reduce((sum, athlete) => {
              let athleteVirtual = 0;
              for (let m = 0; m < 12; m++) {
                const monthStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
                const hasRecord = yearPayments.some((p) => p.userId === athlete.id && p.month === monthStr);
                if (!hasRecord) athleteVirtual += getExpectedAmount(athlete);
              }
              return sum + athleteVirtual;
            }, 0);
            return (
              <>
                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    {toGreekUpperCase('Εισπράξεις')} {selectedYear}
                  </p>
                  <p className="text-2xl font-black text-emerald-600">&euro;{totalPaid.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    {toGreekUpperCase('Ανεξόφλητα')} {selectedYear}
                  </p>
                  <p className="text-2xl font-black text-red-500">&euro;{(totalUnpaid + virtualUnpaid).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    {toGreekUpperCase('Σύνολο')} {selectedYear}
                  </p>
                  <p className="text-2xl font-black text-zinc-900">&euro;{(totalPaid + totalUnpaid + virtualUnpaid).toLocaleString()}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={payConfirm !== null} onOpenChange={(open) => !open && setPayConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {payConfirm && (() => {
            const { athlete } = payConfirm;
            const group = groups.find((g) => g.id === athlete.groupId);
            const amount = getExpectedAmount(athlete);
            return (
              <>
                <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-600/20">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      Επιβεβαίωση Πληρωμής
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-emerald-100 text-sm mt-1">
                      Καταχώρηση εξόφλησης αθλητή
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-8 py-6 space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-lg shadow-sm">
                      {group?.icon || '⚽'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{athlete.displayName}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">
                        {GREEK_MONTHS_FULL[payConfirm.month]} {selectedYear}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-lg font-black text-emerald-600">&euro;{amount}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">
                      {toGreekUpperCase('Τρόπος Πληρωμής')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          onClick={() => setSelectedPaymentMethod(method)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                            selectedPaymentMethod === method
                              ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                              : 'border-zinc-100 bg-white hover:border-zinc-200'
                          }`}
                        >
                          <span className="text-lg">{PAYMENT_METHOD_ICONS[method]}</span>
                          <span className={`text-xs font-bold ${selectedPaymentMethod === method ? 'text-emerald-700' : 'text-zinc-600'}`}>
                            {PAYMENT_METHOD_LABELS[method]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col">
                    <AlertDialogAction
                      onClick={handleConfirmPayment}
                      className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] m-0"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Εξοφλήθηκε
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

      {/* Unpay Confirmation Dialog */}
      <AlertDialog open={unpayConfirm !== null} onOpenChange={(open) => !open && setUnpayConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {unpayConfirm && (() => {
            const { athlete, payment } = unpayConfirm;
            const group = groups.find((g) => g.id === athlete.groupId);
            return (
              <>
                <div className="bg-gradient-to-br from-red-400 via-red-500 to-rose-600 px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-600/20">
                    <X className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      Αναίρεση Πληρωμής
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-red-100 text-sm mt-1">
                      Σίγουρα θέλετε να αναιρέσετε αυτή την πληρωμή;
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-8 py-6">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-lg shadow-sm">
                      {group?.icon || '⚽'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{athlete.displayName}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">
                        {GREEK_MONTHS_FULL[unpayConfirm.month]} {selectedYear}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-lg font-black text-emerald-600">&euro;{payment.amount}</span>
                      {payment.paymentMethod && (
                        <p className="text-[10px] text-zinc-400">{PAYMENT_METHOD_LABELS[payment.paymentMethod]}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col">
                    <AlertDialogAction
                      onClick={handleConfirmUnpay}
                      className="h-12 w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] m-0"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Αναίρεση Πληρωμής
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

      {/* Notify Parent Confirmation Dialog */}
      <AlertDialog open={notifyConfirm !== null} onOpenChange={(open) => !open && setNotifyConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {notifyConfirm && (() => {
            const contact = getNotificationEmail(notifyConfirm.athlete);
            const payment = getPayment(notifyConfirm.athlete.id, notifyConfirm.month);
            const group = groups.find((g) => g.id === notifyConfirm.athlete.groupId);
            const amount = getExpectedAmount(notifyConfirm.athlete);
            return (
              <>
                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-600/20">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      Αποστολή Υπενθύμισης
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-amber-100 text-sm mt-1">
                      {contact?.isParent ? 'Email πληρωμής στον γονέα' : 'Email πληρωμής στον αθλητή'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-8 py-6 space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-lg shadow-sm">
                      {group?.icon || '⚽'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{notifyConfirm.athlete.displayName}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">{GREEK_MONTHS_FULL[notifyConfirm.month]} {selectedYear}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-lg font-black text-red-500">&euro;{amount}</span>
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
                  {payment?.lastNotifiedAt && (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <p className="text-[11px] text-amber-700 font-medium">
                        Τελευταία ειδοποίηση: {new Date(payment.lastNotifiedAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col">
                    <AlertDialogAction
                      onClick={() => {
                        handleNotifyParent(notifyConfirm.athlete, notifyConfirm.month);
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
