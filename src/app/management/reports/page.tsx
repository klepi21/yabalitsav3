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
      <div className="relative min-h-[50vh] flex items-center justify-center">
        {!isPinVerified ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-[280px] rounded-2xl border-none bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 shadow-sm">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-zinc-900 mb-0.5 uppercase">
                  {toGreekUpperCase('Περιοχή Διαχειριστή')}
                </h2>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                  {toGreekUpperCase('Εισαγετε τον 4ψηφιο PIN')}
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    className="text-center tracking-widest text-2xl w-full h-11 rounded-xl bg-zinc-50 border-none px-4 font-black focus:bg-white transition-all"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyPin();
                    }}
                    autoFocus
                  />
                </div>
                
                {pinError && (
                  <div className="flex items-center justify-center gap-2 text-red-500 font-bold animate-in fade-in zoom-in-95">
                    <AlertCircle className="h-4 w-4" />
                    {pinError}
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleVerifyPin} 
                    className="h-11 w-full rounded-xl bg-zinc-900 hover:bg-black font-bold text-white text-[13px] shadow-lg transition-all active:scale-95"
                  >
                    {toGreekUpperCase('Είσοδος')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    asChild 
                    className="h-10 font-bold text-zinc-400 hover:text-zinc-600 rounded-xl text-[11px]"
                  >
                    <Link href="/management/dashboard">{toGreekUpperCase('Επιστροφή')}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
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
              className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-bold text-[10px]"
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
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
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
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedPitch === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {toGreekUpperCase('Όλα')}
            </button>
            {pitches.map((pitch) => (
              <button
                key={pitch.id}
                onClick={() => setSelectedPitch(pitch.id)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Συνολικά Έσοδα', value: `€${totalRevenue.toFixed(0)}`, icon: Euro, color: 'emerald' },
          { label: 'Κρατήσεις', value: totalBookings.toString(), icon: Calendar, color: 'blue' },
          { label: 'Μέση Κράτηση', value: `€${averageBookingValue.toFixed(0)}`, icon: Users, color: 'violet' },
          { label: 'Σε Αναμονή', value: pendingBookings.toString(), icon: Clock, color: 'amber' },
        ].map((metric) => {
          const Icon = metric.icon;
          const colorStyles: Record<string, string> = {
            emerald: 'bg-emerald-50 text-emerald-600',
            blue: 'bg-blue-50 text-blue-600',
            violet: 'bg-violet-50 text-violet-600',
            amber: 'bg-amber-50 text-amber-600',
          };
          return (
            <div key={metric.label} className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm group hover:shadow-md transition-all">
              <div className={`h-8 w-8 rounded-lg ${colorStyles[metric.color]} flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-black text-zinc-900 mb-0.5">{metric.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{toGreekUpperCase(metric.label)}</p>
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
                      <span className="font-bold text-[9px] uppercase tracking-widest">{toGreekUpperCase(stat.label)}</span>
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
                            className="h-7 rounded-md border border-zinc-100 bg-white shadow-sm font-bold text-[9px] hover:bg-zinc-50 transition-all px-2.5"
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
