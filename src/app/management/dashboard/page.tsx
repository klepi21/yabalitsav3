'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService, venueService } from '@/lib/firebase-services';
import { Booking, Pitch, Venue } from '@/types';
import { PlusIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isVenueInfoExpanded, setIsVenueInfoExpanded] = useState(false);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{
    bookingId: string;
    newStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled';
    oldStatus: string;
    userName: string;
  } | null>(null);
  const [quickBookingData, setQuickBookingData] = useState({
    userName: '',
    userPhone: '',
    selectedPitchId: '',
    selectedDate: '',
    selectedSlot: '',
    notes: ''
  });

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotifications && !target.closest('.notification-bell')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
  }, [user, venueOwner, authLoading, router]);

  useEffect(() => {
    if (venueOwner?.venueId) {
      loadDashboardData();
    }
  }, [venueOwner?.venueId]);

  // Smart refresh: 5 minutes when active, pause when inactive
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isActive = true;

    const startRefresh = () => {
      interval = setInterval(() => {
        if (venueOwner?.venueId && isActive) {
          loadDashboardData();
        }
      }, 300000); // 5 minutes
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActive = false;
        if (interval) clearInterval(interval);
      } else {
        isActive = true;
        startRefresh();
      }
    };

    const handleUserActivity = () => {
      if (!isActive) {
        isActive = true;
        startRefresh();
      }
    };

    // Start refresh when component mounts
    startRefresh();

    // Pause refresh when tab is hidden
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Resume refresh on user activity
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
    };
  }, [venueOwner?.venueId]);

  // Prevent infinite loading by adding a loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !venueOwner) {
    return null; // Will redirect to login
  }

    const loadDashboardData = async () => {
    if (!venueOwner?.venueId) {
      // No venue ID found in venue owner
      return;
    }

    if (isLoading) {
      // Already loading data, skipping
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      // Loading data for venue
      
      const [bookingsData, pitchesData, venueData] = await Promise.all([
        bookingService.getByVenue(venueOwner.venueId),
        pitchService.getByVenue(venueOwner.venueId),
        venueService.getById(venueOwner.venueId)
      ]);

              // Data loaded successfully
      
      setBookings(bookingsData);
      setPitches(pitchesData);
      setVenue(venueData);
      
      // If venue data is null but we have a venueId, log an error
      if (!venueData && venueOwner.venueId) {
        // Venue data is null but venueId exists - venue document may not exist
        setLoadError('Venue data not found. Please contact support.');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoadError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthlyRevenue = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
            // Calculating monthly revenue
    
    const monthlyBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime);
      const isThisMonth = bookingDate.getMonth() === currentMonth;
      const isThisYear = bookingDate.getFullYear() === currentYear;
      const isCompleted = booking.status === 'completed';
      
      // Processing booking for revenue calculation
      
      return isThisMonth && isThisYear && isCompleted;
    });
    
    const total = monthlyBookings.reduce((total, booking) => total + booking.price, 0);
    return total || 0; // Return 0 if no bookings or NaN
  };

  const getLiveBookings = () => {
    return bookings.filter(booking => booking.status === 'confirmed').length;
  };

  const getTodaysBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bookings
      .filter(booking => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= today && bookingDate < tomorrow && booking.status !== 'completed';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const getPlayersPerPitch = (pitchType: string) => {
    switch (pitchType) {
      case '5x5': return 10; // 5v5 = 10 players
      case '6x6': return 12; // 6v6 = 12 players
      case '7x7': return 14; // 7v7 = 14 players
      case '8x8': return 16; // 8v8 = 16 players
      case '9x9': return 18; // 9v9 = 18 players
      default: return 10;
    }
  };

  const getPricePerPerson = (price: number, pitchType: string) => {
    const players = getPlayersPerPitch(pitchType);
    return (price / players).toFixed(0);
  };

  const generateAvailableSlots = (pitchId: string, date: string) => {
    const pitch = pitches.find(p => p.id === pitchId);
    if (!pitch) return [];

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const daySchedule = pitch.defaultOpeningHours[dayName];
    // Day schedule loaded
    
    if (!daySchedule || !daySchedule.isOpen) {
      // No opening hours for this day
      return [];
    }

    // Generate time slots based on opening hours and slot duration
    const slots: Array<{time: string, display: string}> = [];
    
    if ('slots' in daySchedule && daySchedule.slots && daySchedule.slots.length > 0) {
      // New structure with slots array
              daySchedule.slots.forEach((openingSlot: { start: string; end: string }) => {
          // Processing time slot
        const startTime = new Date(`2000-01-01T${openingSlot.start}`);
        const endTime = new Date(`2000-01-01T${openingSlot.end}`);
        
        let currentTime = new Date(startTime);
        
        while (currentTime < endTime) {
          const slotStart = currentTime.toTimeString().slice(0, 5);
          const slotEnd = new Date(currentTime.getTime() + pitch.slotDuration * 60000);
          const slotEndTime = slotEnd.toTimeString().slice(0, 5);
          
          // Only add slot if it doesn't exceed closing time
          if (slotEnd <= endTime) {
            slots.push({
              time: `${slotStart} - ${slotEndTime}`,
              display: slotStart
            });
          }
          
          currentTime.setMinutes(currentTime.getMinutes() + pitch.slotDuration);
        }
      });
    } else if ('open' in daySchedule && 'close' in daySchedule && daySchedule.open && daySchedule.close) {
      // Old structure with open/close times
      const startTime = new Date(`2000-01-01T${daySchedule.open}`);
      const endTime = new Date(`2000-01-01T${daySchedule.close}`);
      
      let currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + pitch.slotDuration * 60000);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);
        
        // Only add slot if it doesn't exceed closing time
        if (slotEnd <= endTime) {
          slots.push({
            time: `${slotStart} - ${slotEndTime}`,
            display: slotStart
          });
        }
        
        currentTime.setMinutes(currentTime.getMinutes() + pitch.slotDuration);
      }
    }

    // Filter out already booked slots (including pending bookings)
    const bookedSlots = bookings
      .filter(booking => 
        booking.pitchId === pitchId && 
        booking.status !== 'cancelled' && // Don't count cancelled bookings
        new Date(booking.startTime).toDateString() === selectedDateObj.toDateString()
      )
      .map(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        const slotString = `${bookingStart.toTimeString().slice(0, 5)} - ${bookingEnd.toTimeString().slice(0, 5)}`;
        // Dashboard booking information
        return slotString;
      });

            // Dashboard slot information

    const availableSlots = slots.filter(slot => !bookedSlots.includes(slot.time));
    return availableSlots;
  };

  const handleQuickBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueOwner?.venueId) return;

    setIsCreatingBooking(true);
    try {
      const pitch = pitches.find(p => p.id === quickBookingData.selectedPitchId);
      if (!pitch) throw new Error('Pitch not found');

      // Parse the selected slot to get start time
      const [slotTime] = quickBookingData.selectedSlot.split(' - ');
      const [hours, minutes] = slotTime.split(':').map(Number);
      const startTime = new Date(quickBookingData.selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time based on slot duration
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + pitch.slotDuration);

      const newBooking: Omit<Booking, 'id'> = {
        venueId: venueOwner.venueId,
        pitchId: quickBookingData.selectedPitchId,
        slotId: '', // Will be generated
        userId: '', // Will be generated
        userName: quickBookingData.userName,
        userEmail: '',
        userPhone: quickBookingData.userPhone,
        startTime: startTime,
        endTime: endTime,
        price: pitch.pricePerSlot,
        status: 'confirmed',
        notes: quickBookingData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await bookingService.create(newBooking);
      
      // Reset form
      setQuickBookingData({
        userName: '',
        userPhone: '',
        selectedPitchId: '',
        selectedDate: '',
        selectedSlot: '',
        notes: ''
      });
      setShowQuickBooking(false);
      
      // Reload data
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleStatusChange = (bookingId: string, newStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled', oldStatus: string, userName: string) => {
    setStatusChangeData({
      bookingId,
      newStatus,
      oldStatus,
      userName
    });
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = async () => {
    if (!statusChangeData) return;
    
    try {
      await bookingService.update(statusChangeData.bookingId, {
        status: statusChangeData.newStatus,
        updatedAt: new Date()
      });
      
      // Reload data to reflect changes
      await loadDashboardData();
      
      // Close confirmation dialog
      setShowStatusConfirm(false);
      setStatusChangeData(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  if (!venueOwner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Παρακαλώ συνδεθείτε</h1>
          <Link
            href="/venue-login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-football-green hover:bg-football-green-light"
          >
            Σύνδεση
          </Link>
        </div>
      </div>
    );
  }

  // Don't block rendering if venue is null - let the error state handle it

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Πίνακας Διαχείρισης Γηπέδου</h1>
            <p className="text-gray-600 mt-1">Καλώς ήρθατε στο σύστημα διαχείρισης σας</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative notification-bell">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg"
              >
                <span className="text-2xl">🔔</span>
                {/* Badge with pending count */}
                {bookings.filter(b => b.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {bookings.filter(b => b.status === 'pending').length}
                  </span>
                )}
              </button>
              
              {/* Notifications Popup */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white shadow-2xl rounded-2xl border-0 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {/* Header with better contrast */}
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 text-white relative">
                    {/* Subtle accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-football-green to-emerald-500"></div>
                    <h3 className="text-xl font-bold">🔔 Ειδοποιήσεις</h3>
                    <p className="text-gray-200 text-sm mt-1">Κρατήσεις που χρειάζονται προσοχή</p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {bookings.filter(b => b.status === 'pending').length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <span className="text-3xl">✅</span>
                        <p className="mt-3 text-gray-600 font-medium">Όλες οι κρατήσεις είναι εντάξει!</p>
                      </div>
                    ) : (
                      <>
                        {bookings
                          .filter(b => b.status === 'pending')
                          .slice(0, 4)
                          .map((booking) => {
                            const pitch = pitches.find(p => p.id === booking.pitchId);
                            return (
                              <div 
                                key={booking.id} 
                                className="p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-emerald-50 cursor-pointer transition-all duration-200 group"
                                onClick={() => {
                                  setShowNotifications(false);
                                  router.push(`/management/bookings/${booking.id}`);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 group-hover:text-football-green transition-colors">
                                      {booking.userName}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">{pitch?.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {new Date(booking.startTime).toLocaleDateString('el-GR')} - {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    Εκκρεμεί
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        
                        {/* Show more link if there are more than 4 pending */}
                        {bookings.filter(b => b.status === 'pending').length > 4 && (
                          <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <Link
                              href="/management/bookings"
                              className="block text-center text-football-green hover:text-football-green-light font-semibold py-2 px-4 rounded-lg hover:bg-football-green hover:text-white transition-all duration-200"
                            >
                              Προβολή όλων ({bookings.filter(b => b.status === 'pending').length} εκκρεμεί)
                            </Link>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowQuickBooking(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green transition-all duration-200"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Γρήγορη Κράτηση
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-2xl mb-4">🔄</div>
            <div className="text-lg font-semibold text-gray-700">Φόρτωση δεδομένων...</div>
            <div className="text-gray-500">Παρακαλώ περιμένετε</div>
          </div>
        )}

        {/* Error State */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Σφάλμα φόρτωσης</h3>
                <p className="text-red-600 mt-1">{loadError}</p>
                <button
                  onClick={loadDashboardData}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Δοκιμάστε ξανά
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="px-6 py-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg mr-4">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Σύνολο Κρατήσεων</p>
                  <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="px-6 py-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 rounded-lg mr-4">
                  <span className="text-2xl">🔴</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Live Αγώνες</p>
                  <p className="text-2xl font-bold text-gray-900">{getLiveBookings()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="px-6 py-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg mr-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Σημερινές Κρατήσεις</p>
                  <p className="text-2xl font-bold text-gray-900">{getTodaysBookings().length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="px-6 py-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 rounded-lg mr-4">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Σύνολο Πελατών</p>
                  <p className="text-2xl font-bold text-gray-900">{new Set(bookings.map(b => b.userName).filter(name => name && name.trim() !== '')).size}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Bookings - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-football-green/10 rounded-lg mr-3">
                      <span className="text-2xl">📅</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Σημερινές Κρατήσεις</h3>
                  </div>
                  <Link
                    href="/management/bookings"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green transition-all duration-200"
                  >
                    Προβολή Όλων
                  </Link>
                </div>

                {!bookings || getTodaysBookings().length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-3 block">📅</span>
                    <h3 className="text-sm font-medium text-gray-900">
                      {!bookings ? 'Φόρτωση κρατήσεων...' : 'Δεν υπάρχουν σημερινές κρατήσεις'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {!bookings ? 'Παρακαλώ περιμένετε' : 'Δεν υπάρχουν κρατήσεις για σήμερα'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getTodaysBookings()
                      .slice(0, 5)
                      .map((booking) => {
                      const pitch = pitches.find(p => p.id === booking.pitchId);
                      return (
                        <div key={booking.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-football-green">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {booking.userName || booking.userEmail || 'Άγνωστος Πελάτης'}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {booking.status === 'confirmed' ? 'Επιβεβαιωμένη' :
                                 booking.status === 'pending' ? 'Εκκρεμεί' :
                                 booking.status === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη'}
                              </span>
                              <select
                                value={booking.status}
                                onChange={(e) => handleStatusChange(
                                  booking.id,
                                  e.target.value as 'confirmed' | 'pending' | 'completed' | 'cancelled',
                                  booking.status,
                                  booking.userName || 'Άγνωστος'
                                )}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-football-green"
                              >
                                <option value="pending">Εκκρεμεί</option>
                                <option value="confirmed">Επιβεβαιωμένη</option> 
                                <option value="completed">Ολοκληρωμένη</option>
                                <option value="cancelled">Ακυρωμένη</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>
                              📅 {new Date(booking.startTime).toLocaleDateString('el-GR')} στις {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit', hour12: false})}
                            </span>
                            {pitch && (
                              <span className="flex items-center">
                                ⚽ {pitch.name} ({pitch.type})
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                €{booking.price || pitch?.pricePerSlot || 0}
                              </span>
                              {pitch && (
                                <span className="text-xs text-gray-500">
                                  (€{((booking.price || pitch.pricePerSlot || 0) / getPlayersPerPitch(pitch.type)).toFixed(0)}/άτομο)
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/management/bookings/${booking.id}`}
                              className="text-xs text-football-green hover:text-football-green-light font-medium"
                            >
                              Προβολή →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pitches Management - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-football-green/10 rounded-lg mr-3">
                      <span className="text-2xl">⚽</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Γήπεδα</h3>
                  </div>
                  <Link
                    href="/management/pitches/new"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green transition-all duration-200"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Προσθήκη
                  </Link>
                </div>

                {pitches.length === 0 ? (
                  <div className="text-center py-6">
                    <span className="text-4xl mb-3 block">⚽</span>
                    <h3 className="text-sm font-medium text-gray-900">Δεν υπάρχουν γήπεδα</h3>
                    <p className="text-xs text-gray-500 mt-1">Ξεκινήστε προσθέτοντας γήπεδο</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pitches.slice(0, 3).map((pitch) => (
                      <div key={pitch.id} className="border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all duration-200 hover:border-football-green">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{pitch.name}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-football-green/10 text-football-green border border-football-green/20">
                            {pitch.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          €{pitch.pricePerSlot} (€{getPricePerPerson(pitch.pricePerSlot, pitch.type)}/άτομο)
                        </p>
                        <div className="flex space-x-2">
                          <Link
                            href={`/pitches/${pitch.id}/edit`}
                            className="text-xs text-football-green hover:text-football-green-light font-medium"
                          >
                            Επεξεργασία
                          </Link>
                          <Link
                            href={`/pitches/${pitch.id}`}
                            className="text-xs text-football-green hover:text-football-green-light font-medium"
                          >
                            Προβολή
                          </Link>
                        </div>
                      </div>
                    ))}
                    {pitches.length > 3 && (
                      <div className="text-center pt-2">
                        <Link
                          href="/management/pitches"
                          className="text-sm text-football-green hover:text-football-green-light font-medium"
                        >
                          Προβολή όλων ({pitches.length} γήπεδα) →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div className="px-6 py-6">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-purple-50 rounded-lg mr-3">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Γρήγορες Ενέργειες</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/management/bookings"
                className="relative rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-football-green hover:shadow-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-football-green transition-all duration-200"
              >
                <span className="text-2xl">📅</span>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Διαχείριση Κρατήσεων</p>
                  <p className="text-sm text-gray-500">Προβολή και διαχείριση όλων των κρατήσεων</p>
                </div>
              </Link>

              <Link
                href="/management/customers"
                className="relative rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-football-green hover:shadow-md focus-within:ring-offset-2 focus-within:ring-football-green transition-all duration-200"
              >
                <span className="text-2xl">👥</span>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Διαχείριση Πελατών</p>
                  <p className="text-sm text-gray-500">Διαχείριση πληροφοριών πελατών</p>
                </div>
              </Link>

              <Link
                href="/management/settings"
                className="relative rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-football-green hover:shadow-md focus-within:ring-offset-2 focus-within:ring-football-green transition-all duration-200"
              >
                <span className="text-2xl">🏟️</span>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Ρυθμίσεις Γηπέδου</p>
                  <p className="text-sm text-gray-500">Διαμόρφωση προτιμήσεων γηπέδου</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Expandable Venue Information */}
        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div className="px-6 py-4">
            <button
              onClick={() => setIsVenueInfoExpanded(!isVenueInfoExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center">
                <div className="p-2 bg-football-green/10 rounded-lg mr-3">
                  <span className="text-2xl">🏟️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Πληροφορίες Γηπέδου</h3>
              </div>
              <div className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                {isVenueInfoExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </button>
            
            {isVenueInfoExpanded && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {!venue ? (
                  <div className="text-center py-8">
                    <div className="text-red-500 mb-2">❌ Δεν βρέθηκαν πληροφορίες γηπέδου</div>
                    <div className="text-sm text-gray-400">Το γήπεδο δεν υπάρχει στη βάση δεδομένων</div>
                    <button
                      onClick={loadDashboardData}
                      className="mt-3 bg-football-green hover:bg-football-green/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Δοκιμάστε ξανά
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dt className="text-sm font-medium text-gray-500 mb-1">📍 Διεύθυνση</dt>
                      <dd className="text-sm text-gray-900 font-medium">{venue.address}</dd>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dt className="text-sm font-medium text-gray-500 mb-1">📧 Email</dt>
                                              <dd className="text-sm text-gray-900 font-medium">{venue.email || 'Δεν υπάρχει email'}</dd>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dt className="text-sm font-medium text-gray-500 mb-1">📞 Τηλέφωνο</dt>
                                              <dd className="text-sm text-gray-900 font-medium">{venue.phone || 'Δεν υπάρχει τηλέφωνο'}</dd>
                    </div>
                    
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Booking Modal */}
      {showQuickBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Γρήγορη Κράτηση</h2>
              <button
                onClick={() => setShowQuickBooking(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickBookingSubmit} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Όνομα Πελάτη *
                </label>
                                  <input
                    type="text"
                    value={quickBookingData.userName}
                    onChange={(e) => setQuickBookingData({...quickBookingData, userName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green"
                    placeholder="Εισάγετε όνομα"
                    required
                  />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Τηλέφωνο *
                </label>
                                  <input
                    type="tel"
                    value={quickBookingData.userPhone}
                    onChange={(e) => setQuickBookingData({...quickBookingData, userPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green"
                    placeholder="Εισάγετε τηλέφωνο"
                    required
                  />
              </div>

              {/* Pitch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Γήπεδο *
                </label>
                <select
                  value={quickBookingData.selectedPitchId}
                  onChange={(e) => setQuickBookingData({...quickBookingData, selectedPitchId: e.target.value, selectedSlot: ''})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green"
                  required
                >
                  <option value="">Επιλέξτε γήπεδο</option>
                  {pitches.map((pitch) => (
                    <option key={pitch.id} value={pitch.id}>
                      {pitch.name} ({pitch.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ημερομηνία *
                </label>
                <input
                  type="date"
                  value={quickBookingData.selectedDate}
                  onChange={(e) => setQuickBookingData({...quickBookingData, selectedDate: e.target.value, selectedSlot: ''})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green"
                  required
                />
              </div>

              {/* Time Slot Selection */}
              {quickBookingData.selectedPitchId && quickBookingData.selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ώρα *
                  </label>
                  <select
                    value={quickBookingData.selectedSlot}
                    onChange={(e) => setQuickBookingData({...quickBookingData, selectedSlot: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green"
                    required
                  >
                    <option value="">Επιλέξτε ώρα</option>
                    {generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).map((slot, index) => (
                      <option key={index} value={slot.time}>
                        {slot.display}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Σημειώσεις
                </label>
                <textarea
                  value={quickBookingData.notes}
                  onChange={(e) => setQuickBookingData({...quickBookingData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green"
                  placeholder="Προσθέστε σημειώσεις (προαιρετικό)"
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQuickBooking(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBooking}
                  className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingBooking ? 'Δημιουργία...' : 'Δημιουργία Κράτησης'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusConfirm && statusChangeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Επιβεβαίωση Αλλαγής Κατάστασης</h2>
              <p className="text-gray-600">
                Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση της κράτησης για τον{' '}
                <span className="font-semibold">{statusChangeData.userName}</span>;
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Από:</span>{' '}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    statusChangeData.oldStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                    statusChangeData.oldStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    statusChangeData.oldStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {statusChangeData.oldStatus === 'confirmed' ? 'Επιβεβαιωμένη' :
                     statusChangeData.oldStatus === 'pending' ? 'Εκκρεμεί' :
                     statusChangeData.oldStatus === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη'}
                  </span>
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">Σε:</span>{' '}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    statusChangeData.newStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                    statusChangeData.newStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    statusChangeData.newStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {statusChangeData.newStatus === 'confirmed' ? 'Επιβεβαιωμένη' :
                     statusChangeData.newStatus === 'pending' ? 'Εκκρεμεί' :
                     statusChangeData.newStatus === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowStatusConfirm(false);
                  setStatusChangeData(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
              >
                Ακύρωση
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
              >
                Επιβεβαίωση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
