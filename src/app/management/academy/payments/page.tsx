'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { academyPaymentService, userGroupService, academyUserService } from '@/lib/academy-services';
import { AcademyPayment, AcademyUser, UserGroup } from '@/types/academy';
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [defaultAmount, setDefaultAmount] = useState(50);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [initMonth, setInitMonth] = useState<number | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null);
  const [focusedMonth, setFocusedMonth] = useState<number | null>(new Date().getMonth());
  const [notifyConfirm, setNotifyConfirm] = useState<{ athlete: AcademyUser; month: number } | null>(null);

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
      const [paymentsData, usersData, groupsData] = await Promise.all([
        academyPaymentService.getByVenue(venueId),
        academyUserService.getByVenue(venueId),
        userGroupService.getByVenue(venueId),
      ]);
      setAllPayments(paymentsData);
      setAllUsers(usersData);
      setGroups(groupsData);

      // Filter athletes = users whose group has monthly_payment capability
      const paymentGroupIds = new Set(
        groupsData.filter((g) => g.capabilities.includes('monthly_payment')).map((g) => g.id)
      );
      setAthletes(usersData.filter((u) => paymentGroupIds.has(u.groupId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get payment for a specific athlete and month
  const getPayment = (userId: string, month: number) => {
    const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
    return allPayments.find((p) => p.userId === userId && p.month === monthStr);
  };

  // Toggle payment status
  const handleTogglePayment = async (userId: string, month: number) => {
    const payment = getPayment(userId, month);
    if (!payment) return;
    const key = `${payment.id}`;
    setTogglingPayment(key);
    try {
      await academyPaymentService.togglePaid(payment.id, !payment.paid);
      setAllPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, paid: !p.paid, paidAt: !p.paid ? new Date().toISOString() : undefined }
            : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης');
    } finally {
      setTogglingPayment(null);
    }
  };

  // Init a month for all athletes
  const handleInitMonth = async () => {
    if (initMonth === null) return;
    const monthStr = `${selectedYear}-${String(initMonth + 1).padStart(2, '0')}`;
    try {
      await academyPaymentService.initMonth(
        venueId,
        athletes.map((a) => ({ id: a.id, displayName: a.displayName })),
        monthStr,
        defaultAmount
      );
      setInitDialogOpen(false);
      setInitMonth(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας');
    }
  };

  // Find parent for an athlete
  const findParent = (athleteId: string) => {
    return allUsers.find(
      (u) => u.linked_athletes?.includes(athleteId)
    );
  };

  // Get notification email for an athlete (parent email or contact_email fallback)
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
    const parentEmail = contact.email;

    const payment = getPayment(athlete.id, month);
    const key = `${athlete.id}-${month}`;
    setNotifying(key);

    try {
      const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
      const res = await fetch('/api/academy/notify-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail,
          parentName: contact.name,
          athleteName: athlete.displayName,
          month: monthStr,
          amount: payment?.amount || defaultAmount,
          venueName,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      // Save lastNotifiedAt to the payment record
      const now = new Date().toISOString();
      if (payment) {
        await academyPaymentService.update(payment.id, { lastNotifiedAt: now });
        setAllPayments((prev) =>
          prev.map((p) => p.id === payment.id ? { ...p, lastNotifiedAt: now } : p)
        );
      }

      setNotifySuccess(key);
      setTimeout(() => setNotifySuccess(null), 3000);
    } catch {
      setError('Αποτυχία αποστολής ειδοποίησης');
    } finally {
      setNotifying(null);
    }
  };

  // Stats for a month
  const getMonthStats = (month: number) => {
    const monthStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
    const monthPayments = allPayments.filter((p) => p.month === monthStr);
    const paid = monthPayments.filter((p) => p.paid).length;
    const unpaid = monthPayments.filter((p) => !p.paid).length;
    const total = monthPayments.reduce((sum, p) => (p.paid ? sum + p.amount : sum), 0);
    return { paid, unpaid, total, hasRecords: monthPayments.length > 0 };
  };

  // Filter athletes by search
  const filteredAthletes = athletes.filter((a) =>
    a.displayName.toLowerCase().includes(search.toLowerCase())
  );

  // Current month index (0-11)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-black text-zinc-900 min-w-[80px] text-center">{selectedYear}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setSelectedYear((y) => y + 1)}
            disabled={selectedYear >= currentYear}
          >
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
              onClick={() => {
                setFocusedMonth(i);
                if (!stats.hasRecords) {
                  setInitMonth(i);
                  setInitDialogOpen(true);
                }
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{GREEK_MONTHS[i]}</p>
              {stats.hasRecords ? (
                <>
                  <p className="text-sm font-black text-emerald-600 mt-1">{stats.paid}</p>
                  <p className="text-[8px] font-bold text-zinc-300">/{stats.paid + stats.unpaid}</p>
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
        /* Payment Grid */
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
                {filteredAthletes.map((athlete) => {
                  const parent = findParent(athlete.id);
                  const group = groups.find((g) => g.id === athlete.groupId);
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
                        const isToggling = togglingPayment === payment?.id;

                        if (!payment) {
                          return (
                            <td key={month} className={`text-center p-1.5 ${focusedMonth === month ? 'bg-emerald-50/50' : isCurrentMonth ? 'bg-emerald-50/30' : ''}`}>
                              <span className="text-zinc-200">—</span>
                            </td>
                          );
                        }

                        return (
                          <td key={month} className={`text-center p-1.5 ${focusedMonth === month ? 'bg-emerald-50/50' : isCurrentMonth ? 'bg-emerald-50/30' : ''}`}>
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => handleTogglePayment(athlete.id, month)}
                                disabled={isToggling}
                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                                  payment.paid
                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                                title={payment.paid ? `Εξοφλημένο - €${payment.amount}` : `Ανεξόφλητο - €${payment.amount}`}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : payment.paid ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <X className="h-3.5 w-3.5" />
                                )}
                              </button>
                              {!payment.paid && getNotificationEmail(athlete) && (
                                <button
                                  onClick={() => setNotifyConfirm({ athlete, month })}
                                  disabled={notifying === key}
                                  className={`text-[8px] transition-colors ${
                                    payment.lastNotifiedAt
                                      ? 'text-amber-400 hover:text-amber-600'
                                      : 'text-zinc-300 hover:text-amber-500'
                                  }`}
                                  title={payment.lastNotifiedAt
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
                  <p className="text-2xl font-black text-red-500">&euro;{totalUnpaid.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                    {toGreekUpperCase('Σύνολο')} {selectedYear}
                  </p>
                  <p className="text-2xl font-black text-zinc-900">&euro;{(totalPaid + totalUnpaid).toLocaleString()}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Init Month Dialog */}
      <AlertDialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-8 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-zinc-900">
              Ετοιμασία Μήνα {initMonth !== null ? GREEK_MONTHS_FULL[initMonth] : ''} {selectedYear}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 mt-2">
              Θα δημιουργηθούν εγγραφές πληρωμής για {athletes.length} αθλητές.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Ποσό Συνδρομής (€)</label>
              <Input
                type="number"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(Number(e.target.value))}
                className="h-11"
                min={0}
              />
            </div>
            <div className="bg-zinc-50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Αθλητές</span>
                <span className="font-bold">{athletes.length}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-zinc-500">Σύνολο</span>
                <span className="font-bold text-emerald-600">&euro;{(athletes.length * defaultAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 rounded-xl font-bold">Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={handleInitMonth} className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Δημιουργία
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notify Parent Confirmation Dialog */}
      <AlertDialog open={notifyConfirm !== null} onOpenChange={(open) => !open && setNotifyConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {notifyConfirm && (() => {
            const contact = getNotificationEmail(notifyConfirm.athlete);
            const payment = getPayment(notifyConfirm.athlete.id, notifyConfirm.month);
            const group = groups.find((g) => g.id === notifyConfirm.athlete.groupId);
            return (
              <>
                {/* Header gradient */}
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

                {/* Content */}
                <div className="px-8 py-6 space-y-5">
                  {/* Athlete info */}
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-lg shadow-sm">
                      {group?.icon || '⚽'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{notifyConfirm.athlete.displayName}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">{GREEK_MONTHS_FULL[notifyConfirm.month]} {selectedYear}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-lg font-black text-red-500">&euro;{payment?.amount || defaultAmount}</span>
                    </div>
                  </div>

                  {/* Recipient info */}
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">{toGreekUpperCase('Παραλήπτης')}</p>
                    <div className="space-y-1.5">
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

                  {/* Last notified info */}
                  {payment?.lastNotifiedAt && (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <p className="text-[11px] text-amber-700 font-medium">
                        Τελευταία ειδοποίηση: {new Date(payment.lastNotifiedAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
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
