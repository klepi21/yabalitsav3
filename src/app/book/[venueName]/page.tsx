"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, ArrowLeft, X, RotateCcw, CheckCircle2, AlertCircle, ShieldCheck, Goal, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from '@/lib/toast';

interface Booking {
  id: string;
  slotId: string;
  pitchId: string;
  venueId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  startTime: Date;
  endTime: Date;
  price: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
}

interface TimeSlot {
  time: string;
  available: boolean;
  conflictingBookings?: string[]; // Array of booking IDs that conflict with this slot
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  slots: TimeSlot[];
  hasAvailability: boolean;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  bookingsEnabled?: boolean;
}

interface Pitch {
  id: string;
  name: string;
  type: string;
  pricePerSlot: number;
  slotDuration: number;
  defaultOpeningHours: {
    [key: string]: {
      isOpen: boolean;
      slots: Array<{ start: string; end: string }>;
    };
  };
}


const BOOKING_STEPS = [
  { id: 'pitch', label: 'Γήπεδο' },
  { id: 'date', label: 'Ημερομηνία' },
  { id: 'slots', label: 'Ώρα' },
  { id: 'confirmation', label: 'Στοιχεία' },
] as const;

type BookingStepId = (typeof BOOKING_STEPS)[number]['id'];

/**
 * Ο χρήστης πρέπει να βλέπει πού βρίσκεται και πόσο απομένει.
 * Χωρίς αυτό, μια ροή 4 βημάτων μοιάζει ατέρμονη — και εγκαταλείπεται.
 */
