'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/lib/firebase-services';
import { Booking, Pitch, Venue } from '@/types';
import {
  CalendarDays,
  Activity,
  Target,
  Users,
  Building2,
  Settings,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  XCircle,
  Plus,
  ChevronUp,
  ChevronDown,
  Loader2,
  Pencil,
  Eye,
  LayoutDashboard,
  Clock,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, toGreekUpperCase } from '@/lib/utils';

export default function DashboardPage() {
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isVenueInfoExpanded, setIsVenueInfoExpanded] = useState(false);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [showBookingMenu, setShowBookingMenu] = useState(false);
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

  // Loading state (moved up for proper hook ordering)
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!venueOwner?.venueId || !user) {
      return;
    }

    setLoadError(null);

    try {
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      const response = await fetch('/api/dashboard/get-data', {
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
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data = await response.json();

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

      const convertedVenue = data.venue ? {
        ...data.venue,
        createdAt: new Date(data.venue.createdAt),
        updatedAt: new Date(data.venue.updatedAt),
      } : null;

      setBookings(convertedBookings);
      setPitches(convertedPitches);
      setVenue(convertedVenue);

      if (!convertedVenue && venueOwner.venueId) {
        setLoadError('Venue data not found. Please contact support.');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setLoadError(errorMessage);
    }
  }, [venueOwner?.venueId, user]);

  // Close notifications when clicking outside
  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
  }, [user, venueOwner, authLoading, router, pathname]);

  useEffect(() => {
    if (venueOwner?.venueId) {
      loadDashboardData();
    }
  }, [venueOwner?.venueId, loadDashboardData]);

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
  }, [venueOwner?.venueId, loadDashboardData]);

  // Helper: create slug for /book/[venueName]
  function getVenueSlug(name?: string) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '');
  }

  const bookingPath = venue ? `/book/${getVenueSlug(venue.name)}` : '';

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !venueOwner) {
    return null; // Will redirect to login
  }

  const getLiveBookings = () => {
    const now = new Date();
    return bookings.filter(booking => {
      // Check if booking is confirmed and currently running
      if (booking.status !== 'confirmed') return false;

      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);

      // A booking is "live" if it started and hasn't ended yet
      return startTime <= now && endTime > now;
    }).length;
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

        const currentTime = new Date(startTime);

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

      const currentTime = new Date(startTime);

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Παρακαλώ συνδεθείτε</h1>
          <Button asChild>
            <Link href="/venue-login">Σύνδεση</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Don't block rendering if venue is null - let the error state handle it

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Επιβεβαιωμένη</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Εκκρεμεί</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Ολοκληρωμένη</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Ακυρωμένη</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Error Alert */}
      {loadError && (
        <Alert variant="destructive" className="rounded-2xl border-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div>
                <p className="font-bold text-[16px]">Σφάλμα κατά τη φόρτωση δεδομένων</p>
                <p className="text-sm mt-1 opacity-90">{loadError}</p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="bg-white hover:bg-zinc-50 border-red-200 text-red-700 font-bold"
                onClick={() => {
                  setLoadError(null);
                  loadDashboardData();
                }}
              >
                Δοκιμάστε ξανά
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4">
        <div className="flex items-center gap-6">
           <div className="h-20 w-20 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0">
             <LayoutDashboard className="h-10 w-10 text-emerald-400" />
           </div>
           <div className="space-y-1">
             <h1 className="text-5xl font-black tracking-tight text-zinc-900 uppercase">
               {toGreekUpperCase('Πίνακας Ελέγχου')}
             </h1>
             <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
               {toGreekUpperCase('ΔΙΑΧΕΙΡΙΣΗ ΓΗΠΕΔΟΥ')} <span className="text-emerald-500">{venue?.name ? toGreekUpperCase(venue.name) : ''}</span>
             </p>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Button 
            size="lg" 
            onClick={() => setShowQuickBooking(true)}
            className="h-16 px-8 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-lg shadow-xl hover:-translate-y-1 transition-all active:scale-95 group"
          >
            <Plus className="h-6 w-6 mr-3 text-emerald-400 group-hover:scale-110 transition-transform" />
            {toGreekUpperCase('Γρήγορη Κράτηση')}
          </Button>

          <DropdownMenu open={showBookingMenu} onOpenChange={setShowBookingMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="h-16 px-6 rounded-2xl border-zinc-200 hover:bg-zinc-50 text-zinc-900 font-extrabold transition-all active:scale-95 shadow-sm">
                {toGreekUpperCase('ΣΕΛΙΔΑ BOOKING')}
                <ChevronDown className="h-5 w-5 ml-3 opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 rounded-2xl shadow-2xl border-zinc-100 animate-in fade-in slide-in-from-top-2">
              <DropdownMenuItem
                className="rounded-xl px-5 py-4 font-black uppercase tracking-tight cursor-pointer text-[15px] group"
                onClick={() => {
                  setShowBookingMenu(false);
                  if (bookingPath) router.push(bookingPath);
                }}
                disabled={!bookingPath}
              >
                <Eye className="h-5 w-5 mr-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                {toGreekUpperCase('Άνοιγμα Σελίδας')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-xl px-5 py-4 font-black uppercase tracking-tight cursor-pointer text-[15px] group mt-1"
                onClick={() => {
                  setShowBookingMenu(false);
                  if (bookingPath) window.open(`/management/booking/qr?url=${encodeURIComponent(bookingPath)}`, '_blank');
                }}
                disabled={!bookingPath}
              >
                <Activity className="h-5 w-5 mr-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                {toGreekUpperCase('QR CODE')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Σύνολο Κρατήσεων', value: bookings.length, icon: CalendarDays, color: 'emerald' },
          { label: 'Live Αγώνες', value: getLiveBookings(), icon: Activity, color: 'emerald' },
          { label: 'Σημερινές Κρατήσεις', value: getTodaysBookings().length, icon: Target, color: 'emerald' },
          { label: 'Σύνολο Πελατών', value: new Set(bookings.map(b => b.userName).filter(name => name && name.trim() !== '')).size, icon: Users, color: 'emerald' }
        ].map((stat, i) => (
          <Card key={i} className="rounded-[2.5rem] border border-zinc-100 bg-white shadow-sm overflow-hidden group hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
            <CardContent className="p-10 relative">
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <p className="text-[11px] text-zinc-400 font-black tracking-[0.2em] uppercase">{toGreekUpperCase(stat.label)}</p>
                  <p className="text-6xl font-black text-zinc-900 tracking-tighter group-hover:text-emerald-600 transition-colors uppercase">{stat.value}</p>
                </div>
                <div className="h-20 w-20 rounded-3xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner">
                  <stat.icon className="h-10 w-10" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                 <stat.icon className="h-24 w-24 translate-x-1/4 translate-y-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Bookings - 8/12 width */}
        <div className="lg:col-span-8 space-y-6">
      <Card className="rounded-[3rem] border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                  <CalendarDays className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Σημερινές Κρατήσεις')}</CardTitle>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">{toGreekUpperCase('ΠΡΟΓΡΑΜΜΑ ΗΜΕΡΑΣ')}</p>
                </div>
              </div>
              <Button variant="outline" className="h-14 px-8 rounded-2xl font-black text-emerald-600 border-zinc-100 bg-zinc-50/50 hover:bg-emerald-600 hover:text-white transition-all text-xs uppercase tracking-widest" asChild>
                <Link href="/management/bookings">{toGreekUpperCase('Προβολή Όλων')}</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              {!bookings || getTodaysBookings().length === 0 ? (
                <div className="text-center py-16 bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-200">
                  <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="h-8 w-8 text-zinc-400" />
                  </div>
                  <h3 className="text-[16px] font-bold text-zinc-900">
                    {!bookings ? 'Φόρτωση κρατήσεων...' : 'Καμία κράτηση προγραμματισμένη'}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-2 max-w-[280px] mx-auto">
                    {!bookings ? 'Παρακαλώ περιμένετε' : 'Δεν υπάρχουν κρατήσεις για σήμερα στο σύστημα.'}
                  </p>
                  {bookings && (
                    <Button 
                      variant="outline" 
                      className="mt-6 font-bold rounded-xl"
                      onClick={() => setShowQuickBooking(true)}
                    >
                      Προσθήκη Κράτησης
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getTodaysBookings()
                    .slice(0, 10)
                    .map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    return (
                      <div key={booking.id} className="group bg-zinc-50 border border-zinc-100/50 rounded-[2.5rem] p-8 hover:border-emerald-200 hover:bg-white hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                        <div className="flex flex-col gap-8">
                          <div className="flex items-start justify-between relative z-10">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Πελάτης')}</p>
                                <h4 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                                {toGreekUpperCase(booking.userName || booking.userEmail || 'Άγνωστος')}
                                {booking.notes && (
                                    <div className="h-4 w-4 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse" />
                                )}
                                </h4>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{toGreekUpperCase('Έναρξη')}</p>
                                <p className="text-3xl font-black text-emerald-600 group-hover:scale-110 transition-transform origin-right">
                                    {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit', hour12: false})}
                                </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 py-6 border-y border-zinc-100 relative z-10">
                            {pitch && (
                                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-zinc-100 shadow-sm">
                                    <Building2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">{toGreekUpperCase(pitch.name)}</span>
                                </div>
                            )}
                            {booking.userPhone && (
                                <a href={`tel:${booking.userPhone}`} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-zinc-100 shadow-sm text-xs font-black text-zinc-400 hover:text-emerald-600 hover:border-emerald-200 transition-all group/phone">
                                    <Phone className="h-4 w-4 group-hover/phone:rotate-12 transition-transform" />
                                    {booking.userPhone}
                                </a>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="w-full sm:flex-1 h-14 px-6 rounded-2xl border border-zinc-200 bg-white flex items-center justify-between font-black text-[13px] transition-all hover:border-emerald-200 hover:shadow-lg active:scale-95 group/status uppercase tracking-widest">
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(booking.status)}
                                        </div>
                                        <ChevronDown className="h-5 w-5 text-zinc-300 group-hover/status:text-emerald-400 transition-colors" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-72 p-4 rounded-[2rem] shadow-2xl border-zinc-100 animate-in zoom-in-95 duration-200">
                                        <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'pending', booking.status, booking.userName || 'Άγνωστος')} className="rounded-xl px-5 py-5 font-black text-[14px] uppercase tracking-widest cursor-pointer group">
                                            <div className="h-3 w-3 rounded-full bg-amber-400 mr-5 group-hover:scale-150 transition-transform shadow-lg shadow-amber-200" />
                                            {toGreekUpperCase('Εκκρεμεί')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'confirmed', booking.status, booking.userName || 'Άγνωστος')} className="rounded-xl px-5 py-5 font-black text-[14px] uppercase tracking-widest cursor-pointer group mt-1">
                                            <div className="h-3 w-3 rounded-full bg-emerald-500 mr-5 group-hover:scale-150 transition-transform shadow-lg shadow-emerald-200" />
                                            {toGreekUpperCase('Επιβεβαιωμένη')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed', booking.status, booking.userName || 'Άγνωστος')} className="rounded-xl px-5 py-5 font-black text-[14px] uppercase tracking-widest cursor-pointer group mt-1">
                                            <div className="h-3 w-3 rounded-full bg-zinc-400 mr-5 group-hover:scale-150 transition-transform shadow-lg shadow-zinc-200" />
                                            {toGreekUpperCase('Ολοκληρωμένη')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'cancelled', booking.status, booking.userName || 'Άγνωστος')} className="rounded-xl px-5 py-5 font-black text-[14px] uppercase tracking-widest cursor-pointer group mt-1 text-red-600">
                                            <div className="h-3 w-3 rounded-full bg-red-500 mr-5 group-hover:scale-150 transition-transform shadow-lg shadow-red-200" />
                                            {toGreekUpperCase('Ακυρωμένη')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                
                                <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-white border-zinc-200 hover:border-emerald-200 text-zinc-400 hover:text-emerald-500 hover:shadow-lg transition-all active:scale-90" asChild>
                                    <Link href={`/management/bookings/${booking.id}`}>
                                        <Eye className="h-6 w-6" />
                                    </Link>
                                </Button>
                          </div>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-[0.03] pointer-events-none transition-opacity">
                             <CalendarDays className="h-40 w-40 rotate-12" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Management - 4/12 width */}
        <div className="lg:col-span-4 space-y-8">
          {/* Pitches List */}
          <Card className="premium-card">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl font-bold">Γήπεδα</CardTitle>
              </div>
              <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl border-zinc-200 hover:bg-zinc-50" asChild>
                <Link href="/management/pitches/new">
                  <Plus className="h-5 w-5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {pitches.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-200">
                  <Building2 className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-zinc-900">Δεν υπάρχουν γήπεδα</h3>
                  <Button variant="link" size="sm" className="font-bold text-emerald-600 p-0 h-auto mt-2" asChild>
                     <Link href="/management/pitches/new">Προσθήκη γηπέδου</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pitches.slice(0, 5).map((pitch, index) => {
                    const colors = [
                      { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                      { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'border-blue-200 bg-blue-50 text-blue-700' },
                      { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'border-violet-200 bg-violet-50 text-violet-700' },
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <div key={pitch.id} className="group flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 hover:border-emerald-200 hover:bg-zinc-50/50 transition-all duration-200">
                        <div className={`h-12 w-12 rounded-xl ${color.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                          <Building2 className={`h-6 w-6 ${color.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[15px] font-bold text-zinc-900 truncate">{pitch.name}</h4>
                            <Badge variant="outline" className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0", color.badge)}>
                              {pitch.type}
                            </Badge>
                          </div>
                          <p className="text-[13px] text-zinc-500 font-medium mt-0.5">
                            &euro;{pitch.pricePerSlot} &middot; &euro;{getPricePerPerson(pitch.pricePerSlot, pitch.type)}/άτομο
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <Link href={`/management/pitches/${pitch.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Venue Info Info Card - more prominent */}
          {venue && (
            <Card className="premium-card bg-white border-zinc-100 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  {toGreekUpperCase('Πληροφορίες Γηπέδου')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-600 tracking-widest">{toGreekUpperCase('Διεύθυνση')}</p>
                      <p className="text-[15px] font-medium leading-relaxed mt-1 text-zinc-900">{venue.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <Phone className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600 tracking-widest">{toGreekUpperCase('Τηλέφωνο')}</p>
                        <p className="text-[15px] font-medium mt-1 text-zinc-900">{venue.phone || venue.contactDetails?.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <Mail className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-600 tracking-widest">{toGreekUpperCase('Email')}</p>
                        <p className="text-[15px] font-medium mt-1 text-zinc-900 truncate">{venue.email || venue.contactDetails?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl font-bold bg-zinc-50 border-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-zinc-900"
                  asChild
                >
                  <Link href="/management/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    {toGreekUpperCase('Επεξεργασία Στοιχείων')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Booking Dialog - Enhanced */}
      <Dialog open={showQuickBooking} onOpenChange={setShowQuickBooking}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[3rem] border-0 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-900 p-12 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
                <Plus className="h-32 w-32 rotate-12" />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-4xl font-black flex items-center gap-5 uppercase tracking-tight">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-zinc-900 shadow-lg shadow-emerald-500/20">
                    <Plus className="h-8 w-8" />
                </div>
                {toGreekUpperCase('Γρήγορη Κράτηση')}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 font-bold text-lg mt-3 uppercase tracking-widest pl-20">
                {toGreekUpperCase('ΑΜΕΣΗ ΔΗΜΙΟΥΡΓΙΑ ΚΡΑΤΗΣΗΣ ΣΤΟ ΣΥΣΤΗΜΑ')}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleQuickBookingSubmit} className="p-12 space-y-10 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <Label htmlFor="userName" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Όνομα Πελάτη *')}</Label>
                <Input
                  id="userName"
                  placeholder={toGreekUpperCase('π.χ. ΓΙΑΝΝΗΣ ΠΑΠΑΔΟΠΟΥΛΟΣ')}
                  value={quickBookingData.userName}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, userName: e.target.value })}
                  required
                  className="h-16 px-6 rounded-2xl bg-zinc-50 border-none font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase"
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="userPhone" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Τηλέφωνο Επικοινωνίας *')}</Label>
                <Input
                  id="userPhone"
                  type="tel"
                  placeholder="69XXXXXXXX"
                  value={quickBookingData.userPhone}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, userPhone: e.target.value })}
                  required
                  className="h-16 px-6 rounded-2xl bg-zinc-50 border-none font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="pitch" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Επιλογή Γηπέδου *')}</Label>
                <Select
                  value={quickBookingData.selectedPitchId}
                  onValueChange={(value: string) => setQuickBookingData({ ...quickBookingData, selectedPitchId: value, selectedSlot: '' })}
                  required
                >
                  <SelectTrigger id="pitch" className="h-16 px-6 rounded-2xl bg-zinc-50 border-none font-black text-lg focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase shadow-inner">
                    <SelectValue placeholder={toGreekUpperCase('ΕΠΙΛΕΞΤΕ ΓΗΠΕΔΟ')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl p-2">
                    {pitches.map((pitch) => (
                      <SelectItem key={pitch.id} value={pitch.id} className="cursor-pointer py-4 font-black text-[15px] rounded-xl hover:bg-zinc-50 uppercase">
                        {toGreekUpperCase(`${pitch.name} (${pitch.type})`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label htmlFor="date" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Ημερομηνία *')}</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={quickBookingData.selectedDate}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, selectedDate: e.target.value, selectedSlot: '' })}
                  required
                  className="h-16 px-6 rounded-2xl bg-zinc-50 border-none font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-6">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Διαθέσιμες Ώρες')}</Label>
              {!quickBookingData.selectedPitchId || !quickBookingData.selectedDate ? (
                <div className="p-12 text-center bg-zinc-50 rounded-[2rem] border border-zinc-100 shadow-inner flex flex-col items-center justify-center gap-4">
                  <Clock className="h-10 w-10 text-zinc-200" />
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-relaxed">
                    {toGreekUpperCase('ΕΠΙΛΕΞΤΕ ΓΗΠΕΔΟ ΚΑΙ ΗΜΕΡΟΜΗΝΙΑ')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                  {generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).length === 0 ? (
                    <div className="col-span-full p-8 text-center bg-red-50 rounded-2xl border border-red-100 text-red-600 text-sm font-black uppercase tracking-widest">
                      {toGreekUpperCase('Δεν υπάρχουν διαθέσιμες ώρες')}
                    </div>
                  ) : (
                    generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setQuickBookingData({ ...quickBookingData, selectedSlot: slot.time })}
                        className={cn(
                          "h-14 rounded-2xl text-[13px] font-black transition-all border-2 active:scale-95 uppercase tracking-tighter shadow-sm",
                          quickBookingData.selectedSlot === slot.time
                            ? "bg-zinc-900 border-zinc-900 text-white shadow-xl scale-110 z-10 ring-8 ring-zinc-100"
                            : "bg-white border-zinc-100 text-zinc-400 hover:border-emerald-200 hover:text-emerald-600"
                        )}
                      >
                        {slot.display}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
                <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Σημειώσεις (Προαιρετικά)')}</Label>
                <Textarea
                  id="notes"
                  placeholder={toGreekUpperCase('ΕΙΔΙΚΕΣ ΠΑΡΑΤΗΡΗΣΕΙΣ...')}
                  value={quickBookingData.notes}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, notes: e.target.value })}
                  className="min-h-[140px] rounded-[2rem] bg-zinc-50 border-none px-8 py-6 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-300 resize-none shadow-inner"
                />
              </div>

            <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-20 rounded-[1.5rem] font-black text-zinc-400 hover:text-zinc-600 border-none bg-zinc-50 hover:bg-zinc-100 transition-all text-xl uppercase tracking-widest"
                onClick={() => setShowQuickBooking(false)}
              >
                {toGreekUpperCase('Ακύρωση')}
              </Button>
              <Button
                type="submit"
                className="flex-1 h-20 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98] text-xl uppercase tracking-widest group"
                disabled={isCreatingBooking}
              >
                {isCreatingBooking ? (
                  <>
                    <Loader2 className="h-8 w-8 mr-4 animate-spin" />
                    {toGreekUpperCase('Δημιουργία...')}
                  </>
                ) : (
                  <>
                    <Save className="h-8 w-8 mr-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                    {toGreekUpperCase('Επιβεβαίωση')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Improved Confirmation Alert Dialog */}
      <AlertDialog open={showStatusConfirm && !!statusChangeData} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowStatusConfirm(false);
          setStatusChangeData(null);
        }
      }}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-w-md">
          <div className="p-8 pt-10">
            <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-2xl font-black text-zinc-900 uppercase leading-tight">
                {toGreekUpperCase('Αλλαγή Κατάστασης Κράτησης')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[16px] font-medium text-zinc-500 mt-3 px-2">
                Πρόκειται να αλλάξετε την κατάσταση της κράτησης του/της <span className="text-zinc-900 font-bold">{statusChangeData?.userName}</span> σε <span className="font-bold text-emerald-600">
                  {statusChangeData?.newStatus === 'confirmed' ? 'Επιβεβαιωμένη' : 
                   statusChangeData?.newStatus === 'pending' ? 'Εκκρεμεί' :
                   statusChangeData?.newStatus === 'completed' ? 'Ολοκληρωμένη' : 'Ακυρωμένη'}
                </span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="p-8 pt-2 flex flex-col sm:flex-row gap-3">
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-xl font-bold text-zinc-500 flex-1 hover:bg-zinc-50"
                onClick={() => {
                  setShowStatusConfirm(false);
                  setStatusChangeData(null);
                }}
              >
                Πίσω
              </Button>
              <Button
                className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1 shadow-md shadow-emerald-600/20"
                onClick={confirmStatusChange}
              >
                Επιβεβαίωση
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
