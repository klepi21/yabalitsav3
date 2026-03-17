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
  User,
  Search,
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
    <div className="space-y-6 pb-8">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
        <div className="flex items-center gap-4">
           <div className="h-14 w-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-200 shrink-0">
             <LayoutDashboard className="h-7 w-7 text-emerald-400" />
           </div>
           <div className="space-y-0.5">
             <h1 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase">
               {toGreekUpperCase('Πίνακας Ελέγχου')}
             </h1>
             <div className="flex items-center gap-2">
               <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                 {toGreekUpperCase('Διαχειριση γηπεδου')} <span className="text-emerald-500 font-black">{venue?.name ? toGreekUpperCase(venue.name) : ''}</span>
               </p>
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowQuickBooking(true)}
            className="h-12 px-6 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-[11px] shadow-lg shadow-zinc-900/10 transition-all active:scale-95 group uppercase tracking-widest"
          >
            <Plus className="h-4 w-4 mr-2 text-emerald-400 group-hover:rotate-90 transition-transform duration-500" />
            {toGreekUpperCase('Γρήγορη Κράτηση')}
          </Button>

          <Button 
            variant="outline"
            onClick={() => {
              if (bookingPath) router.push(bookingPath);
            }}
            disabled={!bookingPath}
            className="h-12 px-6 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 font-black text-[11px] transition-all active:scale-95 shadow-sm uppercase tracking-widest"
          >
            {toGreekUpperCase('Σελιδα Booking')}
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'ΣΥΝΟΛΟ ΚΡΑΤΗΣΕΩΝ', value: bookings.length, detail: 'ΤΕΛΕΥΤΑΙΕΣ 30 ΗΜΕΡΕΣ', sparkline: "M0 30 Q10 25 20 28 T40 20 T60 25 T80 15 T100 22" },
          { label: 'LIVE ΑΓΩΝΕΣ', value: getLiveBookings(), detail: 'ΑΥΤΗ ΤΗ ΣΤΙΓΜΗ', sparkline: "M0 25 Q15 25 30 20 T60 28 T90 22 T120 25" },
          { label: 'Κρατήσεις Σήμερα', value: getTodaysBookings().length, detail: 'ΠΡΟΓΡΑΜΜΑ ΗΜΕΡΑΣ', sparkline: "M0 28 Q20 28 40 22 T80 25 T120 18 T160 24" },
          { label: 'ΣΥΝΟΛΟ ΠΕΛΑΤΩΝ', value: new Set(bookings.map(b => b.userName).filter(name => name && name.trim() !== '')).size, detail: 'ΣΥΝΟΛΟ ΠΕΛΑΤΩΝ', sparkline: "M0 22 Q25 22 50 28 T100 20 T150 25 T200 15" }
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none bg-white shadow-xl shadow-zinc-200/50 overflow-hidden group transition-all duration-500 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                     <p className="text-4xl font-black text-zinc-900 tracking-tighter">{stat.value}</p>
                   </div>
                   <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <CalendarDays className="h-5 w-5 text-zinc-300" />
                   </div>
                </div>
                
                {/* Sparkline Visual */}
                <div className="h-10 w-full mt-2">
                   <svg viewBox="0 0 100 40" className="h-full w-full stroke-emerald-500 fill-none stroke-[2.5] stroke-round">
                      <path d={stat.sparkline} className="opacity-40" />
                      <circle cx="100" cy="22" r="2" className="fill-emerald-500" />
                   </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        {/* Today's Bookings - Full Width */}
        <div className="space-y-8">
           <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                    <Clock className="h-6 w-6 text-emerald-400" />
                 </div>
                 <div className="space-y-0.5">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Σημερινές Κρατήσεις')}</h2>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Πρόγραμμα ημέρας')}</p>
                 </div>
              </div>
              <Button variant="outline" className="h-10 px-5 rounded-2xl border-none bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-black text-[10px] uppercase tracking-widest transition-all">
                 {toGreekUpperCase('Προβολη ολων')}
              </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getTodaysBookings().slice(0, 4).length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-zinc-100 italic text-zinc-400 font-bold">
                   Δεν υπάρχουν κρατήσεις για σήμερα
                </div>
              ) : (
                getTodaysBookings().slice(0, 4).map((booking) => {
                  const pitch = pitches.find(p => p.id === booking.pitchId);
                  return (
                    <Card key={booking.id} className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-zinc-200/30 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500">
                       <CardContent className="p-8">
                          <div className="flex flex-col gap-6">
                             {/* User Info Row */}
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
                                      <User className="h-6 w-6 text-emerald-600" />
                                   </div>
                                   <div className="space-y-0.5">
                                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                                         {toGreekUpperCase(booking.userName || 'Unknown')}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                         <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                         <p className="text-[10px] font-bold text-zinc-400">REGISTERED</p>
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-2xl font-black text-zinc-900 tracking-tighter">
                                      {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                                   </p>
                                   <p className="text-[10px] font-black text-emerald-500 uppercase">STARTING</p>
                                </div>
                             </div>

                             {/* Details Row */}
                             <div className="flex items-center gap-4 py-3 border-y border-zinc-50">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100">
                                   <Building2 className="h-3 w-3 text-zinc-400" />
                                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tight">{pitch ? toGreekUpperCase(pitch.name) : 'FIELD'}</span>
                                </div>
                                {booking.userPhone && (
                                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100">
                                      <Phone className="h-3 w-3 text-zinc-400" />
                                      <span className="text-[10px] font-black text-zinc-600 tracking-tight">{booking.userPhone}</span>
                                   </div>
                                )}
                             </div>

                             {/* Action Footer */}
                             <div className="flex items-center gap-3">
                                <div className="flex-1">
                                   {getStatusBadge(booking.status)}
                                </div>
                                <Button size="icon" variant="outline" className="h-10 w-10 rounded-2xl border-zinc-100 hover:bg-emerald-50 hover:border-emerald-200 text-zinc-400 transition-all" asChild>
                                   <Link href={`/management/bookings/${booking.id}`}>
                                      <Eye className="h-4 w-4" />
                                   </Link>
                                </Button>
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                  );
                })
              )}
           </div>
        </div>

      {/* 50/50 Row for Player Info and Pitches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
        {/* Player Information Table - Left Side */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                    <Users className="h-6 w-6 text-emerald-400" />
                 </div>
                 <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Πληροφορίες Παίκτη')}</h2>
              </div>
           </div>

           <div className="bg-white rounded-[2rem] shadow-xl shadow-zinc-200/40 border border-zinc-100/50 overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="border-b border-zinc-50 bg-zinc-50/30">
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Παικτης')}</th>
                          <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Σημαντη')}</th>
                          <th className="px-6 py-5 text-right"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                       {bookings.slice(0, 5).map((booking) => {
                          const pitch = pitches.find(p => p.id === booking.pitchId);
                          return (
                             <tr key={booking.id} className="group hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-4">
                                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden">
                                         <User className="h-5 w-5 text-emerald-600" />
                                      </div>
                                      <span className="text-sm font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase(booking.userName || 'Unknown')}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-2">
                                      <Clock className="h-3.5 w-3.5 text-emerald-500" />
                                      <span className="text-sm font-black text-zinc-900">{new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                   <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Pencil className="h-4 w-4 text-zinc-400" />
                                   </Button>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Pitches List - Right Side */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                    <Building2 className="h-6 w-6 text-emerald-400" />
                 </div>
                 <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Γήπεδα')}</h2>
              </div>
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl bg-zinc-100 hover:bg-zinc-200" asChild>
                 <Link href="/management/pitches/new">
                    <Plus className="h-5 w-5" />
                 </Link>
              </Button>
           </div>

           <div className="space-y-4">
              {pitches.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-zinc-100 italic text-zinc-400 font-bold">
                   Δεν υπάρχουν γήπεδα
                </div>
              ) : (
                pitches.slice(0, 5).map((pitch) => (
                  <Card key={pitch.id} className="rounded-3xl border-none bg-white shadow-xl shadow-zinc-200/20 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                     <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                           <div className="h-14 w-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0 relative">
                              <Building2 className="h-6 w-6 text-emerald-600 relative z-10" />
                              <div className="absolute inset-0 opacity-10">
                                 <svg className="h-full w-full" viewBox="0 0 100 60">
                                    <rect x="5" y="5" width="90" height="50" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
                                    <line x1="50" y1="5" x2="50" y2="55" stroke="currentColor" strokeWidth="1" />
                                    <circle cx="50" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                 </svg>
                              </div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate">{toGreekUpperCase(pitch.name)} <span className="text-[10px] text-zinc-400 ml-1">{pitch.type}</span></h5>
                              <p className="text-[11px] font-bold text-zinc-500 mt-1">
                                 €{pitch.pricePerSlot} <span className="text-zinc-300 mx-1">•</span> €{getPricePerPerson(pitch.pricePerSlot, pitch.type)}/άτομο
                              </p>
                           </div>
                           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                              <Link href={`/management/pitches/${pitch.id}`}>
                                 <Pencil className="h-4 w-4" />
                              </Link>
                           </Button>
                        </div>
                     </CardContent>
                  </Card>
                ))
              )}
           </div>
        </div>
      </div>

      <Dialog open={showQuickBooking} onOpenChange={setShowQuickBooking}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
                <Plus className="h-20 w-20 rotate-12" />
            </div>
            <DialogHeader className="relative z-10 text-left">
              <DialogTitle className="text-2xl font-black flex items-center gap-4 uppercase tracking-tight">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-zinc-900 shadow-lg shadow-emerald-500/20">
                    <Plus className="h-5 w-5" />
                </div>
                {toGreekUpperCase('Γρήγορη Κράτηση')}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 font-bold text-xs mt-1.5 uppercase tracking-widest pl-14">
                {toGreekUpperCase('Αμεση δημιουργια κρατησης')}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleQuickBookingSubmit} className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Όνομα Πελάτη *')}</Label>
                <Input
                  id="userName"
                  placeholder={toGreekUpperCase('Ονοματεπωνυμο')}
                  value={quickBookingData.userName}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, userName: e.target.value })}
                  required
                  className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-bold text-sm focus:bg-white transition-all uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPhone" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Τηλέφωνο Επικοινωνίας *')}</Label>
                <Input
                  id="userPhone"
                  type="tel"
                  placeholder="69XXXXXXXX"
                  value={quickBookingData.userPhone}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, userPhone: e.target.value })}
                  required
                  className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-bold text-sm focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pitch" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Επιλογή Γηπέδου *')}</Label>
                <Select
                  value={quickBookingData.selectedPitchId}
                  onValueChange={(value: string) => setQuickBookingData({ ...quickBookingData, selectedPitchId: value, selectedSlot: '' })}
                  required
                >
                  <SelectTrigger id="pitch" className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-black text-sm focus:ring-0 transition-all uppercase shadow-inner">
                    <SelectValue placeholder={toGreekUpperCase('Επιλεξτε γηπεδο')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-2xl p-1">
                    {pitches.map((pitch) => (
                      <SelectItem key={pitch.id} value={pitch.id} className="cursor-pointer py-2.5 font-bold text-[13px] rounded-lg hover:bg-zinc-50 uppercase">
                        {toGreekUpperCase(`${pitch.name} (${pitch.type})`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Ημερομηνία *')}</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={quickBookingData.selectedDate}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, selectedDate: e.target.value, selectedSlot: '' })}
                  required
                  className="h-11 px-4 rounded-xl bg-zinc-50 border-none font-bold text-sm focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Διαθέσιμες Ώρες')}</Label>
              {!quickBookingData.selectedPitchId || !quickBookingData.selectedDate ? (
                <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center gap-2.5">
                  <Clock className="h-6 w-6 text-zinc-200" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {toGreekUpperCase('Επιλεξτε γηπεδο και ημερομηνια')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).length === 0 ? (
                    <div className="col-span-full p-4 text-center bg-red-50 rounded-xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest">
                      {toGreekUpperCase('Δεν υπαρχουν διαθεσιμες ωρες')}
                    </div>
                  ) : (
                    generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setQuickBookingData({ ...quickBookingData, selectedSlot: slot.time })}
                        className={cn(
                          "h-10 rounded-lg text-[11px] font-black transition-all border-2 active:scale-95 uppercase tracking-tighter",
                          quickBookingData.selectedSlot === slot.time
                            ? "bg-zinc-900 border-zinc-900 text-white scale-105 z-10"
                            : "bg-white border-zinc-100 text-zinc-400 hover:border-emerald-200"
                        )}
                      >
                        {slot.display}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">{toGreekUpperCase('Σημειώσεις')}</Label>
                <Textarea
                  id="notes"
                  placeholder={toGreekUpperCase('Παρατηρήσεις...')}
                  value={quickBookingData.notes}
                  onChange={(e) => setQuickBookingData({ ...quickBookingData, notes: e.target.value })}
                  className="min-h-[140px] rounded-[2rem] bg-zinc-50 border-none px-8 py-6 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-300 resize-none shadow-inner"
                />
              </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl font-bold text-zinc-400 hover:text-zinc-600 border-none bg-zinc-50 hover:bg-zinc-100 transition-all text-sm uppercase tracking-widest"
                onClick={() => setShowQuickBooking(false)}
              >
                {toGreekUpperCase('Ακύρωση')}              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg transition-all active:scale-[0.98] text-sm uppercase tracking-widest group"
                disabled={isCreatingBooking}
              >
                {isCreatingBooking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    {toGreekUpperCase('Δημιουργία...')}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-3 text-emerald-300 transition-transform" />
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
