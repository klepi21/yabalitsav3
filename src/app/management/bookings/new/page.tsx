'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService, blockedDateService } from '@/lib/firebase-services';
import { Pitch, Booking, BlockedDate } from '@/types';

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

  // Check authentication and load pitches
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    loadPitches();
  }, [user, venueOwner, authLoading, router]);

  const loadPitches = async () => {
    if (!venueOwner) return;
    
    try {
      const [pitchesData, bookingsData, blockedDatesData] = await Promise.all([
        pitchService.getByVenue(venueOwner.venueId),
        bookingService.getByVenue(venueOwner.venueId),
        blockedDateService.getByVenue(venueOwner.venueId)
      ]);
      
      setPitches(pitchesData || []);
      setExistingBookings(bookingsData || []);
      setBlockedDates(blockedDatesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Αποτυχία φόρτωσης δεδομένων');
    } finally {
      setIsLoading(false);
    }
  };

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
  useEffect(() => {
    generateAvailableSlots();
  }, [watch('pitchId'), selectedDate, existingBookings, blockedDates]);

  const generateAvailableSlots = () => {
    const selectedPitchId = watch('pitchId');
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
    
    if (!daySchedule || !daySchedule.isOpen || !daySchedule.slots?.length) {
      console.log('No slots available for this day');
      setAvailableSlots([]);
      return [];
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
      return [];
    }

    // Generate time slots based on opening slots and slot duration
    const slots: string[] = [];
    
    // For each opening slot
    daySchedule.slots.forEach(openingSlot => {
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

    const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
    console.log('Available slots:', availableSlots);
    setAvailableSlots(availableSlots);
    return availableSlots;
  };

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/management/bookings"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στις Κρατήσεις
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isRecurring ? '🔄 Επαναλαμβανόμενη Κράτηση' : 'Νέα Κράτηση'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isRecurring 
            ? 'Δημιουργία επαναλαμβανόμενων κρατήσεων για το γήπεδό σας'
            : 'Δημιουργία νέας κράτησης για το γήπεδό σας'
          }
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-100">
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-football-green" />
                Πληροφορίες Πελάτη
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                    Όνομα Πελάτη *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="customerName"
                      {...register('customerName')}
                      className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                      placeholder="Εισάγετε όνομα πελάτη"
                    />
                  </div>
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">
                    Τηλέφωνο *
                  </label>
                  <div className="mt-1">
                    <input
                      type="tel"
                      id="customerPhone"
                      {...register('customerPhone')}
                      className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                      placeholder="Εισάγετε τηλέφωνο"
                    />
                  </div>
                  {errors.customerPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-football-green" />
                Λεπτομέρειες Κράτησης
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="pitchId" className="block text-sm font-medium text-gray-700">
                    Γήπεδο *
                  </label>
                  <div className="mt-1">
                    <select
                      id="pitchId"
                      {...register('pitchId')}
                      className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    >
                      <option value="">Επιλέξτε γήπεδο</option>
                      {pitches.map((pitch) => (
                        <option key={pitch.id} value={pitch.id}>
                          {pitch.name} ({pitch.type}) - €{pitch.pricePerSlot}/slot
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.pitchId && (
                    <p className="mt-1 text-sm text-red-600">{errors.pitchId.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700">
                    Ημερομηνία *
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      id="selectedDate"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    />
                  </div>
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
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <div className="flex items-center">
                            <span className="text-red-600 mr-2">🚫</span>
                            <div className="text-sm text-red-800">
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

                <div className="sm:col-span-2">
                  <label htmlFor="selectedSlot" className="block text-sm font-medium text-gray-700">
                    Διαθέσιμες Ώρες *
                  </label>
                  <div className="mt-1">
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setValue('selectedSlot', slot)}
                            className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                              watch('selectedSlot') === slot
                                ? 'border-football-green bg-football-green text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-football-green hover:bg-gray-50'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
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
                            return '🚫 Η ημερομηνία είναι κλειστή - δεν είναι δυνατή η κράτηση';
                          }
                          return 'Δεν υπάρχουν διαθέσιμες ώρες για την επιλεγμένη ημερομηνία';
                        })() : 'Επιλέξτε γήπεδο και ημερομηνία για να δείτε τις διαθέσιμες ώρες'
                        }
                      </div>
                    )}
                                </div>
              {errors.selectedSlot && (
                <p className="mt-1 text-sm text-red-600">{errors.selectedSlot.message}</p>
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
                  className="h-4 w-4 text-football-green focus:ring-football-green border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-gray-700">
                  🔄 Επαναλαμβανόμενη Κράτηση
                </label>
              </div>

              {isRecurring && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Συχνότητα
                      </label>
                      <select
                        value={recurringSettings.frequency}
                        onChange={(e) => setRecurringSettings({...recurringSettings, frequency: e.target.value})}
                        className="block w-full text-sm border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="weekly">Εβδομαδιαία</option>
                        <option value="daily">Ημερήσια</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Κάθε
                      </label>
                      <select
                        value={recurringSettings.interval}
                        onChange={(e) => setRecurringSettings({...recurringSettings, interval: parseInt(e.target.value)})}
                        className="block w-full text-sm border border-gray-300 rounded px-3 py-2"
                      >
                        <option value={1}>1 {recurringSettings.frequency === 'weekly' ? 'εβδομάδα' : 'ημέρα'}</option>
                        <option value={2}>2 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}</option>
                        <option value={3}>3 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}</option>
                        <option value={4}>4 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Αριθμός Κρατήσεων
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="52"
                      value={recurringSettings.occurrences}
                      onChange={(e) => setRecurringSettings({...recurringSettings, occurrences: parseInt(e.target.value)})}
                      className="block w-full text-sm border border-gray-300 rounded px-3 py-2"
                      placeholder="π.χ. 10"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Μέγιστος αριθμός: 52 {recurringSettings.frequency === 'weekly' ? 'εβδομάδες' : 'ημέρες'}
                    </p>
                  </div>

                  {/* Preview of recurring dates */}
                  {selectedDate && watch('pitchId') && (
                    <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Προεπισκόπηση Ημερομηνιών:</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        {generateRecurringDates(
                          selectedDate, 
                          recurringSettings.frequency, 
                          recurringSettings.interval, 
                          Math.min(recurringSettings.occurrences, 5)
                        ).map((date, index) => (
                          <div key={date} className="flex items-center justify-between">
                            <span>{new Date(date).toLocaleDateString('el-GR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              checkDateAvailability(date, watch('pitchId'), watch('selectedSlot'))
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {checkDateAvailability(date, watch('pitchId'), watch('selectedSlot'))
                                ? 'Διαθέσιμο'
                                : 'Μη διαθέσιμο'
                              }
                            </span>
                          </div>
                        ))}
                        {recurringSettings.occurrences > 5 && (
                          <div className="text-gray-500 italic">
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Τιμή ανά Κράτηση:</span>
                    <span className="text-lg font-bold text-football-green">
                      €{pitches.find(p => p.id === watch('pitchId'))?.pricePerSlot?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {isRecurring && recurringSettings.occurrences > 1 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Συνολική Τιμή ({recurringSettings.occurrences} κρατήσεις):</span>
                        <span className="text-xl font-bold text-football-green">
                          €{(pitches.find(p => p.id === watch('pitchId'))?.pricePerSlot || 0) * recurringSettings.occurrences}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Η τιμή καθορίζεται από το επιλεγμένο γήπεδο
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Σημειώσεις
              </label>
              <div className="mt-1">
                <textarea
                  id="notes"
                  rows={4}
                  {...register('notes')}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                  placeholder="Προσθέστε τυχόν σημειώσεις για την κράτηση"
                />
              </div>
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <Link
                href="/bookings"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
              >
                Ακύρωση
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Δημιουργία...' : 'Δημιουργία Κράτησης'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
