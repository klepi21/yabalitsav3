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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Booking, Pitch, Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedPitch, setSelectedPitch] = useState<string>('all');
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

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

  const handleVerifyPin = async () => {
    if (!venueOwner?.venueId) return;
    setPinError(null);
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('Ο PIN πρέπει να είναι 4ψήφιος.');
      return;
    }
    try {
      const venue = await venueService.getById(venueOwner.venueId);
      const expectedHash = venue?.managementPinHash;
      if (!expectedHash) {
        setIsPinVerified(true);
        loadData();
        return;
      }
      const enteredHash = await hashStringSHA256(pinInput);
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
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setBookings([]);
      setPitches([]);
      setPayments([]);
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

  // Metrics — revenue from completed only, counts from all statuses
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const totalBookings = allFiltered.length;
  const averageBookingValue = filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0;
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
      <div className="relative min-h-[16rem]">
        {!isPinVerified ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-white p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Εισαγωγή PIN</h2>
                <p className="text-sm text-zinc-500 mt-1">Εισάγετε τον 4ψήφιο PIN διαχείρισης</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    className="text-center tracking-[0.5em] text-2xl w-40 h-12 bg-white"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                    autoFocus
                  />
                </div>
                {pinError && <p className="text-center text-sm text-red-500">{pinError}</p>}
                <div className="flex gap-3">
                  <Button onClick={handleVerifyPin} className="flex-1 h-11">Συνέχεια</Button>
                  <Button variant="outline" asChild className="flex-1 h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                    <Link href="/management/dashboard">Ακύρωση</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        )}
      </div>
    );
  }

  if (!user || !venueOwner) return null;

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setError(null); loadData(); }} className="text-destructive/60 hover:text-destructive shrink-0">
              Δοκιμάστε ξανά
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Αναφορές & Στατιστικά</h1>
          <p className="text-sm text-zinc-500 mt-1">Ολοκληρωμένη εικόνα εσόδων και κρατήσεων</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
          {[
            { value: 'week', label: 'Εβδομάδα' },
            { value: 'month', label: 'Μήνας' },
            { value: 'year', label: 'Χρόνος' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedPeriod(opt.value as 'week' | 'month' | 'year')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                selectedPeriod === opt.value
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {pitches.length > 1 && (
          <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
            <button
              onClick={() => setSelectedPitch('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                selectedPitch === 'all' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Όλα
            </button>
            {pitches.map((pitch) => (
              <button
                key={pitch.id}
                onClick={() => setSelectedPitch(pitch.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  selectedPitch === pitch.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {pitch.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Συνολικά Έσοδα', value: `€${totalRevenue.toFixed(2)}`, icon: Euro, color: 'emerald' },
          { label: 'Κρατήσεις', value: totalBookings.toString(), icon: Calendar, color: 'blue' },
          { label: 'Μέση Τιμή', value: `€${averageBookingValue.toFixed(2)}`, icon: Users, color: 'violet' },
          { label: 'Εκκρεμείς', value: pendingBookings.toString(), icon: Clock, color: 'amber' },
        ].map((metric) => {
          const Icon = metric.icon;
          const colorMap: Record<string, { bg: string; text: string }> = {
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
            violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
            amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
          };
          const c = colorMap[metric.color];
          return (
            <div key={metric.label} className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-5 py-4">
              <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${c.text}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-zinc-900">{metric.value}</p>
                <p className="text-[11px] text-zinc-400">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-900">Τάση Εσόδων</h3>
          </div>
          <Line data={revenueChartData} options={{
            ...chartOptions,
            scales: {
              ...chartOptions.scales,
              y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, callback: (v) => `€${v}` } },
            },
          }} />
        </div>

        {/* Bookings Trend */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-900">Τάση Κρατήσεων</h3>
          </div>
          <Line data={bookingsChartData} options={{
            ...chartOptions,
            scales: {
              ...chartOptions.scales,
              y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, stepSize: 1 } },
            },
          }} />
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pitch Performance */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Goal className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-900">Απόδοση ανά Γήπεδο</h3>
          </div>
          <Bar data={pitchPerformanceData} options={{
            ...chartOptions,
            scales: {
              ...chartOptions.scales,
              y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, callback: (v) => `€${v}` } },
            },
          }} />
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <PieChart className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-900">Κατανομή Καταστάσεων</h3>
          </div>
          <div className="flex items-center justify-center h-56">
            <Doughnut data={statusData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, color: '#71717a', padding: 16, usePointStyle: true, pointStyleWidth: 8 } }, title: { display: false } },
              cutout: '65%',
            }} />
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-zinc-600" />
          </div>
          <h3 className="text-[15px] font-semibold text-zinc-900">Ανάλυση Κρατήσεων</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Ολοκληρωμένες', value: completedBookings, color: 'emerald' },
            { label: 'Επιβεβαιωμένες', value: confirmedBookings, color: 'blue' },
            { label: 'Εκκρεμείς', value: pendingBookings, color: 'amber' },
          ].map((stat) => {
            const colorMap: Record<string, string> = { emerald: 'text-emerald-600', blue: 'text-blue-600', amber: 'text-amber-600' };
            return (
              <div key={stat.label} className="text-center rounded-xl bg-zinc-50 p-4">
                <p className={`text-3xl font-bold tracking-tight ${colorMap[stat.color]}`}>{stat.value}</p>
                <p className="text-[13px] text-zinc-500 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-xl border border-zinc-100/60 bg-white p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-[15px] font-semibold text-zinc-900">Ιστορικό Πληρωμών</h3>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-zinc-400" />
            </div>
            <h4 className="text-sm font-medium text-zinc-900 mb-1">Δεν υπάρχουν πληρωμές</h4>
            <p className="text-[13px] text-zinc-400">Δεν έχουν καταγραφεί πληρωμές ακόμα.</p>
          </div>
        ) : (
          <>
            {/* Payment Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Επιτυχημένες', count: payments.filter(p => p.status === 'succeeded').length, icon: CheckCircle, color: 'emerald' },
                { label: 'Εκκρεμείς', count: payments.filter(p => p.status === 'pending').length, icon: Clock, color: 'amber' },
                { label: 'Αποτυχημένες', count: payments.filter(p => p.status === 'failed').length, icon: XCircle, color: 'red' },
              ].map((stat) => {
                const Icon = stat.icon;
                const colorMap: Record<string, { bg: string; text: string }> = {
                  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
                  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
                  red: { bg: 'bg-red-50', text: 'text-red-600' },
                };
                const c = colorMap[stat.color];
                return (
                  <div key={stat.label} className={`rounded-xl ${c.bg} p-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${c.text}`} />
                      <span className={`text-2xl font-bold tracking-tight ${c.text}`}>{stat.count}</span>
                    </div>
                    <p className={`text-[12px] ${c.text} opacity-80`}>{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Payment Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-100">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-zinc-50">
                    {['Ημερομηνία', 'Σχέδιο', 'Διάρκεια', 'Ποσό', 'Κατάσταση', 'Receipt'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((payment) => (
                    <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-900">
                        {(payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.createdAt)).toLocaleDateString('el-GR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-zinc-900">{payment.planName || 'Άγνωστο'}</span>
                        <span className="block text-[11px] text-zinc-400">
                          {payment.paymentType === 'one_time_plan_purchase' ? 'Μιας Χρήσης' :
                           payment.paymentType === 'subscription_payment' ? 'Συνδρομή' :
                           payment.paymentType === 'booking_payment' ? 'Κράτηση' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {payment.durationMonths ? `${payment.durationMonths} μήνες` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-zinc-900">€{payment.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[11px] ${
                          payment.status === 'succeeded' ? 'border-emerald-200/60 text-emerald-700 bg-emerald-50' :
                          payment.status === 'pending' ? 'border-amber-200/60 text-amber-700 bg-amber-50' :
                          payment.status === 'failed' ? 'border-red-200/60 text-red-700 bg-red-50' :
                          'border-zinc-200/60 text-zinc-600 bg-zinc-50'
                        }`}>
                          {payment.status === 'succeeded' ? 'Επιτυχής' :
                           payment.status === 'pending' ? 'Εκκρεμεί' :
                           payment.status === 'failed' ? 'Αποτυχημένη' :
                           payment.status === 'canceled' ? 'Ακυρωμένη' :
                           payment.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === 'succeeded' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                            onClick={() => handleDownloadInvoice(payment)}
                            disabled={downloadingInvoice === payment.id}
                          >
                            {downloadingInvoice === payment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <FileDown className="h-3 w-3" />
                                Λήψη
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
