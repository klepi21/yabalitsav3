'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService } from '@/lib/firebase-services';
import { Booking, Pitch } from '@/types';

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
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
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
  } = useForm<BookingEditFormData>({
    resolver: zodResolver(bookingEditSchema),
  });

  const generateAvailableSlots = useCallback((pitchId: string, date: string) => {
    if (!pitch) return [];

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const openingHours = pitch.defaultOpeningHours[dayName];
    
    if (!openingHours || !openingHours.isOpen) {
      return [];
    }

    // Generate time slots based on opening hours and slot duration
    const slots: Array<{time: string, display: string}> = [];
    const startTime = new Date(`2000-01-01T${openingHours.open}`);
    const endTime = new Date(`2000-01-01T${openingHours.close}`);
    
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

    // Filter out already booked slots (including pending bookings), but exclude current booking
    const bookedSlots = existingBookings
      .filter(booking => 
        booking.pitchId === pitchId && 
        booking.status !== 'cancelled' && // Don't count cancelled bookings
        booking.id !== booking?.id && // Exclude current booking being edited
        new Date(booking.startTime).toDateString() === selectedDateObj.toDateString()
      )
      .map(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        const slotString = `${bookingStart.toTimeString().slice(0, 5)} - ${bookingEnd.toTimeString().slice(0, 5)}`;
        return slotString;
      });

    const availableSlots = slots.filter(slot => !bookedSlots.includes(slot.time));
    return availableSlots;
  }, [pitch, existingBookings]);

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
          
          // Generate available slots for the current date
          const startDate = new Date(bookingData.startTime);
          const slots = generateAvailableSlots(bookingData.pitchId, startDate.toISOString().slice(0, 10));
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
  }, [venueOwner?.venueId, generateAvailableSlots, reset]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (params.id) {
      loadBookingData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id, loadBookingData]);

  const handleDateChange = (date: string) => {
    if (pitch) {
      const slots = generateAvailableSlots(pitch.id, date);
      setAvailableSlots(slots);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Η κράτηση δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-gray-500">Η κράτηση που αναζητάτε δεν υπάρχει.</p>
        <Link
          href="/management/bookings"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Επιστροφή στις Κρατήσεις
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            href={`/management/bookings/${booking.id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Επιστροφή στην Κράτηση
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Επεξεργασία Κράτησης</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Πληροφορίες Πελάτη</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Όνομα Πελάτη *
              </label>
              <input
                type="text"
                {...register('customerName')}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Τηλέφωνο *
              </label>
              <input
                type="tel"
                {...register('customerPhone')}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Λεπτομέρειες Κράτησης</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ημερομηνία *
              </label>
              <input
                type="date"
                {...register('selectedDate')}
                onChange={(e) => handleDateChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.selectedDate && (
                <p className="mt-1 text-sm text-red-600">{errors.selectedDate.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ώρα *
              </label>
              <select
                {...register('selectedSlot')}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Επιλέξτε ώρα</option>
                {availableSlots.map((slot, index) => (
                  <option key={index} value={slot.time}>
                    {slot.display}
                  </option>
                ))}
              </select>
              {errors.selectedSlot && (
                <p className="mt-1 text-sm text-red-600">{errors.selectedSlot.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κατάσταση
              </label>
              <select
                {...register('status')}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Εκκρεμεί</option>
                <option value="confirmed">Επιβεβαιωμένη</option>
                <option value="completed">Ολοκληρωμένη</option>
                <option value="cancelled">Ακυρωμένη</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Τιμή ανά Κράτηση
              </label>
              <input
                type="text"
                value={pitch ? `€${pitch.pricePerSlot?.toFixed(2) || '0.00'}` : '€0.00'}
                disabled
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Σημειώσεις
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Προαιρετικές σημειώσεις..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>
        </div>

        {/* Pitch Information */}
        {pitch && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Πληροφορίες Γηπέδου</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Όνομα Γηπέδου</dt>
                <dd className="mt-1 text-sm text-gray-900">{pitch.name}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Τύπος</dt>
                <dd className="mt-1 text-sm text-gray-900">{pitch.type}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Παίκτες ανά Ομάδα</dt>
                <dd className="mt-1 text-sm text-gray-900">{getPlayersPerPitch(pitch.type)} παίκτες</dd>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href={`/management/bookings/${booking.id}`}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Ακύρωση
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
          </button>
        </div>
      </form>
    </div>
  );
}
