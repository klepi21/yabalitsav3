'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  CalendarDays,
  Loader2,
  Ban,
  RefreshCw,
  Clock,
  Plus,
  Euro,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/lib/firebase-services';
import { Pitch, Booking, BlockedDate, OpeningSlot, getOpeningSlots } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn, toGreekUpperCase } from '@/lib/utils';

// Form validation schema
const bookingCreateSchema = z.object({
  customerName: z.string().min(1, 'Το όνομα του πελάτη είναι υποχρεωτικό'),
  customerPhone: z.string().min(1, 'Ο αριθμός τηλεφώνου είναι υποχρεωτικός'),
  pitchId: z.string().min(1, 'Η επιλογή γηπέδου είναι υποχρεωτική'),
  selectedSlot: z.string().min(1, 'Η επιλογή ώρας είναι υποχρεωτική'),
  notes: z.string().optional(),
});

type BookingCreateFormData = z.infer<typeof bookingCreateSchema>;

export default function NewBookingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringSettings, setRecurringSettings] = useState({
    frequency: 'weekly', // 'weekly' or 'daily'
    interval: 1, // every 1 week/day
    occurrences: 4, // number of bookings to create
    endDate: '' // alternative end date
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<BookingCreateFormData>({
    resolver: zodResolver(bookingCreateSchema),
  });

  const watchedPitchId = watch('pitchId');

  // Get URL parameters for pre-filling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const timeParam = urlParams.get('time');
    const recurringParam = urlParams.get('recurring');

    if (dateParam) {
      setSelectedDate(dateParam);
    }

    if (timeParam && dateParam) {
      // Pre-select the time slot when it becomes available
      setTimeout(() => {
        setValue('selectedSlot', timeParam);
      }, 100);
    }

    if (recurringParam === 'true') {
      setIsRecurring(true);
    }
  }, [setValue]);

  const loadPitches = useCallback(async () => {
    if (!venueOwner || !user) return;

    try {
      setError(null);
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      const response = await fetch('/api/bookings/get-data', {
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
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const data = await response.json();

      const convertedPitches = (data.pitches || []).map((pitch: Record<string, unknown>) => ({
        ...pitch,
        createdAt: new Date(pitch.createdAt as string),
        updatedAt: new Date(pitch.updatedAt as string),
      }));

      const convertedBookings = (data.bookings || []).map((booking: Record<string, unknown>) => ({
        ...booking,
        startTime: new Date(booking.startTime as string),
        endTime: new Date(booking.endTime as string),
        createdAt: new Date(booking.createdAt as string),
        updatedAt: new Date(booking.updatedAt as string),
      }));

      const convertedBlockedDates = (data.blockedDates || []).map((blocked: Record<string, unknown>) => ({
        ...blocked,
        date: new Date(blocked.date as string),
        createdAt: new Date(blocked.createdAt as string),
        updatedAt: new Date(blocked.updatedAt as string),
      }));

      setPitches(convertedPitches);
      setExistingBookings(convertedBookings);
      setBlockedDates(convertedBlockedDates);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Αποτυχία φόρτωσης δεδομένων';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadPitches();
  }, [user, venueOwner, authLoading, router, loadPitches, pathname]);

  const checkDateAvailability = useCallback((date: string, pitchId: string, timeSlot: string) => {
    const isDateBlocked = blockedDates.some(blockedDate => {
      if (blockedDate.pitchId !== pitchId) return false;
      const startDate = new Date(blockedDate.startDate);
      const endDate = new Date(blockedDate.endDate);
      const checkDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });

    if (isDateBlocked) return false;

    const [slotTime] = timeSlot.split(' - ');
    const isBooked = existingBookings.some(booking => {
      const bookingDate = new Date(booking.startTime);
      const bookingTime = bookingDate.toTimeString().slice(0, 5);
      return (
        booking.pitchId === pitchId &&
        booking.status !== 'cancelled' &&
        bookingDate.toDateString() === new Date(date).toDateString() &&
        bookingTime === slotTime
      );
    });

    return !isBooked;
  }, [blockedDates, existingBookings]);

  const generateRecurringDates = (startDate: string, frequency: string, interval: number, occurrences: number) => {
    const dates: string[] = [];
    const baseDate = new Date(startDate);

    for (let i = 0; i < occurrences; i++) {
      const newDate = new Date(baseDate);
      if (frequency === 'weekly') {
        newDate.setDate(baseDate.getDate() + (i * interval * 7));
      } else if (frequency === 'daily') {
        newDate.setDate(baseDate.getDate() + (i * interval));
      }
      dates.push(newDate.toISOString().split('T')[0]);
    }
    return dates;
  };

  const handleFormSubmit = async (data: BookingCreateFormData) => {
    if (!venueOwner) return;

    setIsSaving(true);
    setError(null);

    try {
      const selectedPitch = pitches.find(p => p.id === data.pitchId);
      if (!selectedPitch) {
        throw new Error('Το επιλεγμένο γήπεδο δεν βρέθηκε');
      }

      const [slotTime] = data.selectedSlot.split(' - ');
      const [hours, minutes] = slotTime.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedPitch.slotDuration);

      if (isRecurring) {
        const recurringDates = generateRecurringDates(
          selectedDate,
          recurringSettings.frequency,
          recurringSettings.interval,
          recurringSettings.occurrences
        );

        let createdBookings = 0;
        let failedBookings = 0;

        for (const date of recurringDates) {
          if (checkDateAvailability(date, data.pitchId, data.selectedSlot)) {
            const currentStart = new Date(date);
            currentStart.setHours(hours, minutes, 0, 0);

            const currentEnd = new Date(currentStart);
            currentEnd.setMinutes(currentEnd.getMinutes() + selectedPitch.slotDuration);

            const newBooking = {
              venueId: venueOwner.venueId,
              pitchId: data.pitchId,
              slotId: '',
              userId: '',
              userName: data.customerName,
              userEmail: '',
              userPhone: data.customerPhone,
              startTime: currentStart,
              endTime: currentEnd,
              price: selectedPitch.pricePerSlot,
              status: 'confirmed' as const,
              notes: data.notes || '',
            };

            try {
              await bookingService.create(newBooking);
              createdBookings++;
            } catch (error) {
              console.error(`Failed to create booking for ${date}:`, error);
              failedBookings++;
            }
          } else {
            failedBookings++;
          }
        }

        if (createdBookings > 0) {
          alert(`Δημιουργήθηκαν ${createdBookings} κρατήσεις${failedBookings > 0 ? ` (${failedBookings} απέτυχαν)` : ''}`);
          router.push('/management/bookings');
        } else {
          setError('Δεν ήταν δυνατή η δημιουργία καμίας κράτησης');
        }
      } else {
        const newBooking = {
          venueId: venueOwner.venueId,
          pitchId: data.pitchId,
          slotId: '',
          userId: '',
          userName: data.customerName,
          userEmail: '',
          userPhone: data.customerPhone,
          startTime: startDateTime,
          endTime: endDateTime,
          price: selectedPitch.pricePerSlot,
          status: 'confirmed' as const,
          notes: data.notes || '',
        };

        await bookingService.create(newBooking);
        router.push('/management/bookings');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Αποτυχία δημιουργίας κράτησης');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const selectedPitchId = watchedPitchId;
    const date = selectedDate;

    if (!selectedPitchId || !date) {
      setAvailableSlots([]);
      return;
    }

    const selectedPitch = pitches.find(p => p.id === selectedPitchId);
    if (!selectedPitch) {
      setAvailableSlots([]);
      return;
    }

    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const daySchedule = selectedPitch.defaultOpeningHours[dayName];
    const daySlots = getOpeningSlots(daySchedule);

    if (!daySchedule || !daySchedule.isOpen || !daySlots.length) {
      setAvailableSlots([]);
      return;
    }

    // Check if the date is blocked
    const isDateBlocked = blockedDates.some(blockedDate => {
      if (blockedDate.pitchId !== selectedPitchId) return false;
      const startDate = new Date(blockedDate.startDate);
      const endDate = new Date(blockedDate.endDate);
      const checkDate = new Date(selectedDateObj);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });

    if (isDateBlocked) {
      setAvailableSlots([]);
      return;
    }

    const slots: string[] = [];
    daySlots.forEach((openingSlot: OpeningSlot) => {
      const startTime = new Date(`2000-01-01T${openingSlot.start}`);
      const endTime = new Date(`2000-01-01T${openingSlot.end}`);
      const currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + selectedPitch.slotDuration * 60000);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);

        if (slotEnd <= endTime) {
          slots.push(`${slotStart} - ${slotEndTime}`);
        }
        currentTime.setMinutes(currentTime.getMinutes() + selectedPitch.slotDuration);
      }
    });

    const bookedSlots = existingBookings
      .filter(booking =>
        booking.pitchId === selectedPitchId &&
        booking.status !== 'cancelled' &&
        new Date(booking.startTime).toDateString() === selectedDateObj.toDateString()
      )
      .map(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return `${bookingStart.toTimeString().slice(0, 5)} - ${bookingEnd.toTimeString().slice(0, 5)}`;
      });

    const computedAvailableSlots = slots.filter(slot => !bookedSlots.includes(slot));
    setAvailableSlots(computedAvailableSlots);
  }, [watchedPitchId, selectedDate, existingBookings, blockedDates, pitches]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumb & Header */}
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/management/dashboard" className="text-zinc-500 font-medium hover:text-emerald-600 transition-colors">Πίνακας Ελέγχου</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-zinc-300" />
            <BreadcrumbItem>
              <BreadcrumbLink href="/management/bookings" className="text-zinc-500 font-medium hover:text-emerald-600 transition-colors">Κρατήσεις</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-zinc-300" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-zinc-900 font-bold">
                {isRecurring ? 'Επαναλαμβανόμενη Κράτηση' : 'Νέα Κράτηση'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-200">
                {isRecurring ? (
                  <RefreshCw className="h-6 w-6 text-white" />
                ) : (
                  <CalendarDays className="h-6 w-6 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase">
                {toGreekUpperCase(isRecurring ? 'Επαναλαμβανόμενη Κράτηση' : 'Νέα Κράτηση')}
              </h1>
            </div>
            <p className="text-[16px] font-medium text-zinc-500 max-w-lg">
              {isRecurring
                ? 'Δημιουργία επαναλαμβανόμενων προγραμματισμένων κρατήσεων για το γήπεδό σας.'
                : 'Καταχωρήστε μια νέα κράτηση γρήγορα και εύκολα.'
              }
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-xl">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-red-900 uppercase tracking-wider">Σφάλμα</h3>
              <p className="text-red-700 mt-1 font-medium">{error}</p>
              <Button
                variant="link"
                onClick={() => { setError(null); loadPitches(); }}
                className="text-red-600 font-bold p-0 h-auto mt-2 hover:text-red-800"
              >
                Δοκιμάστε ξανά
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="premium-card overflow-hidden border-0">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-10">
                {/* 1. Customer Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                      <Users className="h-5 w-5 text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase">{toGreekUpperCase('Στοιχεία Πελάτη')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="customerName" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Όνομα Πελάτη *</Label>
                      <Input
                        id="customerName"
                        {...register('customerName')}
                        placeholder="π.χ. Γιάννης Παπαδόπουλος"
                        className="h-14 px-5 rounded-2xl border-zinc-200 focus:ring-emerald-500 font-medium text-lg"
                      />
                      {errors.customerName && (
                        <p className="text-sm font-bold text-red-500 ml-1">{errors.customerName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="customerPhone" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Τηλέφωνο *</Label>
                      <Input
                        type="tel"
                        id="customerPhone"
                        {...register('customerPhone')}
                        placeholder="π.χ. 6970000000"
                        className="h-14 px-5 rounded-2xl border-zinc-200 focus:ring-emerald-500 font-medium text-lg"
                      />
                      {errors.customerPhone && (
                        <p className="text-sm font-bold text-red-500 ml-1">{errors.customerPhone.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* 2. Pitch & Date Select */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                      <CalendarDays className="h-5 w-5 text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase">{toGreekUpperCase('Επιλογή Χώρου & Χρόνου')}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="pitchId" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Γήπεδο *</Label>
                      <div className="relative">
                        <select
                          id="pitchId"
                          {...register('pitchId')}
                          className="flex h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 py-2 text-lg font-medium shadow-none outline-none appearance-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                        >
                          <option value="">Επιλέξτε γήπεδο</option>
                          {pitches.map((pitch) => (
                            <option key={pitch.id} value={pitch.id}>
                              {pitch.name} ({pitch.type}) - &euro;{pitch.pricePerSlot}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Building2 className="h-5 w-5 text-zinc-300" />
                        </div>
                      </div>
                      {errors.pitchId && (
                        <p className="text-sm font-bold text-red-500 ml-1">{errors.pitchId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="selectedDate" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Ημερομηνία *</Label>
                      <Input
                        type="date"
                        id="selectedDate"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-14 px-5 rounded-2xl border-zinc-200 focus:ring-emerald-500 font-medium text-lg uppercase"
                      />
                    </div>
                  </div>

                  {/* Available Slots */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Διαθέσιμες Ώρες</Label>
                      {availableSlots.length > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">{availableSlots.length} Διαθέσιμα</Badge>}
                    </div>
                    
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {availableSlots.map((slot) => {
                          const isSelected = watch('selectedSlot') === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setValue('selectedSlot', slot)}
                              className={cn(
                                "h-12 flex items-center justify-center rounded-xl border-2 font-bold transition-all text-sm",
                                isSelected
                                  ? "bg-zinc-900 border-zinc-900 text-white shadow-lg active:scale-95 translate-y-[-2px]"
                                  : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50"
                              )}
                            >
                              {slot.split(' - ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-10 border-2 border-dashed border-zinc-100 rounded-3xl text-center bg-zinc-50/50">
                        <Clock className="h-10 w-10 text-zinc-200 mx-auto mb-4" />
                        <p className="text-zinc-500 font-bold max-w-xs mx-auto">
                          {selectedDate && watch('pitchId') 
                            ? 'Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημερομηνία.' 
                            : 'Επιλέξτε γήπεδο και ημερομηνία για να δείτε τις διαθέσιμες ώρες.'}
                        </p>
                      </div>
                    )}
                    {errors.selectedSlot && (
                      <p className="text-sm font-bold text-red-500 ml-1">{errors.selectedSlot.message}</p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* 3. Recurring Options */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <RefreshCw className="h-5 w-5 text-zinc-400" />
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 uppercase">{toGreekUpperCase('Επαναλαμβανόμενη')}</h3>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all",
                        isRecurring ? "bg-emerald-600 border-emerald-500 text-white shadow-md" : "bg-white border-zinc-200 grayscale opacity-60"
                      )}
                      onClick={() => setIsRecurring(!isRecurring)}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isRecurring}
                        readOnly
                      />
                      <div className={cn("h-4 w-4 rounded-full border-2 transition-all", isRecurring ? "bg-white border-white" : "border-zinc-300")} />
                      <span className="text-xs font-black uppercase tracking-widest">{isRecurring ? 'Ενεργή' : 'Ανενεργή'}</span>
                    </div>
                  </div>

                  {isRecurring && (
                    <div className="p-8 rounded-3xl bg-zinc-50 border-2 border-zinc-100 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Συχνότητα</Label>
                          <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setRecurringSettings({...recurringSettings, frequency: 'weekly'})}
                              className={cn(
                                "flex-1 h-12 rounded-xl text-sm font-bold transition-all",
                                recurringSettings.frequency === 'weekly' ? "bg-zinc-900 text-white shadow-md" : "text-zinc-500 hover:bg-zinc-50"
                              )}
                            >
                              Εβδομαδιαία
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecurringSettings({...recurringSettings, frequency: 'daily'})}
                              className={cn(
                                "flex-1 h-12 rounded-xl text-sm font-bold transition-all",
                                recurringSettings.frequency === 'daily' ? "bg-zinc-900 text-white shadow-md" : "text-zinc-500 hover:bg-zinc-50"
                              )}
                            >
                              Ημερήσια
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Επανάληψη ανά (βδομάδες/μέρες)</Label>
                          <select
                            value={recurringSettings.interval}
                            onChange={(e) => setRecurringSettings({...recurringSettings, interval: parseInt(e.target.value)})}
                            className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 font-bold shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
                          >
                            {[1,2,3,4].map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Συνολικές Κρατήσεις</Label>
                          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
                             <Button
                               type="button"
                               variant="ghost"
                               className="h-10 w-10 rounded-xl font-bold text-xl"
                               onClick={() => setRecurringSettings({...recurringSettings, occurrences: Math.max(2, recurringSettings.occurrences - 1)})}
                             >
                               -
                             </Button>
                             <div className="flex-1 text-center text-xl font-black">{recurringSettings.occurrences}</div>
                             <Button
                               type="button"
                               variant="ghost"
                               className="h-10 w-10 rounded-xl font-bold text-xl"
                               onClick={() => setRecurringSettings({...recurringSettings, occurrences: Math.min(52, recurringSettings.occurrences + 1)})}
                             >
                               +
                             </Button>
                          </div>
                        </div>
                      </div>

                      {/* Dates Preview */}
                      {selectedDate && watchedPitchId && (
                        <div className="space-y-4">
                          <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Προεπισκόπηση Ημερομηνιών</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {generateRecurringDates(
                              selectedDate,
                              recurringSettings.frequency,
                              recurringSettings.interval,
                              Math.min(recurringSettings.occurrences, 6)
                            ).map((date) => {
                              const isAvailable = checkDateAvailability(date, watch('pitchId'), watch('selectedSlot'));
                              return (
                                <div key={date} className="bg-white p-4 rounded-2xl border-2 border-zinc-100 flex items-center justify-between shadow-sm">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                                      {new Date(date).toLocaleDateString('el-GR', { weekday: 'long' })}
                                    </p>
                                    <p className="font-bold text-zinc-900 truncate">
                                      {new Date(date).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                  </div>
                                  <Badge className={cn(
                                    "font-black text-[10px] px-2.5",
                                    isAvailable ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                                  )}>
                                    {isAvailable ? 'ΟΚ' : 'ΚΡΑΤΗΜΕΝΟ'}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                          {recurringSettings.occurrences > 6 && (
                            <p className="text-center text-xs font-bold text-zinc-400 italic">... και ακόμα {recurringSettings.occurrences - 6} κρατήσεις</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-zinc-100" />

                {/* 4. Notes */}
                <div className="space-y-4">
                  <Label htmlFor="notes" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Σημειώσεις (Προαιρετικά)</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Προσθέστε κάποιες λεπτομέρειες αν χρειάζεται..."
                    className="min-h-[120px] rounded-3xl border-zinc-200 focus:ring-emerald-500 font-medium p-6 resize-none"
                  />
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-xl shadow-emerald-200 transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Γίνεται καταχώρηση...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                         <Plus className="h-6 w-6" />
                         <span>{isRecurring ? 'Δημιουργία Κρατήσεων' : 'Ολοκλήρωση Κράτησης'}</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-8">
          {/* Price Summary */}
          <Card className="premium-card bg-emerald-600 border-0 overflow-hidden shadow-2xl shadow-emerald-200">
            <CardContent className="p-8 text-white">
              <div className="flex items-center justify-between mb-8">
                <p className="text-xs font-black uppercase tracking-[3px] opacity-70">{toGreekUpperCase('Σύνοψη Πληρωμής')}</p>
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Euro className="h-5 w-5 text-emerald-100" />
                </div>
              </div>
              
              <div className="space-y-6">
                 <div className="flex items-end justify-between">
                   <p className="text-sm font-bold opacity-80">Τιμή ανά γήπεδο:</p>
                   <p className="text-2xl font-black">&euro;{pitches.find(p => p.id === watch('pitchId'))?.pricePerSlot?.toFixed(2) || '0.00'}</p>
                 </div>
                 
                 {isRecurring && recurringSettings.occurrences > 1 && (
                   <div className="flex items-end justify-between pt-4 border-t border-white/10">
                     <div>
                       <p className="text-sm font-bold opacity-80">Σύνολο ({recurringSettings.occurrences}):</p>
                       <p className="text-[10px] uppercase font-black opacity-50 tracking-wider">Προσεγγιστικά</p>
                     </div>
                     <p className="text-4xl font-black">
                       &euro;{((pitches.find(p => p.id === watch('pitchId'))?.pricePerSlot || 0) * recurringSettings.occurrences).toFixed(2)}
                     </p>
                   </div>
                 )}
              </div>

              <div className="mt-8 p-4 bg-emerald-700/50 rounded-2xl border border-white/10">
                <p className="text-xs font-bold leading-relaxed">Η πληρωμή θα πραγματοποιηθεί με την άφιξη του πελάτη στον χώρο.</p>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="premium-card">
            <CardContent className="p-8">
               <h4 className="text-sm font-black uppercase tracking-wider text-zinc-900 mb-4">Χρήσιμες Συμβουλές</h4>
               <ul className="space-y-4">
                 {[
                   'Βεβαιωθείτε ότι το τηλέφωνο είναι σωστό για αποστολή ενημέρωσης.',
                   'Οι κλειστές ημερομηνίες δεν επιτρέπουν κρατήσεις.',
                   'Για μακροχρόνιες κρατήσεις, επιλέξτε την επαναλαμβανόμενη λειτουργία.'
                 ].map((tip, idx) => (
                   <li key={idx} className="flex gap-3 text-sm font-medium text-zinc-500">
                     <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-black text-[10px] border border-emerald-100">
                       {idx + 1}
                     </span>
                     {tip}
                   </li>
                 ))}
               </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
