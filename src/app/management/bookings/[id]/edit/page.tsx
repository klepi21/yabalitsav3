'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  CalendarX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService, blockedDateService } from '@/lib/firebase-services';
import { Booking, Pitch, BlockedDate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Form validation schema
const bookingEditSchema = z.object({
  customerName: z.string().min(1, 'Το όνομα του πελάτη είναι υποχρεωτικό'),
  customerPhone: z.string().min(1, 'Ο αριθμός τηλεφώνου είναι υποχρεωτικός'),
  selectedDate: z.string().min(1, 'Η ημερομηνία είναι υποχρεωτική'),
  selectedSlot: z.string().min(1, 'Η ώρα είναι υποχρεωτική'),
  status: z.enum(['confirmed', 'pending', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

type BookingEditFormData = z.infer<typeof bookingEditSchema>;

export default function EditBookingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{time: string, display: string}>>([]);

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<BookingEditFormData>({
    resolver: zodResolver(bookingEditSchema),
  });

  // Pure helper to build slot list given explicit inputs (prevents effect re-runs)
  const buildAvailableSlots = useCallback((
    inputPitch: Pitch | null,
    pitchId: string,
    date: string,
    bookingsList: Booking[],
    blockedList: BlockedDate[],
    currentBookingId?: string
  ) => {
    if (!inputPitch) return [] as Array<{ time: string; display: string }>;
    if (!pitch) return [];

    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const daySchedule = (inputPitch || pitch).defaultOpeningHours[dayName] as { isOpen: boolean; slots: Array<{ start: string; end: string }> } | undefined;
    if (!daySchedule || !daySchedule.isOpen) return [];

    // Check if the date is fully blocked for this pitch
    const isDateBlocked = (blockedList || blockedDates).some(bd => {
      if (bd.pitchId !== pitchId) return false;
      const startDate = new Date(bd.startDate);
      const endDate = new Date(bd.endDate);
      const checkDate = new Date(selectedDateObj);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });
    if (isDateBlocked) return [];

    const slots: Array<{ time: string; display: string }> = [];

    // New structure with arbitrary opening slots
    if (daySchedule.slots && Array.isArray(daySchedule.slots) && daySchedule.slots.length) {
      daySchedule.slots.forEach((openingSlot: { start: string; end: string }) => {
        const startTime = new Date(`2000-01-01T${openingSlot.start}`);
        const endTime = new Date(`2000-01-01T${openingSlot.end}`);
        const currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const slotStart = currentTime.toTimeString().slice(0, 5);
          const slotEnd = new Date(currentTime.getTime() + (inputPitch || pitch).slotDuration * 60000);
          const slotEndTime = slotEnd.toTimeString().slice(0, 5);
          if (slotEnd <= endTime) {
            slots.push({ time: `${slotStart} - ${slotEndTime}`, display: slotStart });
          }
          currentTime.setMinutes(currentTime.getMinutes() + (inputPitch || pitch).slotDuration);
        }
      });
    } else if ('open' in daySchedule && 'close' in daySchedule && daySchedule.open && daySchedule.close) {
      // Backward compatibility: simple open/close window
      const startTime = new Date(`2000-01-01T${daySchedule.open}`);
      const endTime = new Date(`2000-01-01T${daySchedule.close}`);
      const currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + (inputPitch || pitch).slotDuration * 60000);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);
        if (slotEnd <= endTime) {
          slots.push({ time: `${slotStart} - ${slotEndTime}`, display: slotStart });
        }
        currentTime.setMinutes(currentTime.getMinutes() + (inputPitch || pitch).slotDuration);
      }
    }

    // Filter out already booked slots (including pending), excluding the current booking
    const bookedSlots = (bookingsList || existingBookings)
      .filter(b =>
        b.pitchId === pitchId &&
        b.status !== 'cancelled' &&
        b.id !== (currentBookingId ?? booking?.id) &&
        new Date(b.startTime).toDateString() === selectedDateObj.toDateString()
      )
      .map(b => {
        const bookingStart = new Date(b.startTime);
        const bookingEnd = new Date(b.endTime);
        return `${bookingStart.toTimeString().slice(0, 5)} - ${bookingEnd.toTimeString().slice(0, 5)}`;
      });

    return slots.filter(slot => !bookedSlots.includes(slot.time));
  }, [pitch, existingBookings, blockedDates, booking]);

  const generateAvailableSlots = useCallback((pitchId: string, date: string) => {
    return buildAvailableSlots(pitch, pitchId, date, existingBookings, blockedDates, booking?.id);
  }, [buildAvailableSlots, pitch, existingBookings, blockedDates, booking?.id]);

  const loadBookingData = useCallback(async (bookingId: string) => {
    try {
      const [bookingData, bookingsData] = await Promise.all([
        bookingService.getById(bookingId),
        bookingService.getByVenue(venueOwner?.venueId || '')
      ]);

      if (bookingData) {
        setBooking(bookingData);
        setExistingBookings(bookingsData || []);

        // Load pitch data if available
        if (bookingData.pitchId) {
          const pitchData = await pitchService.getById(bookingData.pitchId);
          setPitch(pitchData);

          // Load blocked dates for this pitch
          const blocked = await blockedDateService.getByPitch(bookingData.pitchId);
          setBlockedDates(blocked || []);

          // Generate available slots for the current date
          const startDate = new Date(bookingData.startTime);
          const slots = buildAvailableSlots(
            pitchData,
            bookingData.pitchId,
            startDate.toISOString().slice(0, 10),
            bookingsData || [],
            blocked || [],
            bookingData.id
          );
          setAvailableSlots(slots);
        }

        // Format dates for form inputs
        const startDate = new Date(bookingData.startTime);
        const endDate = new Date(bookingData.endTime);

        // Find the matching slot format for the current booking time
        const currentSlotTime = `${startDate.toTimeString().slice(0, 5)} - ${endDate.toTimeString().slice(0, 5)}`;

        reset({
          customerName: bookingData.userName || '',
          customerPhone: bookingData.userPhone || '',
          selectedDate: startDate.toISOString().slice(0, 10), // Format for date input
          selectedSlot: currentSlotTime,
          status: bookingData.status || 'confirmed',
          notes: bookingData.notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
      setError('Αποτυχία φόρτωσης δεδομένων κράτησης');
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner?.venueId, reset, buildAvailableSlots]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (params.id) {
      loadBookingData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id, loadBookingData, pathname]);

  const handleDateChange = (date: string) => {
    if (pitch) {
      const slots = generateAvailableSlots(pitch.id, date);
      setAvailableSlots(slots);
      // Reset selected slot if it is no longer available
      setValue('selectedSlot', '');
    }
  };

  const handleFormSubmit = async (data: BookingEditFormData) => {
    if (!booking || !pitch) return;

    setIsSaving(true);
    setError(null);

    try {
      // Parse the selected slot to get start time
      const [slotTime] = data.selectedSlot.split(' - ');
      const [hours, minutes] = slotTime.split(':').map(Number);
      const startTime = new Date(data.selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      // Calculate end time based on slot duration
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + pitch.slotDuration);

      await bookingService.update(booking.id, {
        userName: data.customerName,
        userPhone: data.customerPhone,
        startTime: startTime,
        endTime: endTime,
        price: pitch.pricePerSlot,
        status: data.status,
        notes: data.notes,
      });

      router.push(`/management/bookings/${booking.id}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      setError('Αποτυχία ενημέρωσης κράτησης');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <CalendarX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">Η κράτηση δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-muted-foreground">Η κράτηση που αναζητάτε δεν υπάρχει.</p>
        <Button className="mt-4" asChild>
          <Link href="/management/bookings">
            Επιστροφή στις Κρατήσεις
          </Link>
        </Button>
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
            <BreadcrumbLink href={`/management/bookings/${booking.id}`}>Λεπτομέρειες</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Επεξεργασία</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Επεξεργασία Κράτησης</h2>
        <p className="mt-1 text-muted-foreground">Ενημέρωση στοιχείων κράτησης</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Πληροφορίες Πελάτη</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Όνομα Πελάτη *</Label>
                <Input
                  type="text"
                  {...register('customerName')}
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Τηλέφωνο *</Label>
                <Input
                  type="tel"
                  {...register('customerPhone')}
                />
                {errors.customerPhone && (
                  <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Λεπτομέρειες Κράτησης</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ημερομηνία *</Label>
                <Controller
                  name="selectedDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="date"
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e);
                        handleDateChange(e.target.value);
                      }}
                    />
                  )}
                />
                {errors.selectedDate && (
                  <p className="text-sm text-destructive">{errors.selectedDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ώρα *</Label>
                <select
                  {...register('selectedSlot')}
                  className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Επιλέξτε ώρα</option>
                  {availableSlots.map((slot, index) => (
                    <option key={index} value={slot.time}>
                      {slot.display}
                    </option>
                  ))}
                </select>
                {errors.selectedSlot && (
                  <p className="text-sm text-destructive">{errors.selectedSlot.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Κατάσταση</Label>
                <select
                  {...register('status')}
                  className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="pending">Εκκρεμεί</option>
                  <option value="confirmed">Επιβεβαιωμένη</option>
                  <option value="completed">Ολοκληρωμένη</option>
                  <option value="cancelled">Ακυρωμένη</option>
                </select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Τιμή ανά Κράτηση</Label>
                <Input
                  type="text"
                  value={pitch ? `\u20AC${pitch.pricePerSlot?.toFixed(2) || '0.00'}` : '\u20AC0.00'}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Σημειώσεις</Label>
              <Textarea
                {...register('notes')}
                rows={3}
                placeholder="Προαιρετικές σημειώσεις..."
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pitch Information */}
        {pitch && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Πληροφορίες Γηπέδου</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Όνομα Γηπέδου</dt>
                  <dd className="mt-1 text-sm text-foreground">{pitch.name}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Τύπος</dt>
                  <dd className="mt-1 text-sm text-foreground">{pitch.type}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Παίκτες ανά Ομάδα</dt>
                  <dd className="mt-1 text-sm text-foreground">{getPlayersPerPitch(pitch.type)} παίκτες</dd>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={`/management/bookings/${booking.id}`}>
              Ακύρωση
            </Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
          </Button>
        </div>
      </form>
    </div>
  );
}
