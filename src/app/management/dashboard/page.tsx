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
    <div className="space-y-6">
      {/* Error Alert */}
      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Σφάλμα κατά τη φόρτωση δεδομένων πίνακα</p>
                <p className="text-sm mt-1">{loadError}</p>
                <p className="text-xs mt-1">
                  Αν το πρόβλημα συνεχίζεται, δοκιμάστε να ανανεώσετε τη σελίδα ή να συνδεθείτε ξανά.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Πίνακας Ελέγχου</h1>
          <p className="text-sm text-zinc-500 mt-1">Επισκόπηση γηπέδου και κρατήσεων</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowQuickBooking(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Γρήγορη Κράτηση
          </Button>

          {/* Booking Page Dropdown */}
          <DropdownMenu open={showBookingMenu} onOpenChange={setShowBookingMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Σελίδα Booking
                <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  setShowBookingMenu(false);
                  if (bookingPath) router.push(bookingPath);
                }}
                disabled={!bookingPath}
              >
                Άνοιγμα
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowBookingMenu(false);
                  if (bookingPath) window.open(`/management/booking/qr?url=${encodeURIComponent(bookingPath)}`, '_blank');
                }}
                disabled={!bookingPath}
              >
                Δημιουργία QR
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error State */}
      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <h3 className="font-semibold">Σφάλμα φόρτωσης</h3>
            <p className="mt-1">{loadError}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={loadDashboardData}
              className="mt-3"
            >
              Δοκιμάστε ξανά
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-zinc-500 font-medium">Σύνολο Κρατήσεων</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1 tracking-tight">{bookings.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-zinc-500 font-medium">Live Αγώνες</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1 tracking-tight">{getLiveBookings()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-zinc-500 font-medium">Σημερινές Κρατήσεις</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1 tracking-tight">{getTodaysBookings().length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-zinc-500 font-medium">Σύνολο Πελατών</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1 tracking-tight">{new Set(bookings.map(b => b.userName).filter(name => name && name.trim() !== '')).size}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Bookings - 2/3 width */}
        <div className="lg:col-span-2 flex">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Σημερινές Κρατήσεις</CardTitle>
              </div>
              <Button size="sm" asChild>
                <Link href="/management/bookings">Προβολή Όλων</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!bookings || getTodaysBookings().length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-foreground">
                    {!bookings ? 'Φόρτωση κρατήσεων...' : 'Δεν υπάρχουν σημερινές κρατήσεις'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {!bookings ? 'Παρακαλώ περιμένετε' : 'Δεν υπάρχουν κρατήσεις για σήμερα'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getTodaysBookings()
                    .slice(0, 5)
                    .map((booking) => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    return (
                      <div key={booking.id} className="border border-zinc-100/60 rounded-lg p-4 hover:bg-zinc-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground">
                            {booking.userName || booking.userEmail || 'Άγνωστος Πελάτης'}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(booking.status)}
                            <Select
                              value={booking.status}
                              onValueChange={(value) => handleStatusChange(
                                booking.id,
                                value as 'confirmed' | 'pending' | 'completed' | 'cancelled',
                                booking.status,
                                booking.userName || 'Άγνωστος'
                              )}
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Εκκρεμεί</SelectItem>
                                <SelectItem value="confirmed">Επιβεβαιωμένη</SelectItem>
                                <SelectItem value="completed">Ολοκληρωμένη</SelectItem>
                                <SelectItem value="cancelled">Ακυρωμένη</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(booking.startTime).toLocaleDateString('el-GR')} στις {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit', hour12: false})}
                          </span>
                          {pitch && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {pitch.name} ({pitch.type})
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              &euro;{booking.price || pitch?.pricePerSlot || 0}
                            </span>
                            {pitch && (
                              <span className="text-xs text-muted-foreground">
                                (&euro;{((booking.price || pitch.pricePerSlot || 0) / getPlayersPerPitch(pitch.type)).toFixed(0)}/άτομο)
                              </span>
                            )}
                          </div>
                          <Button variant="link" size="sm" className="text-primary p-0 h-auto" asChild>
                            <Link href={`/management/bookings/${booking.id}`}>
                              Προβολή
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

        {/* Pitches Management - 1/3 width */}
        <div className="lg:col-span-1 flex">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Γήπεδα</CardTitle>
              </div>
              <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                <Link href="/management/pitches/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {pitches.length === 0 ? (
                <div className="text-center py-6">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-foreground">Δεν υπάρχουν γήπεδα</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ξεκινήστε προσθέτοντας γήπεδο</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100/60">
                  {pitches.slice(0, 3).map((pitch, index) => {
                    const colors = [
                      { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'border-emerald-200/60 bg-emerald-50 text-emerald-700' },
                      { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'border-blue-200/60 bg-blue-50 text-blue-700' },
                      { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'border-violet-200/60 bg-violet-50 text-violet-700' },
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <div key={pitch.id} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-zinc-50/80 transition-colors rounded-lg px-1">
                        <div className={`h-9 w-9 rounded-lg ${color.bg} flex items-center justify-center shrink-0`}>
                          <Building2 className={`h-4 w-4 ${color.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-zinc-900 truncate">{pitch.name}</h4>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${color.badge}`}>
                              {pitch.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            &euro;{pitch.pricePerSlot} &middot; &euro;{getPricePerPerson(pitch.pricePerSlot, pitch.type)}/άτομο
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600" asChild>
                            <Link href={`/management/pitches/${pitch.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600" asChild>
                            <Link href={`/management/pitches/${pitch.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {pitches.length > 3 && (
                    <div className="text-center pt-1">
                      <Button variant="link" size="sm" className="text-primary text-xs" asChild>
                        <Link href="/management/pitches">
                          Προβολή όλων ({pitches.length} γήπεδα)
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-zinc-400" />
          <h2 className="text-[15px] font-semibold text-zinc-900">Γρήγορες Ενέργειες</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/management/bookings"
            className="group flex items-center gap-4 rounded-xl border border-zinc-100/60 bg-white p-4 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100/80 transition-colors">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Διαχείριση Κρατήσεων</p>
              <p className="text-xs text-zinc-400 mt-0.5">Προβολή και διαχείριση όλων των κρατήσεων</p>
            </div>
          </Link>

          <Link
            href="/management/customers"
            className="group flex items-center gap-4 rounded-xl border border-zinc-100/60 bg-white p-4 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100/80 transition-colors">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Διαχείριση Πελατών</p>
              <p className="text-xs text-zinc-400 mt-0.5">Διαχείριση πληροφοριών πελατών</p>
            </div>
          </Link>

          <Link
            href="/management/settings"
            className="group flex items-center gap-4 rounded-xl border border-zinc-100/60 bg-white p-4 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
          >
            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 group-hover:bg-violet-100/80 transition-colors">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Ρυθμίσεις Γηπέδου</p>
              <p className="text-xs text-zinc-400 mt-0.5">Διαμόρφωση προτιμήσεων γηπέδου</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Expandable Venue Information */}
      <div className="rounded-xl border border-zinc-100/60 bg-white">
        <button
          onClick={() => setIsVenueInfoExpanded(!isVenueInfoExpanded)}
          className="flex items-center justify-between w-full text-left px-6 py-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
            <span className="text-[15px] font-semibold text-zinc-900">Πληροφορίες Γηπέδου</span>
          </div>
          <div className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-zinc-50 transition-colors">
            {isVenueInfoExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </div>
        </button>

        {isVenueInfoExpanded && (
          <div className="px-6 pb-5">
            <div className="border-t border-zinc-100/60 pt-4">
              {!venue ? (
                <div className="text-center py-8">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-zinc-500 text-sm">Δεν βρέθηκαν πληροφορίες γηπέδου</div>
                  <div className="text-xs text-zinc-400 mt-1">Το γήπεδο δεν υπάρχει στη βάση δεδομένων</div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={loadDashboardData}
                    className="mt-3"
                  >
                    Δοκιμάστε ξανά
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-100/60 p-4">
                    <dt className="text-[13px] text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Διεύθυνση
                    </dt>
                    <dd className="text-sm text-zinc-900 font-medium">{venue.address}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-100/60 p-4">
                    <dt className="text-[13px] text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </dt>
                    <dd className="text-sm text-zinc-900 font-medium">{venue.email || 'Δεν υπάρχει email'}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-100/60 p-4">
                    <dt className="text-[13px] text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Τηλέφωνο
                    </dt>
                    <dd className="text-sm text-zinc-900 font-medium">{venue.phone || 'Δεν υπάρχει τηλέφωνο'}</dd>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Booking Modal */}
      <Dialog open={showQuickBooking} onOpenChange={setShowQuickBooking}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Γρήγορη Κράτηση</DialogTitle>
            <DialogDescription>
              Δημιουργήστε μια νέα κράτηση γρήγορα
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickBookingSubmit} className="space-y-4">
            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customer-name">Όνομα Πελάτη *</Label>
              <Input
                id="customer-name"
                type="text"
                value={quickBookingData.userName}
                onChange={(e) => setQuickBookingData({...quickBookingData, userName: e.target.value})}
                placeholder="Εισάγετε όνομα"
                required
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Τηλέφωνο *</Label>
              <Input
                id="customer-phone"
                type="tel"
                value={quickBookingData.userPhone}
                onChange={(e) => setQuickBookingData({...quickBookingData, userPhone: e.target.value})}
                placeholder="Εισάγετε τηλέφωνο"
                required
              />
            </div>

            {/* Pitch Selection */}
            <div className="space-y-2">
              <Label>Γήπεδο *</Label>
              <Select
                value={quickBookingData.selectedPitchId}
                onValueChange={(value) => setQuickBookingData({...quickBookingData, selectedPitchId: value, selectedSlot: ''})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε γήπεδο" />
                </SelectTrigger>
                <SelectContent>
                  {pitches.map((pitch) => (
                    <SelectItem key={pitch.id} value={pitch.id}>
                      {pitch.name} ({pitch.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="booking-date">Ημερομηνία *</Label>
              <Input
                id="booking-date"
                type="date"
                value={quickBookingData.selectedDate}
                onChange={(e) => setQuickBookingData({...quickBookingData, selectedDate: e.target.value, selectedSlot: ''})}
                required
              />
            </div>

            {/* Time Slot Selection */}
            {quickBookingData.selectedPitchId && quickBookingData.selectedDate && (
              <div className="space-y-2">
                <Label>Ώρα *</Label>
                <Select
                  value={quickBookingData.selectedSlot}
                  onValueChange={(value) => setQuickBookingData({...quickBookingData, selectedSlot: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε ώρα" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateAvailableSlots(quickBookingData.selectedPitchId, quickBookingData.selectedDate).map((slot, index) => (
                      <SelectItem key={index} value={slot.time}>
                        {slot.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="booking-notes">Σημειώσεις</Label>
              <Textarea
                id="booking-notes"
                value={quickBookingData.notes}
                onChange={(e) => setQuickBookingData({...quickBookingData, notes: e.target.value})}
                placeholder="Προσθέστε σημειώσεις (προαιρετικό)"
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowQuickBooking(false)}
              >
                Ακύρωση
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreatingBooking}
              >
                {isCreatingBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Δημιουργία...
                  </>
                ) : (
                  'Δημιουργία Κράτησης'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Modal */}
      <AlertDialog open={showStatusConfirm && !!statusChangeData} onOpenChange={(open) => {
        if (!open) {
          setShowStatusConfirm(false);
          setStatusChangeData(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-center">Επιβεβαίωση Αλλαγής Κατάστασης</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Είστε σίγουροι ότι θέλετε να αλλάξετε την κατάσταση της κράτησης για τον{' '}
              <span className="font-semibold">{statusChangeData?.userName}</span>;
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusChangeData && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm text-foreground">
                <span className="font-medium">Από:</span>{' '}
                {getStatusBadge(statusChangeData.oldStatus)}
              </p>
              <p className="text-sm text-foreground">
                <span className="font-medium">Σε:</span>{' '}
                {getStatusBadge(statusChangeData.newStatus)}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Επιβεβαίωση
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
