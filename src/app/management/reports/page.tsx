'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  UsersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService } from '@/lib/firebase-services';
import { Booking, Pitch } from '@/types';
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedPitch, setSelectedPitch] = useState<string>('all');

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    loadData();
  }, [user, venueOwner, authLoading, router]);

  const loadData = async () => {
    if (!venueOwner?.venueId) return;
    
    setIsLoading(true);
    try {
      const [bookingsData, pitchesData] = await Promise.all([
        bookingService.getByVenue(venueOwner.venueId),
        pitchService.getByVenue(venueOwner.venueId)
      ]);
      
      setBookings(bookingsData || []);
      setPitches(pitchesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  if (!user || !venueOwner) {
    return null; // Will redirect to login
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
}
