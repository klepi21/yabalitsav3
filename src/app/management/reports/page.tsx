'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  UsersIcon,
  ClockIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService, paymentService, venueService } from '@/lib/firebase-services';
import { Booking, Pitch, Payment } from '@/types';
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
      router.push('/venue-login');
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
  }, [user, venueOwner, authLoading, router]);

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
      const convertedBookings = (data.bookings || []).map((booking: any) => ({
        ...booking,
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
        createdAt: new Date(booking.createdAt),
        updatedAt: new Date(booking.updatedAt),
      }));

      const convertedPitches = (data.pitches || []).map((pitch: any) => ({
        ...pitch,
        createdAt: new Date(pitch.createdAt),
        updatedAt: new Date(pitch.updatedAt),
      }));

      const convertedPayments = (data.payments || []).map((payment: any) => ({
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
    const now = new Date();
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
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 2,
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
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
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
        borderWidth: 2,
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(251, 146, 60)',
        ],
      },
    ],
  };

  if (authLoading || (!isPinVerified && !!venueOwner) || (isPinVerified && isLoading)) {
    return (
      <div className="relative min-h-[16rem]">
        {!isPinVerified ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="text-center mb-4">
                <div className="text-2xl font-semibold text-black">Εισαγωγή PIN</div>
                <div className="text-sm text-black mt-1">Παρακαλώ εισάγετε τον 4ψήφιο PIN διαχείρισης</div>
              </div>
              <div className="flex justify-center mb-4">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\\d{4}"
                  maxLength={4}
                  className="text-center tracking-widest text-2xl w-40 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-football-green"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  autoFocus
                />
              </div>
              {pinError && <div className="text-center text-sm text-red-600 mb-3">{pinError}</div>}
              <div className="flex gap-3">
                <button onClick={handleVerifyPin} className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700">Συνέχεια</button>
                <Link href="/management/dashboard" className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">Άκυρο</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Σφάλμα κατά τη φόρτωση αναφορών
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <p className="mt-2 text-xs">
                  Αν το πρόβλημα συνεχίζεται, δοκιμάστε να ανανεώσετε τη σελίδα ή να συνδεθείτε ξανά.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadData();
              }}
              className="ml-4 inline-flex text-red-400 hover:text-red-500"
            >
              <span className="text-sm font-medium">Δοκιμάστε ξανά</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/management/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">📈 Αναφορές & Αναλυτικά</h1>
        <p className="mt-2 text-gray-600">Περιεκτικές αναφορές για τις κρατήσεις και τα έσοδα σας</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Περίοδος</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'year')}
              className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-football-green focus:border-football-green"
            >
              <option value="week">Τελευταία Εβδομάδα</option>
              <option value="month">Τελευταίος Μήνας</option>
              <option value="year">Τελευταίος Χρόνος</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Γήπεδο</label>
            <select
              value={selectedPitch}
              onChange={(e) => setSelectedPitch(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-football-green focus:border-football-green"
            >
              <option value="all">Όλα τα Γήπεδα</option>
              {pitches.map(pitch => (
                <option key={pitch.id} value={pitch.id}>{pitch.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyEuroIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Συνολικά Έσοδα</p>
              <p className="text-2xl font-bold text-gray-900">€{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Συνολικές Κρατήσεις</p>
              <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Μέση Τιμή Κράτησης</p>
              <p className="text-2xl font-bold text-gray-900">€{averageBookingValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Εκκρεμεί</p>
              <p className="text-2xl font-bold text-gray-900">{pendingBookings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Τάση Εσόδων</h3>
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
                      return '€' + value;
                    }
                  }
                }
              }
            }}
          />
        </div>

        {/* Bookings Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Τάση Κρατήσεων</h3>
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
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚽ Απόδοση ανά Γήπεδο</h3>
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
                      return '€' + value;
                    }
                  }
                }
              }
            }}
          />
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Κατανομή Καταστάσεων</h3>
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
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Λεπτομερείς Στατιστικά</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{completedBookings}</div>
            <div className="text-sm text-gray-600">Ολοκληρωμένες Κρατήσεις</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{confirmedBookings}</div>
            <div className="text-sm text-gray-600">Επιβεβαιωμένες Κρατήσεις</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{pendingBookings}</div>
            <div className="text-sm text-gray-600">Εκκρεμεί Κρατήσεις</div>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">💳 Ιστορικό Πληρωμών</h3>
        
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">💳</div>
            <p className="text-gray-500">Δεν υπάρχουν καταγεγραμμένες πληρωμές</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {payments.filter(p => p.status === 'succeeded').length}
                </div>
                <div className="text-sm text-blue-600">Επιτυχημένες Πληρωμές</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {payments.filter(p => p.status === 'pending').length}
                </div>
                <div className="text-sm text-orange-600">Εκκρεμεί</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {payments.filter(p => p.status === 'failed').length}
                </div>
                <div className="text-sm text-red-600">Αποτυχημένες</div>
              </div>
            </div>

            {/* Payment History Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ημερομηνία
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Σχέδιο
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Διάρκεια
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ποσό
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Κατάσταση
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stripe ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                          <div className="text-gray-500 text-xs">
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
                              payment.planName === 'Enterprise' ? 'bg-green-400' :
                              'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.planName || 'Άγνωστο Σχέδιο'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.paymentType === 'one_time_plan_purchase' ? 'Μιας Χρήσης' :
                               payment.paymentType === 'subscription_payment' ? 'Συνδρομή' :
                               payment.paymentType === 'booking_payment' ? 'Κράτηση' : 'Άγνωστο'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.durationMonths ? (
                          <div>
                            <div className="font-medium">{payment.durationMonths} μήνες</div>
                            {payment.durationMonths === 1 && <div className="text-xs text-gray-500">Μηνιαία</div>}
                            {payment.durationMonths === 6 && <div className="text-xs text-green-600">7% έκπτωση</div>}
                            {payment.durationMonths === 12 && <div className="text-xs text-green-600">12% έκπτωση</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">€{payment.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{payment.currency?.toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          payment.status === 'canceled' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status === 'succeeded' ? 'Επιτυχής' :
                           payment.status === 'pending' ? 'Εκκρεμεί' :
                           payment.status === 'failed' ? 'Αποτυχημένη' :
                           payment.status === 'canceled' ? 'Ακυρωμένη' :
                           payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        <div className="truncate max-w-32" title={payment.stripePaymentIntentId}>
                          {payment.stripePaymentIntentId}
                        </div>
                        {payment.stripeCustomerId && (
                          <div className="text-xs text-gray-400 truncate max-w-32" title={payment.stripeCustomerId}>
                            {payment.stripeCustomerId}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.status === 'succeeded' ? (
                          <button
                            onClick={() => handleDownloadInvoice(payment)}
                            disabled={downloadingInvoice === payment.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {downloadingInvoice === payment.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Φόρτωση...
                              </>
                            ) : (
                              <>
                                <DocumentArrowDownIcon className="h-3 w-3 mr-1" />
                                Λήψη
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Μη διαθέσιμο</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment Details Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Σύνοψη Πληρωμών</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Συνολικές πληρωμές:</span>
                  <span className="ml-2 font-medium text-gray-600">{payments.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Επιτυχημένες:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {payments.filter(p => p.status === 'succeeded').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Εκκρεμεί:</span>
                  <span className="ml-2 font-medium text-yellow-600">
                    {payments.filter(p => p.status === 'pending').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Αποτυχημένες:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {payments.filter(p => p.status === 'failed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
