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
  Search,
  Bell,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

      {/* Donezo Style Header */}
      <div className="flex flex-col gap-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Search Bar */}
            <div className="relative group flex-1 max-w-xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-emerald-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder={toGreekUpperCase('Αναζήτηση...')}
                    className="w-full h-18 pl-16 pr-20 bg-white border-2 border-zinc-50 rounded-2xl font-bold text-lg focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-100 transition-all outline-none"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-zinc-50 rounded-lg text-[10px] font-black text-zinc-400 border border-zinc-100">
                    <span>⌘</span>
                    <span>F</span>
                </div>
            </div>

            {/* Actions & Profile */}
            <div className="flex items-center gap-6 self-end lg:self-auto">
                <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 border-zinc-50 bg-white hover:bg-zinc-50 text-zinc-400 hover:text-emerald-600 transition-all active:scale-90 relative">
                    <Mail className="h-6 w-6" />
                </Button>
                <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 border-zinc-50 bg-white hover:bg-zinc-50 text-zinc-400 hover:text-emerald-600 transition-all active:scale-90 relative">
                    <Bell className="h-6 w-6" />
                    <div className="absolute top-4 right-4 h-2.5 w-2.5 bg-red-500 border-2 border-white rounded-full" />
                </Button>
                
                <div className="h-14 w-[1px] bg-zinc-100 mx-2 hidden sm:block" />

                <div className="flex items-center gap-4 group cursor-pointer p-1 pr-4 rounded-2xl hover:bg-zinc-50 transition-all">
                    <Avatar className="h-14 w-14 border-2 border-emerald-50 shadow-sm group-hover:scale-105 transition-transform">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${venueOwner?.name || 'user'}`} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-black">
                            {venueOwner?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block">
                        <p className="text-[15px] font-black text-zinc-900 leading-tight uppercase">{toGreekUpperCase(venueOwner?.name || 'Admin')}</p>
                        <p className="text-[11px] font-bold text-zinc-400 truncate max-w-[120px]">{user?.email}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
                <h1 className="text-6xl font-black tracking-tighter text-zinc-900 uppercase italic">
                    {toGreekUpperCase('Πίνακας Ελέγχου')}
                </h1>
                <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
                    {toGreekUpperCase('ΔΙΑΧΕΙΡΙΣΗ ΓΗΠΕΔΟΥ')} <span className="text-emerald-600 font-black">{venue?.name ? toGreekUpperCase(venue.name) : ''}</span>
                </p>
            </div>

            <div className="flex items-center gap-4">
                <Button 
                    size="lg" 
                    onClick={() => setShowQuickBooking(true)}
                    className="h-18 px-10 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-xl shadow-2xl transition-all active:scale-95 group"
                >
                    <Plus className="h-8 w-8 mr-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    {toGreekUpperCase('Προσθήκη')}
                </Button>
                <Button 
                    variant="outline"
                    size="lg" 
                    onClick={() => { if (bookingPath) router.push(bookingPath); }}
                    className="h-18 px-10 rounded-2xl border-2 border-zinc-100 bg-white hover:bg-zinc-50 text-zinc-900 font-black text-xl transition-all active:scale-95 shadow-sm"
                >
                    {toGreekUpperCase('Booking')}
                </Button>
            </div>
        </div>
      </div>

      {/* Donezo Style Stats */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Σύνολο Κρατήσεων', value: bookings.length, trend: '5% increased from last month', main: true },
          { label: 'Live Αγώνες', value: getLiveBookings(), trend: '6% increased from last month' },
          { label: 'Σημερινές Κρατήσεις', value: getTodaysBookings().length, trend: '2% increased from last month' },
          { label: 'Πελάτες', value: new Set(bookings.map(b => b.userName).filter(name => name && name.trim() !== '')).size, trend: 'On discuss' }
        ].map((stat, i) => (
          <div key={i} className={cn(
              "relative rounded-[2.5rem] p-10 flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group cursor-pointer",
              stat.main ? "bg-emerald-800 text-white shadow-emerald-900/40 shadow-2xl" : "bg-white text-zinc-900 border border-zinc-50 shadow-sm"
          )}>
            <div className="flex items-start justify-between">
                <p className={cn("text-lg font-bold uppercase tracking-tight", stat.main ? "text-white/70" : "text-zinc-500")}>
                    {toGreekUpperCase(stat.label)}
                </p>
                <div className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center border-2 transition-all group-hover:rotate-45",
                    stat.main ? "border-white/20 text-white" : "border-zinc-100 text-zinc-400"
                )}>
                    <ArrowUpRight className="h-8 w-8" />
                </div>
            </div>

            <div className="mt-8 space-y-4">
                <p className="text-7xl font-black tracking-tighter">{stat.value}</p>
                <div className="flex items-center gap-2">
                    <TrendingUp className={cn("h-4 w-4", stat.main ? "text-emerald-400" : "text-emerald-600")} />
                    <p className={cn("text-[11px] font-black uppercase tracking-widest", stat.main ? "text-white/60" : "text-zinc-400")}>
                        {stat.trend}
                    </p>
                </div>
            </div>

            {/* Background design elements */}
            {stat.main && (
                <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-white/10 rounded-full blur-3xl" />
            )}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Bookings - 8/12 width */}
        <div className="lg:col-span-8 space-y-6">
      <Card className="rounded-[3rem] border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-3xl font-black text-zinc-900 uppercase tracking-tighter italic">{toGreekUpperCase('Σημερινές Κρατήσεις')}</CardTitle>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">{toGreekUpperCase('ΠΡΟΓΡΑΜΜΑ ΗΜΕΡΑΣ')}</p>
                </div>
                <Button variant="ghost" className="h-12 w-12 rounded-full border border-zinc-100 p-0 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" asChild>
                    <Link href="/management/bookings">
                        <ArrowUpRight className="h-6 w-6" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              {!bookings || getTodaysBookings().length === 0 ? (
                <div className="text-center py-20 bg-zinc-50/30 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
                  <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CalendarDays className="h-10 w-10 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 uppercase">
                    {!bookings ? 'ΦΟΡΤΩΣΗ...' : 'ΚΑΜΙΑ ΚΡΑΤΗΣΗ'}
                  </h3>
                  <Button 
                    variant="outline" 
                    className="mt-8 h-14 px-8 font-black rounded-2xl border-2 border-zinc-100 hover:bg-zinc-900 hover:text-white transition-all uppercase text-xs tracking-widest"
                    onClick={() => setShowQuickBooking(true)}
                  >
                    Προσθήκη Κράτησης
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {getTodaysBookings()
                    .map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    return (
                      <div key={booking.id} className="group flex items-center justify-between p-6 rounded-[2rem] bg-zinc-50/50 hover:bg-white border border-transparent hover:border-zinc-100 hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-16 w-16 border-4 border-white shadow-md ring-1 ring-zinc-100 transition-transform group-hover:scale-110">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.userName || 'user'}`} />
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-black">
                                    {booking.userName?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="text-xl font-black text-zinc-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                                    {toGreekUpperCase(booking.userName || booking.userEmail || 'Άγνωστος')}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        {pitch ? toGreekUpperCase(pitch.name) : 'ΓΗΠΕΔΟ'}
                                    </p>
                                    <div className="h-1 w-1 rounded-full bg-zinc-300" />
                                    <p className="text-xs font-black text-emerald-600">
                                        {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit', hour12: false})}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Badge className={cn(
                                "px-4 py-2 rounded-xl border-0 font-black text-[10px] uppercase tracking-widest shadow-sm",
                                booking.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
                                booking.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                "bg-zinc-100 text-zinc-500"
                            )}>
                                {toGreekUpperCase(booking.status === 'confirmed' ? 'Completed' : booking.status === 'pending' ? 'In Progress' : 'Pending')}
                            </Badge>
                            
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-white border-zinc-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:border-emerald-200 hover:text-emerald-600" asChild>
                                <Link href={`/management/bookings/${booking.id}`}>
                                    <Eye className="h-5 w-5" />
                                </Link>
                            </Button>
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
          <Card className="rounded-[3rem] border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black text-zinc-900 uppercase tracking-tighter italic">{toGreekUpperCase('Γήπεδα')}</CardTitle>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1">{toGreekUpperCase('ΔΙΑΧΕΙΡΙΣΗ ΕΓΚΑΤΑΣΤΑΣΕΩΝ')}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-full border border-zinc-50 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50" asChild>
                <Link href="/management/pitches/new">
                  <Plus className="h-6 w-6" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-10">
              {pitches.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50/50 rounded-[2rem] border-2 border-dashed border-zinc-100">
                  <Building2 className="h-10 w-10 text-zinc-200 mx-auto mb-4" />
                  <p className="text-xs font-black text-zinc-400 uppercase">Δεν υπάρχουν γήπεδα</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pitches.slice(0, 5).map((pitch, index) => {
                    const colors = [
                      { bg: 'bg-emerald-500', text: 'text-white' },
                      { bg: 'bg-blue-500', text: 'text-white' },
                      { bg: 'bg-zinc-900', text: 'text-white' },
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <div key={pitch.id} className="group flex items-center justify-between p-5 rounded-[2rem] border border-zinc-50 hover:border-zinc-100 hover:bg-zinc-50/50 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform", color.bg)}>
                                <Building2 className={cn("h-6 w-6", color.text)} />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-black text-zinc-900 uppercase tracking-tight truncate max-w-[120px]">{toGreekUpperCase(pitch.name)}</h4>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{pitch.type}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-300 hover:text-emerald-600 hover:bg-white" asChild>
                            <Link href={`/management/pitches/${pitch.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <Button variant="outline" className="w-full mt-6 h-14 rounded-2xl border-2 border-zinc-100 font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all" asChild>
                <Link href="/management/pitches">{toGreekUpperCase('Όλα τα γήπεδα')}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Time Tracker Style Component (Premium Visual) */}
          <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900 p-10 text-white shadow-2xl group cursor-pointer">
              <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">{toGreekUpperCase('Time Tracker')}</p>
                      <Clock className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                      <p className="text-6xl font-black tracking-tighter">14:42:08</p>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest group-hover:translate-x-2 transition-transform">{toGreekUpperCase('Active Session')}</p>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                      <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-zinc-900 hover:scale-110 transition-transform">
                          <Activity className="h-6 w-6" />
                      </div>
                      <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                          <AlertTriangle className="h-6 w-6" />
                      </div>
                  </div>
              </div>

              {/* Designer Pattern Overlay (from the image) */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.2),transparent_50%)] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-emerald-950/50 to-transparent" />
          </div>

          {/* Venue Info Info Card - premium style */}
          {venue && (
            <Card className="rounded-[3rem] border border-zinc-100 bg-white shadow-sm overflow-hidden mb-8">
              <CardHeader className="p-10 pb-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic">{toGreekUpperCase('Πληροφορίες')}</CardTitle>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1">{toGreekUpperCase('ΣΤΟΙΧΕΙΑ ΕΓΚΑΤΑΣΤΑΣΗΣ')}</p>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{toGreekUpperCase('Διεύθυνση')}</p>
                      <p className="text-sm font-bold mt-1 text-zinc-900 leading-relaxed">{venue.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{toGreekUpperCase('Τηλέφωνο')}</p>
                      <p className="text-sm font-bold mt-1 text-zinc-900">{venue.phone || venue.contactDetails?.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{toGreekUpperCase('Email')}</p>
                      <p className="text-sm font-bold mt-1 text-zinc-900 truncate">{venue.email || venue.contactDetails?.email}</p>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-14 rounded-2xl border-2 border-zinc-100 font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all"
                  asChild
                >
                    <Link href="/management/settings">
                        {toGreekUpperCase('ΕΠΕΞΕΡΓΑΣΙΑ')}
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
