'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  Users,
  CalendarDays,
  Loader2,
  Ban,
  RefreshCw
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
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
      // Get auth token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Use server-side API to fetch data with proper auth
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

      // Convert ISO strings back to Date objects
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

  // Check authentication and load pitches
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadPitches();
  }, [user, venueOwner, authLoading, router, loadPitches, pathname]);

  const handleFormSubmit = async (data: BookingCreateFormData) => {
    if (!venueOwner) return;

    setIsSaving(true);
    setError(null);

    try {
      console.log('Form data:', data);
      console.log('Selected date:', selectedDate);

      const selectedPitch = pitches.find(p => p.id === data.pitchId);
      if (!selectedPitch) {
        throw new Error('Το επιλεγμένο γήπεδο δεν βρέθηκε');
      }

      console.log('Selected pitch:', selectedPitch);

      // Parse the selected slot to get start time
      const [slotTime] = data.selectedSlot.split(' - ');
      const [hours, minutes] = slotTime.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);

      // Calculate end time based on slot duration
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedPitch.slotDuration);

      console.log('Start time:', startDateTime);
      console.log('End time:', endDateTime);

      if (isRecurring) {
        // Create multiple recurring bookings
        const recurringDates = generateRecurringDates(
          selectedDate,
          recurringSettings.frequency,
          recurringSettings.interval,
          recurringSettings.occurrences
        );

        let createdBookings = 0;
        let failedBookings = 0;

        for (const date of recurringDates) {
          // Check if this date and time slot is available
          if (checkDateAvailability(date, data.pitchId, data.selectedSlot)) {
            const startDateTime = new Date(date);
            startDateTime.setHours(hours, minutes, 0, 0);

            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + selectedPitch.slotDuration);

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
        // Create single booking
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

        console.log('Creating booking with data:', newBooking);

        const bookingId = await bookingService.create(newBooking);
        console.log('Booking created with ID:', bookingId);

        router.push('/management/bookings');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Αποτυχία δημιουργίας κράτησης');
    } finally {
      setIsSaving(false);
    }
  };


  // Generate available slots when pitch or date changes
  const watchedPitchId = watch('pitchId');
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

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const daySchedule = selectedPitch.defaultOpeningHours[dayName];
    console.log('Day schedule:', daySchedule);

    const daySlots = getOpeningSlots(daySchedule);
    if (!daySchedule || !daySchedule.isOpen || !daySlots.length) {
      console.log('No slots available for this day');
      setAvailableSlots([]);
      return;
    }

    // Check if the date is blocked
    const isDateBlocked = blockedDates.some(blockedDate => {
      if (blockedDate.pitchId !== selectedPitchId) return false;

      const startDate = new Date(blockedDate.startDate);
      const endDate = new Date(blockedDate.endDate);
      const checkDate = new Date(selectedDateObj);

      // Reset time to compare only dates
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);

      return checkDate >= startDate && checkDate <= endDate;
    });

    if (isDateBlocked) {
      console.log('Date is blocked');
      setAvailableSlots([]);
      return;
    }

    // Generate time slots based on opening slots and slot duration
    const slots: string[] = [];

    // For each opening slot
    daySlots.forEach((openingSlot: OpeningSlot) => {
      console.log('Processing slot:', openingSlot);
      const startTime = new Date(`2000-01-01T${openingSlot.start}`);
      const endTime = new Date(`2000-01-01T${openingSlot.end}`);

      const currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + selectedPitch.slotDuration * 60000);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);

        // Only add slot if it doesn't exceed closing time
        if (slotEnd <= endTime) {
          slots.push(`${slotStart} - ${slotEndTime}`);
        }

        currentTime.setMinutes(currentTime.getMinutes() + selectedPitch.slotDuration);
      }
    });

    // Filter out already booked slots (including pending bookings)
    const bookedSlots = existingBookings
      .filter(booking =>
        booking.pitchId === selectedPitchId &&
        booking.status !== 'cancelled' && // Don't count cancelled bookings
        new Date(booking.startTime).toDateString() === selectedDateObj.toDateString()
      )
      .map(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        const slotString = `${bookingStart.toTimeString().slice(0, 5)} - ${bookingEnd.toTimeString().slice(0, 5)}`;
        console.log(`Booking ${booking.id}: ${booking.userName} at ${slotString} (status: ${booking.status})`);
        return slotString;
      });

    console.log('All slots:', slots);
    console.log('Booked slots:', bookedSlots);
    console.log('Existing bookings for this pitch and date:', existingBookings.filter(booking =>
      booking.pitchId === selectedPitchId &&
      new Date(booking.startTime).toDateString() === selectedDateObj.toDateString()
    ));

    const computedAvailableSlots = slots.filter(slot => !bookedSlots.includes(slot));
    console.log('Available slots:', computedAvailableSlots);
    setAvailableSlots(computedAvailableSlots);
  }, [watchedPitchId, selectedDate, existingBookings, blockedDates, pitches]);

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

  const checkDateAvailability = (date: string, pitchId: string, timeSlot: string) => {
    // Check if the date is blocked
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

    // Check if the time slot is already booked
    const [slotTime] = timeSlot.split(' - ');
    const isBooked = existingBookings.some(booking => {
      const bookingDate = new Date(booking.startTime);
      const bookingTime = bookingDate.toTimeString().slice(0, 5);
      return (
        booking.pitchId === pitchId &&
        bookingDate.toDateString() === new Date(date).toDateString() &&
        bookingTime === slotTime
      );
    });

    return !isBooked;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Πίνακας Ελέγχου</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/management/bookings">Κρατήσεις</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isRecurring ? 'Επαναλαμβανόμενη Κράτηση' : 'Νέα Κράτηση'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          {isRecurring && <RefreshCw className="h-6 w-6" />}
          {isRecurring ? 'Επαναλαμβανόμενη Κράτηση' : 'Νέα Κράτηση'}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {isRecurring
            ? 'Δημιουργία επαναλαμβανόμενων κρατήσεων για το γήπεδό σας'
            : 'Δημιουργία νέας κράτησης για το γήπεδό σας'
          }
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-destructive">
                Σφάλμα κατά τη φόρτωση δεδομένων
              </h3>
              <div className="mt-2 text-sm text-destructive/80">
                <p>{error}</p>
                <p className="mt-2 text-xs">
                  Αν το πρόβλημα συνεχίζεται, δοκιμάστε να ανανεώσετε τη σελίδα ή να συνδεθείτε ξανά.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadPitches();
              }}
              className="ml-4 inline-flex text-destructive/60 hover:text-destructive"
            >
              <span className="text-sm font-medium">Δοκιμάστε ξανά</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Πληροφορίες Πελάτη
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Όνομα Πελάτη *</Label>
                  <Input
                    id="customerName"
                    {...register('customerName')}
                    placeholder="Εισάγετε όνομα πελάτη"
                  />
                  {errors.customerName && (
                    <p className="text-sm text-destructive">{errors.customerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Τηλέφωνο *</Label>
                  <Input
                    type="tel"
                    id="customerPhone"
                    {...register('customerPhone')}
                    placeholder="Εισάγετε τηλέφωνο"
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Booking Details */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Λεπτομέρειες Κράτησης
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pitchId">Γήπεδο *</Label>
                  <select
                    id="pitchId"
                    {...register('pitchId')}
                    className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Επιλέξτε γήπεδο</option>
                    {pitches.map((pitch) => (
                      <option key={pitch.id} value={pitch.id}>
                        {pitch.name} ({pitch.type}) - {'\u20AC'}{pitch.pricePerSlot}/slot
                      </option>
                    ))}
                  </select>
                  {errors.pitchId && (
                    <p className="text-sm text-destructive">{errors.pitchId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selectedDate">Ημερομηνία *</Label>
                  <Input
                    type="date"
                    id="selectedDate"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  {/* Blocked Date Warning */}
                  {selectedDate && watch('pitchId') && (() => {
                    const selectedPitchId = watch('pitchId');
                    const isDateBlocked = blockedDates.some(blockedDate => {
                      if (blockedDate.pitchId !== selectedPitchId) return false;

                      const startDate = new Date(blockedDate.startDate);
                      const endDate = new Date(blockedDate.endDate);
                      const checkDate = new Date(selectedDate);

                      startDate.setHours(0, 0, 0, 0);
                      endDate.setHours(23, 59, 59, 999);
                      checkDate.setHours(12, 0, 0, 0);

                      return checkDate >= startDate && checkDate <= endDate;
                    });

                    if (isDateBlocked) {
                      const blockedDate = blockedDates.find(bd => bd.pitchId === selectedPitchId);
                      return (
                        <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-destructive" />
                            <div className="text-sm text-destructive">
                              <p className="font-medium">Η ημερομηνία είναι κλειστή</p>
                              <p className="text-xs">{blockedDate?.reason || 'Δεν έχει οριστεί λόγος'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="selectedSlot">Διαθέσιμες Ώρες *</Label>
                  <div>
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setValue('selectedSlot', slot)}
                            className={`p-3 text-sm font-medium rounded-md border transition-colors ${
                              watch('selectedSlot') === slot
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-foreground hover:border-primary hover:bg-muted'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {selectedDate && watch('pitchId') ? (() => {
                          const selectedPitchId = watch('pitchId');
                          const isDateBlocked = blockedDates.some(blockedDate => {
                            if (blockedDate.pitchId !== selectedPitchId) return false;

                            const startDate = new Date(blockedDate.startDate);
                            const endDate = new Date(blockedDate.endDate);
                            const checkDate = new Date(selectedDate);

                            startDate.setHours(0, 0, 0, 0);
                            endDate.setHours(23, 59, 59, 999);
                            checkDate.setHours(12, 0, 0, 0);

                            return checkDate >= startDate && checkDate <= endDate;
                          });

                          if (isDateBlocked) {
                            return (
                              <span className="flex items-center justify-center gap-1">
                                <Ban className="h-4 w-4" />
                                Η ημερομηνία είναι κλειστή - δεν είναι δυνατή η κράτηση
                              </span>
                            );
                          }
                          return 'Δεν υπάρχουν διαθέσιμες ώρες για την επιλεγμένη ημερομηνία';
                        })() : 'Επιλέξτε γήπεδο και ημερομηνία για να δείτε τις διαθέσιμες ώρες'
                        }
                      </div>
                    )}
                  </div>
                  {errors.selectedSlot && (
                    <p className="text-sm text-destructive">{errors.selectedSlot.message}</p>
                  )}
                </div>

                {/* Recurring Booking Options */}
                <div className="sm:col-span-2">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor="isRecurring" className="ml-2 flex items-center gap-1">
                      <RefreshCw className="h-4 w-4" />
                      Επαναλαμβανόμενη Κράτηση
                    </Label>
                  </div>

                  {isRecurring && (
                    <div className="bg-muted rounded-lg p-4 border border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Συχνότητα</Label>
                          <select
                            value={recurringSettings.frequency}
                            onChange={(e) => setRecurringSettings({...recurringSettings, frequency: e.target.value})}
                            className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <option value="weekly">Εβδομαδιαία</option>
                            <option value="daily">Ημερήσια</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Κάθε</Label>
                          <select
                            value={recurringSettings.interval}
                            onChange={(e) => setRecurringSettings({...recurringSettings, interval: parseInt(e.target.value)})}
                            className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <option value={1}>1 {recurringSettings.frequency === 'weekly' ? 'εβδομάδα' : 'ημέρα'}</option>
                            <option value={2}>2 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}</option>
                            <option value={3}>3 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}</option>
                            <option value={4}>4 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Αριθμός Κρατήσεων</Label>
                        <Input
                          type="number"
                          min="2"
                          max="52"
                          value={recurringSettings.occurrences}
                          onChange={(e) => setRecurringSettings({...recurringSettings, occurrences: parseInt(e.target.value)})}
                          placeholder="π.χ. 10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Μέγιστος αριθμός: 52 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}
                        </p>
                      </div>

                      {/* Preview of recurring dates */}
                      {selectedDate && watch('pitchId') && (
                        <div className="mt-4 p-3 bg-background rounded-md border border-border">
                          <h4 className="text-sm font-medium text-foreground mb-2">Προεπισκόπηση Ημερομηνιών:</h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {generateRecurringDates(
                              selectedDate,
                              recurringSettings.frequency,
                              recurringSettings.interval,
                              Math.min(recurringSettings.occurrences, 5)
                            ).map((date) => (
                              <div key={date} className="flex items-center justify-between">
                                <span>{new Date(date).toLocaleDateString('el-GR', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    checkDateAvailability(date, watch('pitchId'), watch('selectedSlot'))
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                      : 'border-red-300 text-red-700 bg-red-50'
                                  }
                                >
                                  {checkDateAvailability(date, watch('pitchId'), watch('selectedSlot'))
                                    ? 'Διαθέσιμο'
                                    : 'Μη διαθέσιμο'
                                  }
                                </Badge>
                              </div>
                            ))}
                            {recurringSettings.occurrences > 5 && (
                              <div className="text-muted-foreground italic">
                                ... και {recurringSettings.occurrences - 5} ακόμα
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Price Display */}
              {watch('pitchId') && (
                <div className="mt-4 bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Τιμή ανά Κράτηση:</span>
                    <span className="text-lg font-bold text-primary">
                      {'\u20AC'}{pitches.find(p => p.id === watch('pitchId'))?.pricePerSlot?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {isRecurring && recurringSettings.occurrences > 1 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Συνολική Τιμή ({recurringSettings.occurrences} κρατήσεις):</span>
                        <span className="text-xl font-bold text-primary">
                          {'\u20AC'}{(pitches.find(p => p.id === watch('pitchId'))?.pricePerSlot || 0) * recurringSettings.occurrences}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Η τιμή καθορίζεται από το επιλεγμένο γήπεδο
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Σημειώσεις</Label>
              <Textarea
                id="notes"
                rows={4}
                {...register('notes')}
                placeholder="Προσθέστε τυχόν σημειώσεις για την κράτηση"
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/management/bookings">
                  Ακύρωση
                </Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? 'Δημιουργία...' : 'Δημιουργία Κράτησης'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
