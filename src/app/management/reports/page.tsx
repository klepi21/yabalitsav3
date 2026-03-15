'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Booking, Pitch, Payment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    // If there's no PIN set, allow directly; else require PIN
    if (!venueOwner.venueId) return;
    (async () => {
      // Fetch venue data to check managementPinHash
      try {
        // lightweight: payments/pitches/bookings already fetched by venueId below
        // Defer data load until PIN is verified
        setIsPinVerified(false);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user, venueOwner, authLoading, router, pathname]);

  // Utility to hash string SHA-256
  const hashStringSHA256 = async (value: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleVerifyPin = async () => {
    if (!venueOwner?.venueId) return;
    setPinError(null);
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('Ο PIN πρέπει να είναι 4ψήφιος.');
      return;
    }
    try {
      // Read venue to access stored hash
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
    } catch (e) {
      console.error(e);
      setPinError('Σφάλμα επαλήθευσης PIN.');
    }
  };

  const loadData = async () => {
    if (!venueOwner?.venueId || !user) return;

    setIsLoading(true);
    setError(null);
    try {
      // Get auth token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Use server-side API to fetch data with proper auth
      const response = await fetch('/api/reports/get-by-venue', {
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
        throw new Error(errorData.error || 'Failed to fetch reports data');
      }

      const data = await response.json();

      // Convert ISO strings back to Date objects
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

      const convertedPayments = (data.payments || []).map((payment: Record<string, unknown>) => ({
        ...payment,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }));

      setBookings(convertedBookings);
      setPitches(convertedPitches);
      setPayments(convertedPayments);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load reports';
      setError(errorMessage);
      setBookings([]);
      setPitches([]);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter bookings based on selected period and pitch
  const getFilteredBookings = () => {
    let filtered = bookings.filter(booking =>
      booking.status === 'completed'  // Μετράμε μόνο τις ολοκληρωμένες
    );

    if (selectedPitch !== 'all') {
      filtered = filtered.filter(booking => booking.pitchId === selectedPitch);
    }

    const now = new Date();
    const startDate = new Date();

    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return filtered.filter(booking =>
      new Date(booking.startTime) >= startDate
    );
  };

  const filteredBookings = getFilteredBookings();

  // Download invoice function
  const handleDownloadInvoice = async (payment: Payment) => {
    if (!payment.stripePaymentIntentId) {
      alert('Δεν υπάρχει διαθέσιμο receipt για αυτή την πληρωμή');
      return;
    }

    setDownloadingInvoice(payment.id);

    try {
      // First try to get the receipt URL from our API
      const response = await fetch('/api/stripe/download-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: payment.stripePaymentIntentId
        }),
      });

      const result = await response.json();

      if (result.success && result.invoice.receiptUrl) {
        // Open the Stripe receipt URL in a new tab
        window.open(result.invoice.receiptUrl, '_blank');
      } else {
        // Fallback: redirect to Stripe dashboard
        const stripeUrl = `https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`;
        window.open(stripeUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Σφάλμα κατά τη λήψη του receipt. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // Calculate key metrics
  const totalRevenue = filteredBookings.reduce((sum, booking) => sum + (booking.price || 0), 0);
  const totalBookings = filteredBookings.length;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const completedBookings = filteredBookings.filter(b => b.status === 'completed').length;
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed').length;

  // Prepare chart data
  const getChartData = () => {
    const labels = [];
    const revenueData = [];
    const bookingsData = [];

    let days = 7;
    if (selectedPeriod === 'month') days = 30;
    if (selectedPeriod === 'year') days = 12;

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

      const dayBookings = filteredBookings.filter(booking => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      });

      const dayRevenue = dayBookings.reduce((sum, booking) => sum + (booking.price || 0), 0);
      revenueData.push(dayRevenue);
      bookingsData.push(dayBookings.length);
    }

    return { labels, revenueData, bookingsData };
  };

  const { labels, revenueData, bookingsData } = getChartData();

  // Revenue trend chart
  const revenueChartData = {
    labels,
    datasets: [
      {
        label: 'Έσοδα (€)',
        data: revenueData,
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Bookings trend chart
  const bookingsChartData = {
    labels,
    datasets: [
      {
        label: 'Κρατήσεις',
        data: bookingsData,
        borderColor: 'hsl(var(--chart-1, 220 70% 50%))',
        backgroundColor: 'hsl(var(--chart-1, 220 70% 50%) / 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Pitch performance chart
  const pitchPerformanceData = {
    labels: pitches.map(pitch => pitch.name),
    datasets: [
      {
        label: 'Έσοδα ανά Γήπεδο (€)',
        data: pitches.map(pitch => {
          const pitchBookings = filteredBookings.filter(b => b.pitchId === pitch.id);
          return pitchBookings.reduce((sum, booking) => sum + (booking.price || 0), 0);
        }),
        backgroundColor: [
          'hsl(var(--primary) / 0.8)',
          'hsl(var(--chart-1, 220 70% 50%) / 0.8)',
          'hsl(var(--chart-2, 280 65% 60%) / 0.8)',
          'hsl(var(--chart-3, 30 80% 55%) / 0.8)',
          'hsl(var(--chart-4, 0 72% 51%) / 0.8)',
        ],
        borderWidth: 1,
        borderColor: [
          'hsl(var(--primary))',
          'hsl(var(--chart-1, 220 70% 50%))',
          'hsl(var(--chart-2, 280 65% 60%))',
          'hsl(var(--chart-3, 30 80% 55%))',
          'hsl(var(--chart-4, 0 72% 51%))',
        ],
      },
    ],
  };

  // Status distribution chart
  const statusData = {
    labels: ['Ολοκληρωμένες', 'Επιβεβαιωμένες', 'Εκκρεμεί'],
    datasets: [
      {
        data: [completedBookings, confirmedBookings, pendingBookings],
        backgroundColor: [
          'hsl(var(--primary) / 0.8)',
          'hsl(var(--chart-1, 220 70% 50%) / 0.8)',
          'hsl(var(--chart-3, 30 80% 55%) / 0.8)',
        ],
        borderWidth: 1,
        borderColor: [
          'hsl(var(--primary))',
          'hsl(var(--chart-1, 220 70% 50%))',
          'hsl(var(--chart-3, 30 80% 55%))',
        ],
      },
    ],
  };

  if (authLoading || (!isPinVerified && !!venueOwner) || (isPinVerified && isLoading)) {
    return (
      <div className="relative min-h-[16rem]">
        {!isPinVerified ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <Card className="w-full max-w-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Εισαγωγή PIN</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Παρακαλώ εισάγετε τον 4ψήφιο PIN διαχείρισης</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    className="text-center tracking-widest text-2xl w-40"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    autoFocus
                  />
                </div>
                {pinError && <p className="text-center text-sm text-destructive">{pinError}</p>}
                <div className="flex gap-3">
                  <Button onClick={handleVerifyPin} className="flex-1">Συνέχεια</Button>
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/management/dashboard">Άκυρο</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        )}
      </div>
    );
  }

  if (!user || !venueOwner) {
    return null; // Will redirect to login
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Σφάλμα κατά τη φόρτωση αναφορών</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <p className="mt-2 text-xs">
              Αν το πρόβλημα συνεχίζεται, δοκιμάστε να ανανεώσετε τη σελίδα ή να συνδεθείτε ξανά.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setError(null);
                loadData();
              }}
            >
              Δοκιμάστε ξανά
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/management/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Αναφορές & Αναλυτικά
        </h1>
        <p className="mt-2 text-muted-foreground">Περιεκτικές αναφορές για τις κρατήσεις και τα έσοδα σας</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Περίοδος</Label>
              <select
                id="period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'year')}
                className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="week">Τελευταία Εβδομάδα</option>
                <option value="month">Τελευταίος Μήνας</option>
                <option value="year">Τελευταίος Χρόνος</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pitch">Γήπεδο</Label>
              <select
                id="pitch"
                value={selectedPitch}
                onChange={(e) => setSelectedPitch(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="all">Όλα τα Γήπεδα</option>
                {pitches.map(pitch => (
                  <option key={pitch.id} value={pitch.id}>{pitch.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Συνολικά Έσοδα</p>
                <p className="text-2xl font-bold text-foreground">{'\u20AC'}{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Συνολικές Κρατήσεις</p>
                <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Μέση Τιμή Κράτησης</p>
                <p className="text-2xl font-bold text-foreground">{'\u20AC'}{averageBookingValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Εκκρεμεί</p>
                <p className="text-2xl font-bold text-foreground">{pendingBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Τάση Εσόδων
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '\u20AC' + value;
                      }
                    }
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Bookings Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Τάση Κρατήσεων
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={bookingsChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Goal className="h-5 w-5 text-primary" />
              Απόδοση ανά Γήπεδο
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={pitchPerformanceData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '\u20AC' + value;
                      }
                    }
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Κατανομή Καταστάσεων
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <Doughnut
                data={statusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                    title: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Λεπτομερείς Στατιστικά
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{completedBookings}</div>
              <div className="text-sm text-muted-foreground">Ολοκληρωμένες Κρατήσεις</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{confirmedBookings}</div>
              <div className="text-sm text-muted-foreground">Επιβεβαιωμένες Κρατήσεις</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{pendingBookings}</div>
              <div className="text-sm text-muted-foreground">Εκκρεμεί Κρατήσεις</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Ιστορικό Πληρωμών
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Δεν υπάρχουν καταγεγραμμένες πληρωμές</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {payments.filter(p => p.status === 'succeeded').length}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Επιτυχημένες Πληρωμές</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {payments.filter(p => p.status === 'pending').length}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">Εκκρεμεί</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {payments.filter(p => p.status === 'failed').length}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">Αποτυχημένες</div>
                </div>
              </div>

              {/* Payment History Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ημερομηνία
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Σχέδιο
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Διάρκεια
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ποσό
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Κατάσταση
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Stripe ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((payment) => (
                      <tr key={payment.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div>
                            <div className="font-medium">
                              {payment.paymentDate
                                ? new Date(payment.paymentDate).toLocaleDateString('el-GR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : new Date(payment.createdAt).toLocaleDateString('el-GR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                              }
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Δημιουργήθηκε: {new Date(payment.createdAt).toLocaleDateString('el-GR')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className={`w-3 h-3 rounded-full ${
                                payment.planName === 'Basic' ? 'bg-blue-400' :
                                payment.planName === 'Pro' ? 'bg-purple-400' :
                                payment.planName === 'Enterprise' ? 'bg-primary' :
                                'bg-muted-foreground'
                              }`}></div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-foreground">
                                {payment.planName || 'Άγνωστο Σχέδιο'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {payment.paymentType === 'one_time_plan_purchase' ? 'Μιας Χρήσης' :
                                 payment.paymentType === 'subscription_payment' ? 'Συνδρομή' :
                                 payment.paymentType === 'booking_payment' ? 'Κράτηση' : 'Άγνωστο'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {payment.durationMonths ? (
                            <div>
                              <div className="font-medium">{payment.durationMonths} μήνες</div>
                              {payment.durationMonths === 1 && <div className="text-xs text-muted-foreground">Μηνιαία</div>}
                              {payment.durationMonths === 6 && <div className="text-xs text-primary">7% έκπτωση</div>}
                              {payment.durationMonths === 12 && <div className="text-xs text-primary">12% έκπτωση</div>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div className="font-medium">{'\u20AC'}{payment.amount.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{payment.currency?.toUpperCase()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={
                            payment.status === 'succeeded' ? 'default' :
                            payment.status === 'pending' ? 'secondary' :
                            payment.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {payment.status === 'succeeded' ? 'Επιτυχής' :
                             payment.status === 'pending' ? 'Εκκρεμεί' :
                             payment.status === 'failed' ? 'Αποτυχημένη' :
                             payment.status === 'canceled' ? 'Ακυρωμένη' :
                             payment.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                          <div className="truncate max-w-32" title={payment.stripePaymentIntentId}>
                            {payment.stripePaymentIntentId}
                          </div>
                          {payment.stripeCustomerId && (
                            <div className="text-xs text-muted-foreground/70 truncate max-w-32" title={payment.stripeCustomerId}>
                              {payment.stripeCustomerId}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {payment.status === 'succeeded' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(payment)}
                              disabled={downloadingInvoice === payment.id}
                            >
                              {downloadingInvoice === payment.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Φόρτωση...
                                </>
                              ) : (
                                <>
                                  <FileDown className="h-3 w-3 mr-1" />
                                  Λήψη
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">Μη διαθέσιμο</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Details Summary */}
              <Separator className="my-4" />
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-3">Σύνοψη Πληρωμών</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Συνολικές πληρωμές:</span>
                    <span className="ml-2 font-medium text-muted-foreground">{payments.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Επιτυχημένες:</span>
                    <span className="ml-2 font-medium text-primary">
                      {payments.filter(p => p.status === 'succeeded').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Εκκρεμεί:</span>
                    <span className="ml-2 font-medium text-yellow-600">
                      {payments.filter(p => p.status === 'pending').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Αποτυχημένες:</span>
                    <span className="ml-2 font-medium text-destructive">
                      {payments.filter(p => p.status === 'failed').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