function BookingStepper({
  current,
  onStepClick,
}: {
  current: BookingStepId;
  onStepClick: (step: BookingStepId) => void;
}) {
  const currentIndex = BOOKING_STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Πρόοδος κράτησης" className="mb-6">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {BOOKING_STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={step.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isDone && onStepClick(step.id)}
                disabled={!isDone}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group w-full text-left',
                  isDone ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-full transition-colors',
                    isDone && 'bg-emerald-500 group-hover:bg-emerald-400',
                    isCurrent && 'bg-zinc-900',
                    !isDone && !isCurrent && 'bg-zinc-200'
                  )}
                />
                <span className="mt-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold transition-colors',
                      isDone && 'bg-emerald-500 text-zinc-950',
                      isCurrent && 'bg-zinc-900 text-white',
                      !isDone && !isCurrent && 'bg-zinc-200 text-zinc-500'
                    )}
                  >
                    {isDone ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'hidden sm:block truncate text-xs',
                      isCurrent ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-500'
                    )}
                  >
                    {step.label}
                  </span>
                </span>
                <span className="sr-only">
                  {`Βήμα ${i + 1} από ${BOOKING_STEPS.length}: ${step.label}${isDone ? ' (ολοκληρώθηκε)' : ''}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function VenueBookingPage({ params }: { params: Promise<{ venueName: string }> }) {
  const { venueName } = use(params);
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'pitch' | 'date' | 'slots' | 'confirmation'>('pitch');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; time: string } | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    termsAccepted: false
  });

  // Email verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  
  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successBookingData, setSuccessBookingData] = useState<{
    userName: string;
    userPhone: string;
    pitchName: string;
    date: string;
    time: string;
    price: number;
  } | null>(null);

  // Load real data from Firebase
  useEffect(() => {
    const loadVenueData = async () => {
      try {
        // Import services dynamically to avoid SSR issues
        const { venueService, pitchService } = await import('@/lib/firebase-services');
        
        // Get all venues and find the one matching the URL
        const allVenues = await venueService.getAll();
        const decodedVenueName = decodeURIComponent(venueName);
        const foundVenue = allVenues.find(v => 
          v.name && v.name.toLowerCase().replace(/\s+/g, '') === decodedVenueName.toLowerCase().replace(/\s+/g, '')
        );

        console.log('All venues found:', allVenues.map(v => v.name));
        console.log('Looking for:', decodedVenueName);

        if (foundVenue) {
          console.log('Loading Venue:', {
            id: foundVenue.id,
            name: foundVenue.name,
            bookingsEnabled: foundVenue.bookingsEnabled
          });
          if (foundVenue.bookingsEnabled === false) {
            console.log('Bookings are DISABLED for this venue');
            setLoadError('Οι online κρατήσεις δεν είναι διαθέσιμες αυτή τη στιγμή. Επικοινωνήστε απευθείας με το γήπεδο.');
            setDataLoaded(true);
            return;
          }
        } else {
          console.warn('Venue not found matching:', decodedVenueName);
        }

        if (foundVenue) {
          // Set venue data
          const venueData: Venue = {
            id: foundVenue.id,
            name: foundVenue.name,
            address: foundVenue.address || 'Διεύθυνση δεν είναι διαθέσιμη',
            phone: foundVenue.phone || 'Δεν υπάρχει τηλέφωνο',
            email: foundVenue.email || 'Δεν υπάρχει email',
            imageUrl: '/yaba.png',
            rating: 4.8,
            reviewCount: 127
          };
          setVenue(venueData);

          // Get pitches for this venue
          const allPitchesData = await pitchService.getByVenue(foundVenue.id);
          const pitchesData = allPitchesData.filter(p => p.active === true);
          console.log('Pitches found:', pitchesData?.length || 0);
          if (pitchesData && pitchesData.length > 0) {
            // Get existing bookings for all pitches in this venue
            try {
              const { bookingService } = await import('@/lib/firebase-services');
              const allBookings: Booking[] = [];

              for (const pitch of pitchesData) {
                const pitchBookings = await bookingService.getByPitch(pitch.id);
                if (pitchBookings) {
                  // Add all bookings for this pitch
                  allBookings.push(...pitchBookings);
                }
              }

              setExistingBookings(allBookings);
            } catch (error) {
              console.error('Error loading existing bookings:', error);
            }
            // Convert to our Pitch interface format
            const convertedPitches: Pitch[] = pitchesData.map(pitch => {
              // Convert the database opening hours to our format
              const convertedOpeningHours: { [key: string]: { isOpen: boolean; slots: Array<{ start: string; end: string }> } } = {};

              // Map database opening hours to our interface
              if (pitch.defaultOpeningHours) {
                Object.entries(pitch.defaultOpeningHours).forEach(([day, hours]) => {
                  if (hours && typeof hours === 'object') {
                    // Handle both old and new format
                    if ('isOpen' in hours && 'slots' in hours) {
                      // New format
                      convertedOpeningHours[day] = {
                        isOpen: hours.isOpen,
                        slots: hours.slots || []
                      };
                    } else if ('start' in hours && 'end' in hours) {
                      // Old format - single time slot
                      convertedOpeningHours[day] = {
                        isOpen: true,
                        slots: [{
                          start: String(hours.start),
                          end: String(hours.end)
                        }]
                      };
                    } else {
                      // Fallback - closed
                      convertedOpeningHours[day] = {
                        isOpen: false,
                        slots: []
                      };
                    }
                  }
                });
              }

              // Set default opening hours if none exist
              if (Object.keys(convertedOpeningHours).length === 0) {
                convertedOpeningHours.monday = { isOpen: false, slots: [] };
                convertedOpeningHours.tuesday = { isOpen: false, slots: [] };
                convertedOpeningHours.wednesday = { isOpen: false, slots: [] };
                convertedOpeningHours.thursday = { isOpen: false, slots: [] };
                convertedOpeningHours.friday = { isOpen: false, slots: [] };
                convertedOpeningHours.saturday = { isOpen: false, slots: [] };
                convertedOpeningHours.sunday = { isOpen: false, slots: [] };
              }

              return {
                id: pitch.id,
                name: pitch.name,
                type: pitch.type || 'football',
                pricePerSlot: pitch.pricePerSlot || 0,
                slotDuration: pitch.slotDuration || 60,
                defaultOpeningHours: convertedOpeningHours
              };
            });

            setPitches(convertedPitches);
            setSelectedPitch(convertedPitches[0]);
          } else {
            console.error('No pitches found for venue:', foundVenue.name);
            setLoadError('Δεν βρέθηκαν γήπεδα για αυτό το venue.');
          }
        } else {
          console.error('Venue not found for slug:', venueName);
          setLoadError('Το venue δεν βρέθηκε.');
        }
      } catch (error) {
        console.error('Error loading venue data:', error);
        console.error('venueName:', venueName);
        setLoadError('Σφάλμα φόρτωσης: ' + (error instanceof Error ? error.message : 'Άγνωστο σφάλμα'));
      } finally {
        setDataLoaded(true);
      }
    };

    loadVenueData();
  }, [venueName]);


  const generateWeekSchedule = (): DaySchedule[] => {
    if (!selectedPitch) return [];
    
    const weekSchedule: DaySchedule[] = [];
    const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(currentWeek.getDate() + i);
      
      const isToday = i === 0;
      const dayName = isToday ? 'Σήμερα' : dayNames[date.getDay()];
      const dateStr = date.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' });
      const dayKey = dayKeys[date.getDay()];
      
      const slots: TimeSlot[] = [];
      let hasAvailability = false;
      
      // Check if the pitch has opening hours for this day
      const dayOpeningHours = selectedPitch.defaultOpeningHours[dayKey];
      
      if (dayOpeningHours?.isOpen && dayOpeningHours.slots && dayOpeningHours.slots.length > 0) {
        hasAvailability = true;
        
        // Generate slots based on the actual opening hours
        dayOpeningHours.slots.forEach(timeSlot => {
          const startHour = parseInt(timeSlot.start.split(':')[0]);
          const endHour = parseInt(timeSlot.end.split(':')[0]);
          
          // Generate slots for each hour in the range
          for (let hour = startHour; hour < endHour; hour++) {
            const slotTime = `${hour.toString().padStart(2, '0')}:00`;
            
            // Check if this slot conflicts with existing bookings
            const conflictingBookings = existingBookings.filter(booking => {
              if (booking.pitchId !== selectedPitch.id || booking.status === 'cancelled') {
                return false;
              }
              
              const bookingDate = new Date(booking.startTime);
              const currentDate = new Date(currentWeek);
              currentDate.setDate(currentWeek.getDate() + i);
              
              // Check if it's the same date
              if (bookingDate.toDateString() !== currentDate.toDateString()) {
                return false;
              }
              
              // Check if the time conflicts
              const bookingStartHour = bookingDate.getHours();
              const bookingEndHour = new Date(booking.endTime).getHours();
              
              // Check if the requested slot overlaps with the booking
              return hour >= bookingStartHour && hour < bookingEndHour;
            });
            
            const isAvailable = conflictingBookings.length === 0;
            
            slots.push({
              time: slotTime,
              available: isAvailable,
              conflictingBookings: conflictingBookings.map(b => b.id)
            });
          }
        });
      }
      
      weekSchedule.push({
        date: dateStr,
        dayName,
        dayNumber: date.getDate(),
        slots,
        hasAvailability
      });
    }
    
    return weekSchedule;
  };

  const weekSchedule = generateWeekSchedule();
  const weekRange = `${weekSchedule[0]?.date} - ${weekSchedule[6]?.date}`;

  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    if (direction === 'prev') {
      newWeek.setDate(currentWeek.getDate() - 7);
    } else {
      newWeek.setDate(currentWeek.getDate() + 7);
    }
    setCurrentWeek(newWeek);
  };

  const handlePitchSelect = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setCurrentStep('date');
  };

  const handleDateSelect = (dateStr: string) => {
    // Convert the Greek date string to a proper Date object
    const [, month] = dateStr.split(' ');
    const monthMap: { [key: string]: number } = {
      'Ιαν': 0, 'Φεβ': 1, 'Μαρ': 2, 'Απρ': 3, 'Μαϊ': 4, 'Ιουν': 5,
      'Ιουλ': 6, 'Αυγ': 7, 'Σεπ': 8, 'Οκτ': 9, 'Νοε': 10, 'Δεκ': 11
    };
    
    const monthIndex = monthMap[month];
    if (monthIndex === undefined) {
      return;
    }
    
    // Use the current week's year instead of current year
    const selectedDate = new Date(currentWeek);
    selectedDate.setDate(currentWeek.getDate() + weekSchedule.findIndex(d => d.date === dateStr));
    
    setSelectedDate(selectedDate);
    setCurrentStep('slots');
  };

  const handleTimeSlotSelect = (date: string, time: string) => {
    setSelectedTimeSlot({ date, time });
    setCurrentStep('confirmation');
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirmBooking = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.termsAccepted) {
      toast.error('Λείπουν στοιχεία', 'Συμπληρώστε τα υποχρεωτικά πεδία και αποδεχτείτε τους όρους χρήσης.');
      return;
    }

    // Validate Greek phone number (should be 10 digits starting with 6)
    if (!/^6\d{9}$/.test(formData.phone)) {
      toast.error('Μη έγκυρο κινητό', 'Χρειάζονται 10 ψηφία που ξεκινούν από 6.');
      return;
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Μη έγκυρο email', 'Ελέγξτε τη διεύθυνση που πληκτρολογήσατε.');
      return;
    }

    // Show email verification popup
    setShowEmailVerification(true);
  };

  const goToStep = (step: 'pitch' | 'date' | 'slots' | 'confirmation') => { 
    setCurrentStep(step);
  };



  // Email resend countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((p) => {
          if (p <= 1) {
            setCanResend(true);
            setEmailError(null);
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [countdown]);

  // Send Email verification code
  const sendEmailVerification = async () => {
    if (!formData.email) {
      toast.error('Συμπληρώστε το email σας');
      return;
    }
    try {
      setIsSendingEmail(true);
      setEmailError(null);
      const res = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, firstName: formData.firstName })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'send_failed');
      }
      setCountdown(60);
      setCanResend(false);
      setEmailSent(true);
      // Initialize email code input after successful send
      setEmailCode('');
    } catch (err: unknown) {
      console.error('email send error', err);
      setEmailError('Αποτυχία αποστολής email. Δοκιμάστε ξανά.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Verify Email code
  const verifyEmailCode = async () => {
    if (!emailCode || !formData.email) return;
    try {
      setIsVerifyingEmail(true);
      const res = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: emailCode })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'invalid_code');
      }
      await createBooking();
      setShowEmailVerification(false);
      setEmailCode('');
      setEmailSent(false);

      if (selectedPitch && selectedDate && selectedTimeSlot) {
        setSuccessBookingData({
          userName: `${formData.firstName} ${formData.lastName}`,
          userPhone: `+30 ${formData.phone}`,
          pitchName: selectedPitch.name,
          date: selectedDate.toLocaleDateString('el-GR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          time: selectedTimeSlot.time,
          price: selectedPitch.pricePerSlot
        });
        setShowSuccessPopup(true);
      }
    } catch (err) {
      console.error('verify email error', err);
      toast.error('Λάθος κωδικός', 'Ελέγξτε τον 6ψήφιο κωδικό που λάβατε με email.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Create booking in database
  const createBooking = async () => {
    if (!selectedPitch || !selectedDate || !selectedTimeSlot || !venue) return;
    
    // Safety check again
    if ((venue.bookingsEnabled ?? true) === false) {
      setLoadError('Οι online κρατήσεις είναι απενεργοποιημένες.');
      return;
    }

    try {
      const { bookingService, userService } = await import('@/lib/firebase-services');
      
      // Parse the selected time to get start time (format is "HH:00")
      const [hours, minutes] = selectedTimeSlot.time.split(':').map(Number);
      
      // Ensure selectedDate is valid
      if (!selectedDate) {
        throw new Error('No date selected');
      }
      
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      // Validate the final datetime
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid start time calculated');
      }
      
      // Calculate end time based on slot duration
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedPitch.slotDuration);
      
      // Validate the end datetime
      if (isNaN(endDateTime.getTime())) {
        throw new Error('Invalid end time calculated');
      }

      // Check if customer already exists with this phone number
      let customerId = '';
      const existingCustomers = await userService.getAll();
      const existingCustomer = existingCustomers.find(customer => 
        customer.phone === formData.phone
      );

      if (existingCustomer) {
        // Customer exists - check if they have bookings for this venue
        const hasVenueBookings = existingCustomer.venueIds && 
          existingCustomer.venueIds.includes(venue?.id || '');
        
        if (!hasVenueBookings) {
          // Customer exists but not for this venue - add this venue to their list
          customerId = existingCustomer.id;
          await userService.addVenueToCustomer(customerId, venue?.id || '');
          console.log('✅ Added venue to existing customer:', customerId);
        } else {
          // Customer exists and has bookings for this venue - use existing ID
          customerId = existingCustomer.id;
          console.log('✅ Using existing customer:', customerId);
        }
      } else {
        // New customer - create customer record
        const newCustomerData = {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          venueIds: [venue?.id || ''], // This is their first venue
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        customerId = await userService.create(newCustomerData as Omit<import('@/types').User, 'id' | 'createdAt' | 'updatedAt'>);
        console.log('✅ New customer created:', customerId);
      }

      const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
        slotId: '', // Will be generated
        pitchId: selectedPitch.id,
        venueId: venue?.id || '',
        userId: customerId, // Use the customer ID we just created/found
        userName: `${formData.firstName} ${formData.lastName}`,
        userEmail: formData.email,
        userPhone: formData.phone,
        startTime: startDateTime,
        endTime: endDateTime,
        price: selectedPitch.pricePerSlot,
        status: 'pending',
        notes: ''
      };

      await bookingService.create(newBooking);
      
      // Send confirmation email
      try {
        await fetch('/api/booking/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            pitchName: selectedPitch.name,
            venueName: venue?.name || '',
            venuePhone: venue?.phone || '',
            venueEmail: venue?.email || '',
            venueAddress: venue?.address || '',
            date: selectedDate.toLocaleDateString('el-GR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: selectedTimeSlot.time,
            price: selectedPitch.pricePerSlot
          })
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the booking if email fails
      }
      
      // Reset form and go back to start
      setFormData({ firstName: '', lastName: '', phone: '', email: '', termsAccepted: false });
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setCurrentStep('pitch');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Η κράτηση δεν ολοκληρώθηκε', 'Παρακαλώ δοκιμάστε ξανά σε λίγο.');
    }
  };

  if (!venue || !selectedPitch) {
    // Still loading
    if (!dataLoaded) {
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6">
          <div className="w-full max-w-3xl">
            {/* Skeleton αντί για spinner: ο χρήστης βλέπει το σχήμα
                της σελίδας που έρχεται, χωρίς layout shift. */}
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-32 bg-zinc-200 rounded mx-auto" />
              <div className="h-10 w-72 max-w-full bg-zinc-200 rounded-lg mx-auto" />
              <div className="h-6 w-48 bg-zinc-100 rounded-full mx-auto mb-8" />
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
                <div className="h-5 w-40 bg-zinc-200 rounded mx-auto" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 bg-zinc-100 rounded-xl" />
                ))}
              </div>
            </div>
            <p className="sr-only" role="status">Φόρτωση διαθεσιμότητας…</p>
          </div>
        </div>
      );
    }
    // Data loaded but venue/pitches not found
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-700" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
            {loadError || 'Δεν βρέθηκε το γήπεδο'}
          </h1>
          <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
            {loadError
              ? 'Παρακαλούμε δοκιμάστε ξανά αργότερα ή επικοινωνήστε απευθείας με το γήπεδο.'
              : `Δεν μπορέσαμε να βρούμε το γήπεδο «${decodeURIComponent(venueName)}». Ελέγξτε τη διεύθυνση και δοκιμάστε ξανά.`}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            Αρχική σελίδα
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/yabalitsalogo.png" alt="Yabalitsa" width={120} height={32} className="h-7 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-2 text-zinc-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="hidden sm:block text-xs font-medium">Ασφαλής κράτηση</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Venue Info */}
        <div className="text-center mb-10">
          <p className="text-2xs font-semibold text-emerald-600 mb-2">Καλώς ήρθατε στο</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight mb-4">{venue.name}</h1>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-zinc-100 shadow-sm">
              <MapPin className="h-3 w-3 text-emerald-500" />
              <span className="text-2xs font-medium text-zinc-500 tracking-tight">{venue.address}</span>
            </div>
          </div>
        </div>

        {/* Booking Card */}
        <div className="bg-white rounded-2xl shadow-e3 border border-border overflow-hidden">
          <div className="p-6 lg:p-8">
            <BookingStepper current={currentStep} onStepClick={goToStep} />
            <AnimatePresence mode="wait">

              {/* Step 1: Pitch */}
              {currentStep === 'pitch' && (
                <motion.div key="pitch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Επιλέξτε Γήπεδο</h2>
                    <p className="text-xs font-medium text-zinc-500 mt-1">Διαλέξτε το γήπεδο που σας ταιριάζει</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {pitches.map((pitch) => (
                      <motion.div
                        key={pitch.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handlePitchSelect(pitch)}
                        className="group relative bg-white rounded-3xl p-6 border border-zinc-100 hover:border-emerald-200 cursor-pointer transition-all hover:bg-emerald-50/30"
                      >
                        <div className="flex items-center gap-6">
                          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <Goal className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-700" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight mb-1">{pitch.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-zinc-50 text-zinc-500 border-zinc-100 text-2xs font-semibold px-2 py-0.5">{pitch.type}</Badge>
                              <span className="text-2xs font-medium text-zinc-500 group-hover:text-emerald-600 transition-colors">{pitch.slotDuration} λεπτά</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-zinc-900 tracking-tighter group-hover:text-emerald-600 transition-colors">€{pitch.pricePerSlot.toFixed(0)}</div>
                            <p className="text-2xs font-semibold text-zinc-500">ανά ώρα</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Date */}
              {currentStep === 'date' && (
                <motion.div key="date" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button onClick={() => goToStep('pitch')} className="group flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      <span className="text-2xs font-semibold">Πίσω στα γήπεδα</span>
                    </button>
                    <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-xl border border-zinc-100">
                      <button onClick={() => handleWeekNavigation('prev')} className="p-2 hover:bg-white rounded-lg transition-all active:scale-90">
                        <ChevronLeft className="w-4 h-4 text-zinc-600" />
                      </button>
                      <div className="px-4 text-2xs font-semibold text-zinc-900 min-w-[140px] text-center">{weekRange}</div>
                      <button onClick={() => handleWeekNavigation('next')} className="p-2 hover:bg-white rounded-lg transition-all active:scale-90">
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Επιλέξτε Ημερομηνία</h2>
                    <p className="text-xs font-medium text-zinc-500 mt-1">Διαλέξτε την ημέρα της κράτησής σας</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pb-4">
                    {weekSchedule.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => day.hasAvailability && handleDateSelect(day.date)}
                        disabled={!day.hasAvailability}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95",
                          !day.hasAvailability ? "bg-zinc-50 border-zinc-50 text-zinc-400 cursor-not-allowed opacity-50" :
                          selectedDate?.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' }) === day.date
                            ? "bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-900/10"
                            : "bg-white border-zinc-50 text-zinc-500 hover:border-emerald-200 hover:text-zinc-900"
                        )}
                      >
                        <span className="text-2xs font-semibold mb-1">{day.dayName.slice(0, 3)}</span>
                        <span className="text-lg font-semibold tracking-tight">{day.dayNumber}</span>
                        <div className={cn("w-1 h-1 rounded-full mt-2", day.hasAvailability ? "bg-emerald-500" : "bg-zinc-200")} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Time Slots */}
              {currentStep === 'slots' && selectedDate && (
                <motion.div key="slots" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <button onClick={() => goToStep('date')} className="group flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-2xs font-semibold">Πίσω στην ημερομηνία</span>
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Επιλέξτε Ώρα</h2>
                    <p className="text-xs font-medium text-zinc-500 mt-1">
                      {selectedDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className="max-w-4xl mx-auto">
                    {(() => {
                      const selectedDay = weekSchedule.find(d => {
                        if (!selectedDate) return false;
                        const dayIndex = weekSchedule.findIndex(day => day.date === d.date);
                        const dayDate = new Date(currentWeek);
                        dayDate.setDate(currentWeek.getDate() + dayIndex);
                        return dayDate.toDateString() === selectedDate.toDateString();
                      });
                      if (!selectedDay || !selectedDay.hasAvailability) {
                        return (
                          <div className="text-center py-12">
                            <p className="text-zinc-500 font-semibold text-sm">Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημερομηνία</p>
                          </div>
                        );
                      }
                      const now = new Date();
                      const isToday = selectedDate && selectedDate.toDateString() === now.toDateString();
                      const filteredSlots = selectedDay.slots.filter(slot => {
                        if (!isToday) return true;
                        const [slotHour] = slot.time.split(':').map(Number);
                        const slotTime = new Date(now);
                        slotTime.setHours(slotHour, 0, 0, 0);
                        const bufferTime = new Date(now);
                        bufferTime.setHours(now.getHours() + 1, 0, 0, 0);
                        return slotTime >= bufferTime;
                      });
                      if (filteredSlots.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <p className="text-zinc-500 font-semibold text-sm">Δεν υπάρχουν διαθέσιμες ώρες για σήμερα</p>
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filteredSlots.map((slot) => (
                            <motion.button
                              key={slot.time}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => slot.available && selectedDate && handleTimeSlotSelect(selectedDate.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' }), slot.time)}
                              disabled={!slot.available}
                              className={cn(
                                "p-4 rounded-2xl border-2 transition-all",
                                slot.available
                                  ? "border-zinc-100 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer"
                                  : "border-red-100 bg-red-50/50 opacity-60 cursor-not-allowed"
                              )}
                            >
                              <div className="text-center">
                                <div className={cn("text-sm font-semibold", slot.available ? "text-zinc-900" : "text-red-400")}>{slot.time}</div>
                                <div className={cn("text-2xs font-semibold mt-1", slot.available ? "text-emerald-600" : "text-red-400")}>
                                  {slot.available ? "Διαθέσιμο" : "Κλεισμένο"}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 'confirmation' && selectedTimeSlot && (
                <motion.div key="confirmation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <button onClick={() => goToStep('slots')} className="group flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-2xs font-semibold">Πίσω στις ώρες</span>
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Επιβεβαίωση Κράτησης</h2>
                    <p className="text-xs font-medium text-zinc-500 mt-1">Συμπληρώστε τα στοιχεία σας για να ολοκληρώσετε</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {/* Summary Card */}
                    <div className="premium-card bg-emerald-600 border-0 rounded-3xl p-6 shadow-xl shadow-emerald-900/10 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircle2 className="h-16 w-16 text-white" />
                      </div>
                      <h3 className="text-2xs font-semibold text-white/60 mb-6 text-center">Σύνοψη κράτησης</h3>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                          <span className="text-2xs font-semibold text-white/60">Γήπεδο</span>
                          <span className="text-xs font-semibold text-white">{selectedPitch.name}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                          <span className="text-2xs font-semibold text-white/60">Ημερομηνία</span>
                          <span className="text-xs font-semibold text-white">{selectedDate?.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                          <span className="text-2xs font-semibold text-white/60">Ώρα</span>
                          <span className="text-xs font-semibold text-white">{selectedTimeSlot.time}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-2xs font-semibold text-emerald-100">Συνολικό ποσό</span>
                          <span className="text-2xl font-bold text-white tracking-tighter">€{selectedPitch.pricePerSlot}</span>
                        </div>
                      </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-xl shadow-emerald-900/5">
                      <h3 className="text-2xs font-semibold text-zinc-500 mb-6">Στοιχεία πελάτη</h3>
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-2xs font-semibold text-zinc-500 ml-1">Όνομα</label>
                            <input type="text" value={formData.firstName} onChange={(e) => handleFormChange('firstName', e.target.value)}
                              className="w-full h-12 px-4 rounded-xl bg-zinc-50 border-none font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-zinc-500"
                              placeholder="Όνομα" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-2xs font-semibold text-zinc-500 ml-1">Επώνυμο</label>
                            <input type="text" value={formData.lastName} onChange={(e) => handleFormChange('lastName', e.target.value)}
                              className="w-full h-12 px-4 rounded-xl bg-zinc-50 border-none font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-zinc-500"
                              placeholder="Επώνυμο" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-2xs font-semibold text-zinc-500 ml-1">Τηλέφωνο</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">+30</span>
                            <input type="tel" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                              className="w-full h-12 pl-12 pr-4 rounded-xl bg-zinc-50 border-none font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                              placeholder="69XXXXXXXX" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-2xs font-semibold text-zinc-500 ml-1">Email</label>
                          <input type="email" value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)}
                            className="w-full h-12 px-4 rounded-xl bg-zinc-50 border-none font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-zinc-500"
                            placeholder="YOUR@EMAIL.COM" />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer group pt-2 px-1">
                          <div className="relative flex items-center justify-center">
                            <input type="checkbox" checked={formData.termsAccepted} onChange={(e) => handleFormChange('termsAccepted', e.target.checked)}
                              className="peer appearance-none w-5 h-5 rounded-lg bg-zinc-100 border-none checked:bg-emerald-500 transition-all cursor-pointer" />
                            <CheckCircle2 className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <span className="text-2xs font-medium text-zinc-500 group-hover:text-zinc-900 transition-colors">
                            Αποδοχή όρων χρήσης και πολιτικής απορρήτου
                          </span>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmBooking}
                      className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs shadow-xl shadow-zinc-900/10 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                    >
                      Επιβεβαίωση κράτησης
                      <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all">
                        <ArrowLeft className="h-3 w-3 rotate-180" />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Επιβεβαίωση Email</h3>
                <p className="text-2xs font-medium text-zinc-500 mt-0.5">{formData.email}</p>
              </div>
              <button onClick={() => { setShowEmailVerification(false); setEmailCode(''); setEmailSent(false); }}
                className="h-8 w-8 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-90">
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {!emailSent && (
              <button onClick={sendEmailVerification} disabled={isSendingEmail}
                className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 mb-4">
                {isSendingEmail ? 'Αποστολή...' : 'Αποστολή κωδικού'}
              </button>
            )}

            {emailSent && (
              <div className="space-y-6">
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      data-index={index}
                      value={emailCode[index] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value && /^\d$/.test(value)) {
                          const newCode = emailCode.split('');
                          newCode[index] = value;
                          setEmailCode(newCode.join(''));
                          if (index < 5) {
                            setTimeout(() => {
                              const next = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                              if (next) next.focus();
                            }, 10);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          if (!emailCode[index] && index > 0) {
                            setTimeout(() => {
                              const prev = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                              if (prev) prev.focus();
                            }, 10);
                          } else if (emailCode[index]) {
                            const newCode = emailCode.split('');
                            newCode[index] = '';
                            setEmailCode(newCode.join(''));
                          }
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (digits.length === 6) {
                          setEmailCode(digits);
                          setTimeout(() => {
                            const last = document.querySelector(`input[data-index="5"]`) as HTMLInputElement;
                            if (last) last.focus();
                          }, 10);
                        }
                      }}
                      className={cn(
                        "w-11 h-14 text-center text-xl font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                        emailCode[index] ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-900"
                      )}
                    />
                  ))}
                </div>
                <p className="text-2xs font-medium text-zinc-500 text-center">Εισάγετε τον 6ψήφιο κωδικό του email σας</p>
                <button onClick={verifyEmailCode} disabled={!emailCode || emailCode.length !== 6 || isVerifyingEmail}
                  className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-40">
                  {isVerifyingEmail ? 'Επιβεβαίωση...' : 'Επιβεβαίωση κωδικού'}
                </button>
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-2xs font-medium text-zinc-500">Επαναποστολή σε {countdown}δ.</p>
                  ) : (
                    <button onClick={sendEmailVerification} disabled={!canResend}
                      className="flex items-center justify-center gap-2 text-2xs font-semibold text-emerald-600 mx-auto disabled:opacity-50">
                      <RotateCcw className="w-3 h-3" />
                      Επαναποστολή EMAIL
                    </button>
                  )}
                  {emailError && <p className="text-xs font-medium text-red-500 mt-3">{emailError}</p>}
                </div>
              </div>
            )}
            <p className="text-2xs font-medium text-zinc-500 text-center mt-6">Η κράτηση ολοκληρώνεται μόνο μετά την επιβεβαίωση.</p>
          </motion.div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessPopup && successBookingData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => { setShowSuccessPopup(false); setSuccessBookingData(null); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">Κράτηση Επιβεβαιώθηκε!</h2>
            <p className="text-xs font-medium text-zinc-500 mb-8">Θα λάβετε επιβεβαίωση στο email σας</p>

            <div className="bg-zinc-50 rounded-2xl p-6 mb-8 text-left space-y-3">
              {[
                { label: '👤 Όνομα', value: successBookingData.userName },
                { label: '⚽ Γήπεδο', value: successBookingData.pitchName },
                { label: '📅 Ημερομηνία', value: successBookingData.date },
                { label: '🕐 Ώρα', value: successBookingData.time },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-2xs font-semibold text-zinc-500">{label}</span>
                  <span className="text-2xs font-semibold text-zinc-900 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-zinc-100 pt-3">
                <span className="text-2xs font-semibold text-emerald-600">💰 Τιμή</span>
                <span className="font-semibold text-emerald-600 text-lg tabular-nums">€{successBookingData.price}</span>
              </div>
            </div>
            <button
              onClick={() => { setShowSuccessPopup(false); setSuccessBookingData(null); }}
              className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-semibold text-xs hover:bg-black transition-all active:scale-95"
            >
              Τέλεια! 🎯
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
