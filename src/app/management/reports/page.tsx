'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Euro,
  Users,
  Clock,
  FileDown,
  Loader2,
  TrendingUp,
  CalendarDays,
  Goal,
  PieChart,
  ClipboardList,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  Shield,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Booking, Pitch, Payment } from '@/types';
import { AcademyPayment } from '@/types/academy';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, toGreekUpperCase } from '@/lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [academyPayments, setAcademyPayments] = useState<AcademyPayment[]>([]);
  const [squads, setSquads] = useState<{ id: string; name: string; ageGroup?: string }[]>([]);
  const [academyUsers, setAcademyUsers] = useState<{ id: string; displayName: string; groupId: string; squad_ids: string[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [forgotPinStep, setForgotPinStep] = useState<'none' | 'confirm' | 'sending' | 'code' | 'verifying'>('none');
  const [resetCode, setResetCode] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [needsSetPin, setNeedsSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newPinError, setNewPinError] = useState<string | null>(null);
  const [settingPin, setSettingPin] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedPitch, setSelectedPitch] = useState<string>('all');
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [showAllMonthly, setShowAllMonthly] = useState(false);
  const [showAllSquads, setShowAllSquads] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!venueOwner.venueId) return;
    setIsPinVerified(false);
  }, [user, venueOwner, authLoading, router, pathname]);

  const hashStringSHA256 = async (value: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleForgotPin = async () => {
    if (!venueOwner?.email) return;
    setForgotPinStep('sending');
    setResetError(null);
    try {
      const res = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: venueOwner.email, firstName: venueOwner.name || '' }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setForgotPinStep('code');
    } catch {
      setResetError('Αποτυχία αποστολής κωδικού. Δοκιμάστε ξανά.');
      setForgotPinStep('none');
    }
  };

  const handleVerifyResetCode = async () => {
    if (!venueOwner?.email || !venueOwner?.venueId) return;
    setForgotPinStep('verifying');
    setResetError(null);
    try {
      const res = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: venueOwner.email, code: resetCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'expired') setResetError('Ο κωδικός έληξε. Δοκιμάστε ξανά.');
        else if (data.error === 'invalid_code') setResetError('Λάθος κωδικός.');
        else setResetError('Σφάλμα επαλήθευσης.');
        setForgotPinStep('code');
        return;
      }
      // Clear the PIN from venue → force set new one
      await venueService.update(venueOwner.venueId, { managementPinHash: '' });
      setForgotPinStep('none');
      setResetCode('');
      setNeedsSetPin(true);
    } catch {
      setResetError('Σφάλμα. Δοκιμάστε ξανά.');
      setForgotPinStep('code');
    }
  };

  const handleSetNewPin = async () => {
    if (!venueOwner?.venueId) return;
    setNewPinError(null);
    if (!/^\d{4}$/.test(newPin)) {
      setNewPinError('Ο PIN πρέπει να είναι 4ψήφιος.');
      return;
    }
    if (newPin !== confirmPin) {
      setNewPinError('Τα PIN δεν ταιριάζουν.');
      return;
    }
    setSettingPin(true);
    try {
      const hash = await hashStringSHA256(newPin);
      await venueService.update(venueOwner.venueId, { managementPinHash: hash });
      setNeedsSetPin(false);
      setIsPinVerified(true);
      loadData();
    } catch {
      setNewPinError('Σφάλμα αποθήκευσης. Δοκιμάστε ξανά.');
    } finally {
      setSettingPin(false);
    }
  };

  const handleVerifyPin = async (pinOverride?: string) => {
    if (!venueOwner?.venueId) return;
    const pin = pinOverride || pinInput;
    setPinError(null);
    if (!/^\d{4}$/.test(pin)) {
      setPinError('Ο PIN πρέπει να είναι 4ψήφιος.');
      return;
    }
    try {
      const venue = await venueService.getById(venueOwner.venueId);
      const expectedHash = venue?.managementPinHash;
      if (!expectedHash) {
        setNeedsSetPin(true);
        return;
      }
      const enteredHash = await hashStringSHA256(pin);
      if (enteredHash === expectedHash) {
        setIsPinVerified(true);
        loadData();
      } else {
        setPinError('Λάθος PIN. Προσπαθήστε ξανά.');
      }
    } catch {
      setPinError('Σφάλμα επαλήθευσης PIN.');
    }
  };

  const loadData = async () => {
    if (!venueOwner?.venueId || !user) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      if (!token) throw new Error('No auth token available');

      const response = await fetch('/api/reports/get-by-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ venueId: venueOwner.venueId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reports data');
      }

      const data = await response.json();

      setBookings((data.bookings || []).map((b: Record<string, unknown>) => ({
        ...b,
        startTime: new Date(b.startTime as string),
        endTime: new Date(b.endTime as string),
        createdAt: new Date(b.createdAt as string),
        updatedAt: new Date(b.updatedAt as string),
      })));
      setPitches((data.pitches || []).map((p: Record<string, unknown>) => ({
        ...p,
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      })));
      setPayments((data.payments || []).map((p: Record<string, unknown>) => ({
        ...p,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })));
      setAcademyPayments((data.academyPayments || []).map((p: Record<string, unknown>) => ({
        ...p,
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      })) as AcademyPayment[]);
      setSquads((data.squads || []) as { id: string; name: string; ageGroup?: string }[]);
      setAcademyUsers((data.academyUsers || []) as { id: string; displayName: string; groupId: string; squad_ids: string[] }[]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setBookings([]);
      setPitches([]);
      setPayments([]);
      setAcademyPayments([]);
      setSquads([]);
      setAcademyUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    const startDate = new Date();
    switch (selectedPeriod) {
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
    }
    return startDate;
  };

  const getAllFilteredBookings = () => {
    let filtered = [...bookings];
    if (selectedPitch !== 'all') filtered = filtered.filter(b => b.pitchId === selectedPitch);
    const startDate = getDateFilter();
    return filtered.filter(b => new Date(b.startTime) >= startDate);
  };

  const getFilteredBookings = () => {
    return getAllFilteredBookings().filter(b => b.status === 'completed');
  };

  const allFiltered = getAllFilteredBookings();
  const filteredBookings = getFilteredBookings();

  const handleDownloadInvoice = async (payment: Payment) => {
    if (!payment.stripePaymentIntentId) return;
    setDownloadingInvoice(payment.id);
    try {
      const response = await fetch('/api/stripe/download-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: payment.stripePaymentIntentId }),
      });
      const result = await response.json();
      if (result.success && result.invoice.receiptUrl) {
        window.open(result.invoice.receiptUrl, '_blank');
      } else {
        window.open(`https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`, '_blank');
      }
    } catch {
      setError('Σφάλμα κατά τη λήψη του receipt.');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // Academy payments: all paid ones filtered by period
  const paidAcademyPayments = academyPayments.filter(p => p.paid);
  const filteredAcademyPayments = paidAcademyPayments.filter(p => {
    if (!p.paidAt) return false;
    const paidDate = new Date(p.paidAt as string);
    return paidDate >= getDateFilter();
  });
  const academyRevenue = filteredAcademyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Academy monthly breakdown — group ALL payments by month
  const academyMonthlyBreakdown = (() => {
    const byMonth = new Map<string, { paid: number; unpaid: number; paidAmount: number; totalAmount: number; total: number }>();
    for (const p of academyPayments) {
      const entry = byMonth.get(p.month) || { paid: 0, unpaid: 0, paidAmount: 0, totalAmount: 0, total: 0 };
      entry.total++;
      entry.totalAmount += p.amount || 0;
      if (p.paid) {
        entry.paid++;
        entry.paidAmount += p.amount || 0;
      } else {
        entry.unpaid++;
      }
      byMonth.set(p.month, entry);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // newest first
      .map(([month, data]) => ({ month, ...data }));
  })();

  // Academy revenue by squad
  const academyBySquad = (() => {
    // Map userId -> squad names
    const userSquadMap = new Map<string, string[]>();
    for (const u of academyUsers) {
      const squadNames = (u.squad_ids || []).map(sid => {
        const s = squads.find(sq => sq.id === sid);
        return s ? `${s.name}${s.ageGroup ? ` (${s.ageGroup})` : ''}` : null;
      }).filter(Boolean) as string[];
      userSquadMap.set(u.id, squadNames.length > 0 ? squadNames : ['Χωρίς τμήμα']);
    }

    const bySquad = new Map<string, { paid: number; unpaid: number; paidAmount: number; total: number }>();
    for (const p of academyPayments) {
      const squadNames = userSquadMap.get(p.userId) || ['Χωρίς τμήμα'];
      for (const name of squadNames) {
        const entry = bySquad.get(name) || { paid: 0, unpaid: 0, paidAmount: 0, total: 0 };
        entry.total++;
        if (p.paid) {
          entry.paid++;
          entry.paidAmount += p.amount || 0;
        } else {
          entry.unpaid++;
        }
        bySquad.set(name, entry);
      }
    }
    return Array.from(bySquad.entries())
      .sort((a, b) => b[1].paidAmount - a[1].paidAmount)
      .map(([squad, data]) => ({ squad, ...data }));
  })();

  // Academy yearly summary
  const academyYearlySummary = (() => {
    const byYear = new Map<string, { paidAmount: number; totalAmount: number; paid: number; total: number }>();
    for (const p of academyPayments) {
      const year = p.month.split('-')[0];
      const entry = byYear.get(year) || { paidAmount: 0, totalAmount: 0, paid: 0, total: 0 };
      entry.total++;
      entry.totalAmount += p.amount || 0;
      if (p.paid) {
        entry.paid++;
        entry.paidAmount += p.amount || 0;
      }
      byYear.set(year, entry);
    }
    return Array.from(byYear.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, data]) => ({ year, ...data }));
  })();

  // Metrics — revenue from completed only, counts from all statuses
  const bookingRevenue = filteredBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const totalRevenue = bookingRevenue + academyRevenue;
  const averageBookingValue = filteredBookings.length > 0 ? bookingRevenue / filteredBookings.length : 0;
  const completedBookings = allFiltered.filter(b => b.status === 'completed').length;
  const pendingBookings = allFiltered.filter(b => b.status === 'pending').length;
  const confirmedBookings = allFiltered.filter(b => b.status === 'confirmed').length;

  // Chart data
  const getChartData = () => {
    const labels: string[] = [];
    const revenueData: number[] = [];
    const bookingsData: number[] = [];

    const days = selectedPeriod === 'year' ? 12 : selectedPeriod === 'month' ? 30 : 7;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (selectedPeriod === 'year') {
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('el-GR', { month: 'short' }));
      } else {
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }));
      }

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayBookings = filteredBookings.filter(b => {
        const d = new Date(b.startTime);
        return d >= dayStart && d <= dayEnd;
      });

      revenueData.push(dayBookings.reduce((sum, b) => sum + (b.price || 0), 0));
      bookingsData.push(dayBookings.length);
    }
    return { labels, revenueData, bookingsData };
  };

  const { labels, revenueData, bookingsData } = getChartData();

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#a1a1aa' } },
      y: { beginAtZero: true, grid: { color: '#f4f4f5' }, ticks: { font: { size: 11 }, color: '#a1a1aa' } },
    },
  };

  const revenueChartData = {
    labels,
    datasets: [{
      label: 'Έσοδα (€)',
      data: revenueData,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      tension: 0.4,
      fill: true,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
    }],
  };

  const bookingsChartData = {
    labels,
    datasets: [{
      label: 'Κρατήσεις',
      data: bookingsData,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      tension: 0.4,
      fill: true,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
    }],
  };

  const pitchPerformanceData = {
    labels: pitches.map(p => p.name),
    datasets: [{
      label: 'Έσοδα (€)',
      data: pitches.map(p => filteredBookings.filter(b => b.pitchId === p.id).reduce((sum, b) => sum + (b.price || 0), 0)),
      backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const statusData = {
    labels: ['Ολοκληρωμένες', 'Επιβεβαιωμένες', 'Εκκρεμεί'],
    datasets: [{
      data: [completedBookings, confirmedBookings, pendingBookings],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
      borderWidth: 0,
    }],
  };

  // PIN gate
  if (authLoading || (!isPinVerified && !!venueOwner) || (isPinVerified && isLoading)) {
    return (
      <div className="relative min-h-[50vh] flex items-center justify-center">
        {!isPinVerified ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-zinc-100">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center mb-4 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 mb-1">
                  {needsSetPin ? 'Ορισμός PIN'
                    : forgotPinStep === 'none' ? 'Αναφορές & Οικονομικά'
                    : 'Επαναφορά PIN'}
                </h2>
                <p className="text-sm text-zinc-400 font-medium">
                  {needsSetPin ? 'Ορίστε νέο 4ψήφιο PIN πρόσβασης'
                    : forgotPinStep === 'none' ? 'Εισάγετε το 4ψήφιο PIN για πρόσβαση'
                    : forgotPinStep === 'confirm' ? 'Αποστολή κωδικού επαναφοράς'
                    : 'Εισάγετε τον κωδικό από το email'}
                </p>
              </div>

              <div className="space-y-5">
                {/* SET NEW PIN */}
                {needsSetPin ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 mb-2">Νέο PIN</p>
                      <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3].map((i) => (
                          <input
                            key={`new-${i}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-14 h-14 text-center text-2xl font-black rounded-xl bg-zinc-50 border-2 border-zinc-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                            value={newPin[i] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              if (val) {
                                const updated = newPin.slice(0, i) + val + newPin.slice(i + 1);
                                setNewPin(updated.slice(0, 4));
                                const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                                if (next && i < 3) next.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !newPin[i]) {
                                const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                                if (prev && i > 0) { prev.focus(); setNewPin(newPin.slice(0, i - 1) + newPin.slice(i)); }
                              }
                            }}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 mb-2">Επιβεβαίωση PIN</p>
                      <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3].map((i) => (
                          <input
                            key={`confirm-${i}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-14 h-14 text-center text-2xl font-black rounded-xl bg-zinc-50 border-2 border-zinc-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                            value={confirmPin[i] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              if (val) {
                                const updated = confirmPin.slice(0, i) + val + confirmPin.slice(i + 1);
                                setConfirmPin(updated.slice(0, 4));
                                const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                                if (next && i < 3) next.focus();
                                if (i === 3 && newPin.length === 4) handleSetNewPin();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !confirmPin[i]) {
                                const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                                if (prev && i > 0) { prev.focus(); setConfirmPin(confirmPin.slice(0, i - 1) + confirmPin.slice(i)); }
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {newPinError && (
                      <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-semibold animate-in fade-in zoom-in-95">
                        <AlertCircle className="h-4 w-4" />
                        {newPinError}
                      </div>
                    )}
                    <Button
                      onClick={handleSetNewPin}
                      disabled={newPin.length !== 4 || confirmPin.length !== 4 || settingPin}
                      className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {settingPin ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Αποθήκευση & Είσοδος'
                      )}
                    </Button>
                    <Button variant="ghost" asChild className="h-10 font-semibold text-zinc-400 hover:text-zinc-600 rounded-xl text-sm">
                      <Link href="/management/dashboard">Επιστροφή</Link>
                    </Button>
                  </div>
                ) : null}

                {/* ENTER PIN */}
                {!needsSetPin && forgotPinStep === 'none' && (
                  <>
                    <div className="flex gap-3 justify-center">
                      {[0, 1, 2, 3].map((i) => (
                        <input
                          key={`pin-${i}`}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          className={`w-14 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all ${
                            pinError
                              ? 'bg-red-50 border-red-300 text-red-600 animate-shake'
                              : 'bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-200'
                          }`}
                          value={pinInput[i] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
                            if (!val) return;
                            const updated = (pinInput.slice(0, i) + val + pinInput.slice(i + 1)).slice(0, 4);
                            setPinInput(updated);
                            setPinError(null);
                            if (i < 3) {
                              const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                              if (next) next.focus();
                            }
                            if (updated.length === 4) {
                              // Auto-submit with the final pin value
                              setTimeout(() => handleVerifyPin(updated), 50);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (pinInput[i]) {
                                setPinInput(pinInput.slice(0, i) + pinInput.slice(i + 1));
                              } else if (i > 0) {
                                const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                                if (prev) { prev.focus(); setPinInput(pinInput.slice(0, i - 1) + pinInput.slice(i)); }
                              }
                              e.preventDefault();
                            }
                            if (e.key === 'Enter' && pinInput.length === 4) handleVerifyPin();
                          }}
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    {pinError && (
                      <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-semibold animate-in fade-in zoom-in-95">
                        <AlertCircle className="h-4 w-4" />
                        {pinError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        onClick={() => handleVerifyPin()}
                        className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black font-bold text-white text-sm shadow-lg transition-all active:scale-[0.98]"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Είσοδος
                      </Button>
                      <div className="flex items-center justify-between pt-1">
                        <Button
                          variant="ghost"
                          onClick={() => setForgotPinStep('confirm')}
                          className="h-9 font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs px-3"
                        >
                          Ξέχασα το PIN
                        </Button>
                        <Button variant="ghost" asChild className="h-9 font-semibold text-zinc-400 hover:text-zinc-600 rounded-lg text-xs px-3">
                          <Link href="/management/dashboard">Επιστροφή</Link>
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* FORGOT PIN - CONFIRM */}
                {!needsSetPin && forgotPinStep === 'confirm' && (
                  <div className="flex flex-col gap-4">
                    <div className="text-center rounded-xl bg-zinc-50 p-4">
                      <p className="text-sm text-zinc-500 font-medium mb-1">Θα σταλεί κωδικός επαναφοράς στο</p>
                      <p className="text-sm text-emerald-600 font-black">{venueOwner?.email}</p>
                    </div>
                    <Button
                      onClick={handleForgotPin}
                      className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-sm shadow-lg transition-all active:scale-[0.98]"
                    >
                      Αποστολή κωδικού
                    </Button>
                    <Button variant="ghost" onClick={() => setForgotPinStep('none')} className="h-10 font-semibold text-zinc-400 hover:text-zinc-600 rounded-xl text-sm">
                      Πίσω
                    </Button>
                  </div>
                )}

                {/* FORGOT PIN - SENDING */}
                {!needsSetPin && forgotPinStep === 'sending' && (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm text-zinc-400 font-medium">Αποστολή κωδικού...</p>
                  </div>
                )}

                {/* FORGOT PIN - VERIFY CODE */}
                {!needsSetPin && (forgotPinStep === 'code' || forgotPinStep === 'verifying') && (
                  <div className="flex flex-col gap-4">
                    <div className="text-center rounded-xl bg-zinc-50 p-4">
                      <p className="text-sm text-zinc-500 font-medium mb-1">Κωδικός επαλήθευσης στάλθηκε στο</p>
                      <p className="text-sm text-emerald-600 font-black">{venueOwner?.email}</p>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      className="text-center tracking-[0.4em] text-2xl w-full h-14 rounded-xl bg-zinc-50 border-2 border-zinc-200 px-4 font-black focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && resetCode.length === 6) handleVerifyResetCode();
                      }}
                      autoFocus
                    />
                    {resetError && (
                      <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-semibold animate-in fade-in zoom-in-95">
                        <AlertCircle className="h-4 w-4" />
                        {resetError}
                      </div>
                    )}
                    <Button
                      onClick={handleVerifyResetCode}
                      disabled={resetCode.length !== 6 || forgotPinStep === 'verifying'}
                      className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {forgotPinStep === 'verifying' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Επαλήθευση'
                      )}
                    </Button>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        onClick={handleForgotPin}
                        className="h-9 font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs px-3"
                      >
                        Επαναποστολή
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setForgotPinStep('none'); setResetCode(''); setResetError(null); }}
                        className="h-9 font-semibold text-zinc-400 hover:text-zinc-600 rounded-lg text-xs px-3"
                      >
                        Πίσω
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 pb-20 animate-pulse">
            {/* Header skeleton */}
            <div className="space-y-2">
              <div className="h-6 w-52 bg-zinc-200 rounded" />
              <div className="h-3 w-72 bg-zinc-100 rounded" />
            </div>
            {/* Metrics skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-zinc-100" />
              ))}
            </div>
            {/* Charts skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-72 rounded-xl bg-zinc-100" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user || !venueOwner) return null;

  return (
    <div className="space-y-10 pb-20">
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-red-700 font-bold text-xs">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setError(null); loadData(); }} 
              className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-bold text-[12px]"
            >
              {toGreekUpperCase('Δοκιμάστε ξανά')}
            </Button>
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
            {toGreekUpperCase('Αναφορές & Στατιστικά')}
          </h1>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">
            {toGreekUpperCase('Παρακολουθήστε την απόδοση της επιχείρησής σας.')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-1 rounded-xl border border-zinc-100 shadow-sm">
          {/* Period Filter */}
          <div className="flex items-center p-0.5 bg-zinc-50 rounded-lg">
            {[
              { value: 'week', label: '7 Ημέρες' },
              { value: 'month', label: '30 Ημέρες' },
              { value: 'year', label: 'Έτος' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value as 'week' | 'month' | 'year')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all ${
                  selectedPeriod === opt.value
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {toGreekUpperCase(opt.label)}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-zinc-100 hidden sm:block" />

          {/* Pitch Filter */}
          <div className="flex items-center p-0.5 bg-zinc-50 rounded-lg max-w-[240px] overflow-x-auto">
            <button
              onClick={() => setSelectedPitch('all')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedPitch === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {toGreekUpperCase('Όλα')}
            </button>
            {pitches.map((pitch) => (
              <button
                key={pitch.id}
                onClick={() => setSelectedPitch(pitch.id)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedPitch === pitch.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {toGreekUpperCase(pitch.name)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Συνολικά Έσοδα', value: `€${totalRevenue.toFixed(0)}`, icon: Euro, color: 'emerald', hint: 'Βασίζεται στην τιμή κράτησης (όχι στην είσπραξη). Υπολογίζεται μόνο από ολοκληρωμένες κρατήσεις + ακαδημία.' },
          { label: 'Έσοδα Κρατήσεων', value: `€${bookingRevenue.toFixed(0)}`, icon: Calendar, color: 'blue', hint: 'Άθροισμα τιμών ολοκληρωμένων κρατήσεων. Η είσπραξη είναι βοηθητικό εργαλείο και δεν επηρεάζει αυτό το ποσό.' },
          { label: 'Έσοδα Ακαδημίας', value: `€${academyRevenue.toFixed(0)}`, icon: Users, color: 'violet' },
          { label: 'Μέση Κράτηση', value: `€${averageBookingValue.toFixed(0)}`, icon: TrendingUp, color: 'cyan' },
          { label: 'Σε Αναμονή', value: pendingBookings.toString(), icon: Clock, color: 'amber' },
        ].map((metric) => {
          const Icon = metric.icon;
          const colorStyles: Record<string, string> = {
            emerald: 'bg-emerald-50 text-emerald-600',
            blue: 'bg-blue-50 text-blue-600',
            violet: 'bg-violet-50 text-violet-600',
            cyan: 'bg-cyan-50 text-cyan-600',
            amber: 'bg-amber-50 text-amber-600',
          };
          return (
            <div key={metric.label} className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm group hover:shadow-md transition-all relative">
              <div className={`h-8 w-8 rounded-lg ${colorStyles[metric.color]} flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-black text-zinc-900 mb-0.5">{metric.value}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase(metric.label)}</p>
              {'hint' in metric && metric.hint && (
                <div className="absolute top-2.5 right-2.5 group/hint">
                  <Info className="h-3.5 w-3.5 text-zinc-300 hover:text-zinc-500 cursor-help transition-colors" />
                  <div className="invisible group-hover/hint:visible absolute right-0 top-5 z-50 w-56 rounded-lg bg-zinc-900 text-white text-[11px] leading-relaxed p-3 shadow-lg">
                    {metric.hint}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Τάση Εσόδων')}</h3>
          </div>
          <div className="h-[220px] w-full">
            <Line data={revenueChartData} options={{
              ...chartOptions,
              maintainAspectRatio: false,
              scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, padding: 8, font: { weight: 'bold' as const }, callback: (v) => `€${v}` } },
                x: { ...chartOptions.scales.x, ticks: { ...chartOptions.scales.x.ticks, padding: 8, font: { weight: 'bold' as const } } },
              },
            }} />
          </div>
        </div>

        {/* Bookings Trend */}
        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Τάση Κρατήσεων')}</h3>
          </div>
          <div className="h-[220px] w-full">
            <Line data={bookingsChartData} options={{
              ...chartOptions,
              maintainAspectRatio: false,
              scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, padding: 8, font: { weight: 'bold' as const }, stepSize: 1 } },
                x: { ...chartOptions.scales.x, ticks: { ...chartOptions.scales.x.ticks, padding: 8, font: { weight: 'bold' as const } } },
              },
            }} />
          </div>
        </div>

        {/* Pitch Performance */}
        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <Goal className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ανά Γήπεδο')}</h3>
          </div>
          <div className="h-[220px] w-full">
            <Bar data={pitchPerformanceData} options={{
              ...chartOptions,
              maintainAspectRatio: false,
              scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, padding: 8, font: { weight: 'bold' as const }, callback: (v) => `€${v}` } },
                x: { ...chartOptions.scales.x, ticks: { ...chartOptions.scales.x.ticks, padding: 8, font: { weight: 'bold' as const } } },
              },
            }} />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <PieChart className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Κατανομή')}</h3>
          </div>
          <div className="flex items-center justify-center h-[220px]">
            <Doughnut data={statusData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { 
                legend: { 
                  position: 'bottom', 
                  labels: { 
                    font: { size: 10, weight: 'bold' as const }, 
                    color: '#000', 
                    padding: 15, 
                    usePointStyle: true, 
                    pointStyleWidth: 8 
                  } 
                }, 
                title: { display: false } 
              },
              cutout: '70%',
            }} />
          </div>
        </div>
      </div>

      {/* Detailed Analysis Cards */}
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-50 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ανάλυση Κρατήσεων')}</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Ολοκληρωμένες', value: completedBookings, color: 'emerald' },
            { label: 'Επιβεβαιωμένες', value: confirmedBookings, color: 'blue' },
            { label: 'Εκκρεμείς', value: pendingBookings, color: 'amber' },
          ].map((stat) => {
            const colorMap: Record<string, string> = { emerald: 'text-emerald-600 bg-emerald-50', blue: 'text-blue-600 bg-blue-50', amber: 'text-amber-600 bg-amber-50' };
            return (
              <div key={stat.label} className={cn("rounded-xl p-4 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.01]", colorMap[stat.color])}>
                <p className="text-xl font-black mb-0.5">{stat.value}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">{toGreekUpperCase(stat.label)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Academy Revenue Breakdown */}
      {academyPayments.length > 0 && (
        <div className="space-y-6">
          {/* Academy Header */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ανάλυση Ακαδημίας')}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-50 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ανά Μήνα')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Μήνας')}</th>
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Πληρωμένοι')}</th>
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Ανεξόφλητοι')}</th>
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-right">{toGreekUpperCase('Έσοδα')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {(showAllMonthly ? academyMonthlyBreakdown : academyMonthlyBreakdown.slice(0, 6)).map((row) => {
                      const [y, m] = row.month.split('-').map(Number);
                      const label = new Date(y, m - 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
                      return (
                        <tr key={row.month} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="py-2.5 px-4 text-[11px] font-bold text-zinc-900 capitalize">{label}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold bg-emerald-50 text-emerald-700">
                              {row.paid}/{row.total}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {row.unpaid > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold bg-red-50 text-red-600">
                                {row.unpaid}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold bg-emerald-50 text-emerald-600">✓</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="text-xs font-black text-zinc-900 tabular-nums">€{row.paidAmount.toFixed(0)}</span>
                            {row.totalAmount > row.paidAmount && (
                              <span className="text-[11px] text-zinc-400 ml-1">/ €{row.totalAmount.toFixed(0)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {academyMonthlyBreakdown.length > 6 && (
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="py-2">
                          <button
                            onClick={() => setShowAllMonthly(!showAllMonthly)}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-700 transition-colors py-1"
                          >
                            {showAllMonthly ? 'Απόκρυψη' : `Εμφάνιση όλων (${academyMonthlyBreakdown.length})`}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllMonthly ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Squad Breakdown Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-50 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ανά Τμήμα')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τμήμα')}</th>
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Πληρωμένοι')}</th>
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Ανεξόφλητοι')}</th>
                      <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-right">{toGreekUpperCase('Έσοδα')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {(showAllSquads ? academyBySquad : academyBySquad.slice(0, 6)).map((row) => (
                      <tr key={row.squad} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-2.5 px-4 text-[11px] font-bold text-zinc-900">{row.squad}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold bg-emerald-50 text-emerald-700">
                            {row.paid}/{row.total}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {row.unpaid > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold bg-red-50 text-red-600">
                              {row.unpaid}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold bg-emerald-50 text-emerald-600">✓</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="text-xs font-black text-zinc-900 tabular-nums">€{row.paidAmount.toFixed(0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {academyBySquad.length > 6 && (
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="py-2">
                          <button
                            onClick={() => setShowAllSquads(!showAllSquads)}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors py-1"
                          >
                            {showAllSquads ? 'Απόκρυψη' : `Εμφάνιση όλων (${academyBySquad.length})`}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllSquads ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Yearly Summary */}
          {academyYearlySummary.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-50 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ετήσια Σύνοψη Ακαδημίας')}</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {academyYearlySummary.map((row) => (
                  <div key={row.year} className="rounded-xl border border-zinc-100 p-4 space-y-3">
                    <p className="text-2xl font-black text-zinc-900">{row.year}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Έσοδα')}</span>
                        <span className="text-sm font-black text-emerald-600">€{row.paidAmount.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Αναμενόμενα')}</span>
                        <span className="text-sm font-black text-zinc-500">€{row.totalAmount.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${row.totalAmount > 0 ? (row.paidAmount / row.totalAmount) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-bold text-zinc-400 text-right">
                        {row.paid}/{row.total} {toGreekUpperCase('πληρωμές')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Ιστορικό Πληρωμών')}</h3>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-xl bg-zinc-50 flex items-center justify-center mb-6 shadow-sm">
              <CreditCard className="h-8 w-8 text-zinc-200" />
            </div>
            <h4 className="text-xl font-black text-zinc-900 mb-1">{toGreekUpperCase('Δεν βρέθηκαν πληρωμές')}</h4>
            <p className="text-[11px] text-zinc-500 font-medium">{toGreekUpperCase('Δεν έχουν καταγραφεί συναλλαγές.')}</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Payment Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Επιτυχείς', count: payments.filter(p => p.status === 'succeeded').length, icon: CheckCircle, color: 'emerald' },
                { label: 'Σε Αναμονή', count: payments.filter(p => p.status === 'pending').length, icon: Clock, color: 'amber' },
                { label: 'Αποτυχίες', count: payments.filter(p => p.status === 'failed').length, icon: XCircle, color: 'red' },
              ].map((stat) => {
                const Icon = stat.icon;
                const colorStyles: Record<string, string> = {
                  emerald: 'bg-emerald-50 text-emerald-600',
                  amber: 'bg-amber-50 text-amber-600',
                  red: 'bg-red-50 text-red-600',
                };
                return (
                  <div key={stat.label} className={cn("p-3 rounded-lg flex items-center justify-between", colorStyles[stat.color])}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="font-bold text-[11px] uppercase tracking-widest">{toGreekUpperCase(stat.label)}</span>
                    </div>
                    <span className="text-lg font-black">{stat.count}</span>
                  </div>
                );
              })}
            </div>

            {/* Payment Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Ημερομηνία')}</th>
                    <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Περιγραφή')}</th>
                    <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Διάρκεια')}</th>
                    <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Ποσό')}</th>
                    <th className="py-2.5 px-4 text-[8px] font-bold uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Κατάσταση')}</th>
                    <th className="py-2.5 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {payments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((payment) => (
                    <tr key={payment.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="text-[11px] font-bold text-zinc-900">
                          {(payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.createdAt)).toLocaleDateString('el-GR', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-zinc-900">{payment.planName || toGreekUpperCase('Πακέτο')}</span>
                          <span className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">
                            {payment.paymentType === 'one_time_plan_purchase' ? toGreekUpperCase('Μιας Χρήσης') :
                             payment.paymentType === 'subscription_payment' ? toGreekUpperCase('Συνδρομή') :
                             payment.paymentType === 'booking_payment' ? toGreekUpperCase('Κράτηση') : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[11px] font-bold text-zinc-500 whitespace-nowrap">
                          {payment.durationMonths ? `${payment.durationMonths} μήνες` : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs font-black text-zinc-900 group-hover:text-emerald-600 transition-colors tabular-nums">
                          €{payment.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge className={cn(
                          "rounded-md px-2 py-0.5 font-bold text-[7px] uppercase tracking-widest border-none",
                          payment.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' :
                          payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-zinc-100 text-zinc-600'
                        )}>
                          {payment.status === 'succeeded' ? toGreekUpperCase('Επιτυχής') :
                           payment.status === 'pending' ? toGreekUpperCase('Εκκρεμεί') :
                           payment.status === 'failed' ? toGreekUpperCase('Αποτυχημένη') :
                           payment.status === 'canceled' ? toGreekUpperCase('Ακυρωμένη') :
                           toGreekUpperCase(payment.status)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {payment.status === 'succeeded' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-md border border-zinc-100 bg-white shadow-sm font-bold text-[11px] hover:bg-zinc-50 transition-all px-2.5"
                            onClick={() => handleDownloadInvoice(payment)}
                            disabled={downloadingInvoice === payment.id}
                          >
                            {downloadingInvoice === payment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <FileDown className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Receipt</span>
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
