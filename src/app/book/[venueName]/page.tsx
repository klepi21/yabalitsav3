"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Phone, Mail, Calendar, Clock, Users, Star, ArrowLeft, X, RotateCcw } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, RECAPTCHA_SITE_KEY } from '@/lib/firebase';

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

export default function VenueBookingPage({ params }: { params: Promise<{ venueName: string }> }) {
  const { venueName } = use(params);
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [currentStep, setCurrentStep] = useState<'pitch' | 'date' | 'slots' | 'confirmation'>('pitch');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; time: string } | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    termsAccepted: false
  });

  // SMS Validation states
  const [showSmsValidation, setShowSmsValidation] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [smsCode, setSmsCode] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  
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
        const foundVenue = allVenues.find(v => 
          v.name && v.name.toLowerCase().replace(/\s+/g, '') === venueName.toLowerCase().replace(/\s+/g, '')
        );

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
          const pitchesData = await pitchService.getByVenue(foundVenue.id);
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
          }
        }
      } catch (error) {
        console.error('Error loading venue data:', error);
        console.error('venueName:', venueName);
        // Fallback to mock data if there's an error
        const fallbackVenue: Venue = {
          id: '1',
          name: venueName ? decodeURIComponent(venueName) : 'Άγνωστο Venue',
          address: 'Entanti Papagewrgiou 123, Thessaloniki',
          phone: '2310565657',
          email: 'info@leontes.gr',
          imageUrl: '/yaba.png',
          rating: 4.8,
          reviewCount: 127
        };

        const fallbackPitches: Pitch[] = [
          {
            id: '1',
            name: 'Megalo (8×8)',
            type: 'football',
            pricePerSlot: 72,
            slotDuration: 60,
            defaultOpeningHours: {
              monday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              tuesday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              wednesday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              thursday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              friday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              saturday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              sunday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] }
            }
          },
          {
            id: '2',
            name: 'Mikro (5×5)',
            type: 'football',
            pricePerSlot: 70,
            slotDuration: 60,
            defaultOpeningHours: {
              monday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              tuesday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              wednesday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              thursday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              friday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              saturday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] },
              sunday: { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] }
            }
          }
        ];

        setVenue(fallbackVenue);
        setPitches(fallbackPitches);
        setSelectedPitch(fallbackPitches[0]);
      }
    };

    loadVenueData();
  }, [venueName]);

  // Initialize reCAPTCHA when SMS popup is shown
  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    
    if (!showSmsValidation) return;
    
    // Only initialize if we don't have a verifier yet
    if (recaptchaVerifier) return;
    
    const initRecaptcha = async () => {
      try {
        // Wait for the popup to render and button to exist
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if container exists
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          console.log('reCAPTCHA container not found');
          return;
        }
        
        // Check if auth is properly initialized
        if (!auth) {
          console.log('Auth not initialized');
          return;
        }
        
        console.log('Initializing reCAPTCHA with:', {
          auth: !!auth,
          container: !!container,
          siteKey: RECAPTCHA_SITE_KEY,
          containerId: 'recaptcha-container'
        });
        
        // Try with minimal configuration first
        try {
          verifier = new RecaptchaVerifier(auth, container, {
            'sitekey': RECAPTCHA_SITE_KEY
          });
        } catch (firstError) {
          console.log('First attempt failed, trying without sitekey:', firstError);
          // Fallback: try without sitekey
          verifier = new RecaptchaVerifier(auth, container);
        }
        
        console.log('RecaptchaVerifier created successfully');
        
        // Pre-render the reCAPTCHA as suggested in docs
        await verifier.render();
        console.log('reCAPTCHA rendered successfully');
        setRecaptchaVerifier(verifier);
        
      } catch (error: any) {
        console.error('reCAPTCHA initialization error:', error);
        console.error('Error details:', {
          name: error?.name,
          message: error?.message,
          code: error?.code,
          stack: error?.stack
        });
        setRecaptchaVerifier(null);
      }
    };
    
    // Initialize reCAPTCHA
    initRecaptcha();
    
    // Cleanup function
    return () => {
      if (verifier) {
        try {
          verifier.clear();
        } catch (error) {
          // Silent cleanup error
        }
      }
    };
  }, [showSmsValidation, auth]); // Include auth in dependencies

  // Reset reCAPTCHA function
  const resetRecaptcha = () => {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (error) {
        console.error('Error clearing reCAPTCHA:', error);
      }
    }
    setRecaptchaVerifier(null);
    // Force reinitialization
    setTimeout(() => {
      if (showSmsValidation) {
        setRecaptchaVerifier(null);
      }
    }, 100);
  };

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
    const [day, month] = dateStr.split(' ');
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
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.termsAccepted) {
      alert('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία και αποδεχτείτε τους όρους χρήσης.');
      return;
    }

    // Validate Greek phone number (should be 10 digits starting with 6)
    if (!/^6\d{9}$/.test(formData.phone)) {
      alert('Παρακαλώ εισάγετε έναν έγκυρο ελληνικό αριθμό κινητού (10 ψηφία που ξεκινούν από 6).');
      return;
    }

    // Show SMS validation popup
    setShowSmsValidation(true);
  };

  const goToStep = (step: 'pitch' | 'date' | 'slots' | 'confirmation') => { 
    setCurrentStep(step);
  };



  // Countdown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  // Send SMS verification
  const sendSmsVerification = async () => {
    if (!recaptchaVerifier) {
      alert('Παρακαλώ περιμένετε να φορτώσει το reCAPTCHA ή δοκιμάστε ξανά.');
      return;
    }

    if (!formData.phone) {
      alert('Παρακαλώ εισάγετε το τηλέφωνο σας.');
      return;
    }

    try {
      setIsSendingSms(true);
      
      // Format phone number for international format - always add +30 for Greek numbers
      const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+30${formData.phone}`;
      
      // Use the reCAPTCHA verifier (invisible reCAPTCHA handles execution automatically)
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      
      setVerificationId(confirmationResult.verificationId);
      
      // Start countdown (1 minute)
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      console.error('SMS verification error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-phone-number') {
        alert('Λάθος αριθμός τηλεφώνου. Παρακαλώ ελέγξτε τον αριθμό σας.');
      } else if (error.code === 'auth/too-many-requests') {
        alert('Πάρα πολλές αιτήσεις. Παρακαλώ περιμένετε λίγο πριν δοκιμάσετε ξανά.');
      } else if (error.code === 'auth/quota-exceeded') {
        alert('Υπέρβαση ορίου SMS. Παρακαλώ δοκιμάστε αργότερα.');
      } else if (error.code === 'auth/invalid-app-credential') {
        alert('Το reCAPTCHA δεν είναι έγκυρο. Παρακαλώ δοκιμάστε ξανά.');
        // Reset reCAPTCHA and try to reinitialize
        if (recaptchaVerifier) {
          try {
            recaptchaVerifier.clear();
          } catch (clearError) {
            console.error('Error clearing reCAPTCHA:', clearError);
          }
        }
        setRecaptchaVerifier(null);
        // Try to reinitialize after a short delay
        setTimeout(() => {
          if (showSmsValidation) {
            // Force reCAPTCHA reinitialization
            setRecaptchaVerifier(null);
          }
        }, 1000);
      } else if (error.code === 'auth/recaptcha-token-expired') {
        alert('Το reCAPTCHA έληξε. Παρακαλώ δοκιμάστε ξανά.');
        setRecaptchaVerifier(null);
      } else if (error.code === 'auth/recaptcha-not-rendered') {
        alert('Το reCAPTCHA δεν φορτώθηκε σωστά. Παρακαλώ δοκιμάστε ξανά.');
        setRecaptchaVerifier(null);
      } else {
        alert(`Σφάλμα στην αποστολή SMS: ${error.code || error.message}. Παρακαλώ δοκιμάστε ξανά.`);
      }
    } finally {
      setIsSendingSms(false);
    }
  };

  // Verify SMS code
  const verifySmsCode = async () => {
    if (!smsCode || !verificationId) return;

    try {
      setIsVerifyingCode(true);
      
      const credential = PhoneAuthProvider.credential(verificationId, smsCode);
      await signInWithCredential(auth, credential);
      
      // SMS verified successfully - create booking
      await createBooking();
      
      // Close SMS validation popup
      setShowSmsValidation(false);
      setSmsCode('');
      setVerificationId('');
      
      // Don't reset reCAPTCHA - keep it for potential reuse
      // Only clear it when the popup is actually closed
      
      // Set success data for popup
      if (selectedPitch && selectedDate && selectedTimeSlot) {
        setSuccessBookingData({
          userName: `${formData.firstName} ${formData.lastName}`,
          userPhone: `+30 ${formData.phone}`,
          pitchName: selectedPitch.name,
          date: selectedDate.toLocaleDateString('el-GR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: selectedTimeSlot.time,
          price: selectedPitch.pricePerSlot
        });
        
        // Show success popup
        setShowSuccessPopup(true);
      }
      
    } catch (error) {
      console.error('Error verifying SMS:', error);
      alert('Λάθος κωδικός SMS. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Create booking in database
  const createBooking = async () => {
    if (!selectedPitch || !selectedDate || !selectedTimeSlot) return;

    try {
      const { bookingService } = await import('@/lib/firebase-services');
      
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

      const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
        slotId: '', // Will be generated
        pitchId: selectedPitch.id,
        venueId: venue?.id || '',
        userId: '', // Will be generated
        userName: `${formData.firstName} ${formData.lastName}`,
        userEmail: '',
        userPhone: formData.phone,
        startTime: startDateTime,
        endTime: endDateTime,
        price: selectedPitch.pricePerSlot,
        status: 'pending',
        notes: ''
      };

      await bookingService.create(newBooking);
      
      // Reset form and go back to start
      setFormData({ firstName: '', lastName: '', phone: '', termsAccepted: false });
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setCurrentStep('pitch');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Σφάλμα στη δημιουργία κράτησης. Παρακαλώ δοκιμάστε ξανά.');
    }
  };

  if (!venue || !selectedPitch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img src="/yabalitsalogo.png" alt="Yabalitsa" className="h-8 w-auto" />
              <h1 className="text-lg font-semibold text-gray-900">{venue.name}</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">{venue.address}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{venue.phone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress Steps */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
            <div className="flex items-center justify-center space-x-8">
              {[
                { step: 'pitch', label: 'Γήπεδο', icon: '⚽' },
                { step: 'date', label: 'Ημερομηνία', icon: '📅' },
                { step: 'slots', label: 'Ώρα', icon: '🕐' },
                { step: 'confirmation', label: 'Επιβεβαίωση', icon: '✅' }
              ].map(({ step, label, icon }) => (
                <div key={step} className="flex items-center space-x-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep === step 
                      ? 'bg-white text-emerald-600' 
                      : 'bg-emerald-500/30 text-white'
                    }
                  `}>
                    {icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    currentStep === step ? 'text-white' : 'text-emerald-100'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Pitch Selection */}
              {currentStep === 'pitch' && (
                <motion.div
                  key="pitch"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Επιλέξτε Γήπεδο
                    </h2>
                    <p className="text-gray-600">Διαλέξτε το γήπεδο που θέλετε να κλείσετε</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pitches.map((pitch) => (
                      <motion.div
                        key={pitch.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePitchSelect(pitch)}
                        className="bg-gray-50 rounded-xl p-6 border-2 border-transparent hover:border-emerald-300 cursor-pointer transition-all"
                      >
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">⚽</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{pitch.name}</h3>
                          <p className="text-sm text-gray-600">{pitch.type}</p>
                          <div className="text-2xl font-bold text-emerald-600">
                            €{pitch.pricePerSlot}
                          </div>
                          <p className="text-xs text-gray-500">ανά ώρα</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Date Selection */}
              {currentStep === 'date' && (
                <motion.div
                  key="date"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Back Button */}
                  <div className="flex justify-start">
                    <button
                      onClick={() => goToStep('pitch')}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Πίσω στο Γήπεδο</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Επιλέξτε Ημερομηνία
                    </h2>
                    <p className="text-gray-600">Διαλέξτε την ημερομηνία για την κράτησή σας</p>
                  </div>

                  {/* Week Navigation */}
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    <button
                      onClick={() => handleWeekNavigation('prev')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900">{weekRange}</h3>
                    <button
                      onClick={() => handleWeekNavigation('next')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>

                  {/* Day Grid */}
                  <div className="grid grid-cols-7 gap-2 sm:gap-3 max-w-2xl mx-auto">
                    {weekSchedule.map((day) => (
                      <motion.button
                        key={day.date}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => day.hasAvailability && handleDateSelect(day.date)}
                        disabled={!day.hasAvailability}
                        className={`
                          p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                          ${day.hasAvailability
                            ? 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
                            : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="text-center space-y-1 sm:space-y-2">
                          <div className="text-xs sm:text-sm font-medium text-gray-500">
                            {day.dayName === 'Σήμερα' ? 'Σήμερα' : day.dayName.slice(0, 3)}
                          </div>
                          <div className="text-lg sm:text-xl font-bold text-gray-900">
                            {day.dayNumber}
                          </div>
                          {day.hasAvailability && (
                            <div className="text-xs text-emerald-600 hidden sm:block">
                              {day.slots.length} ώρες
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Time Slots */}
              {currentStep === 'slots' && selectedDate && (
                <motion.div
                  key="slots"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Back Button */}
                  <div className="flex justify-start">
                    <button
                      onClick={() => goToStep('date')}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Πίσω στην Ημερομηνία</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Επιλέξτε Ώρα
                    </h2>
                    <p className="text-gray-600">
                      Διαθέσιμες ώρες για {selectedDate ? selectedDate.toLocaleDateString('el-GR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : ''}
                    </p>
                  </div>

                  <div className="max-w-4xl mx-auto">
                    {(() => {
                      const selectedDay = weekSchedule.find(d => {
                        if (!selectedDate) return false;
                        // Find the day by its position in the week (0-6)
                        const dayIndex = weekSchedule.findIndex(day => day.date === d.date);
                        const dayDate = new Date(currentWeek);
                        dayDate.setDate(currentWeek.getDate() + dayIndex);
                        
                        return dayDate.toDateString() === selectedDate.toDateString();
                      });
                      if (!selectedDay || !selectedDay.hasAvailability) {
                        return (
                          <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">
                              Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημερομηνία
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {selectedDay.slots.map((slot) => (
                            <motion.button
                              key={slot.time}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => slot.available && selectedDate && handleTimeSlotSelect(selectedDate.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' }), slot.time)}
                              disabled={!slot.available}
                              className={`
                                p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                                ${slot.available
                                  ? 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 text-gray-900 cursor-pointer'
                                  : 'border-red-200 bg-red-50 text-red-600 cursor-not-allowed opacity-80'
                                }
                              `}
                            >
                                                          <div className="text-center">
                              <div className="text-sm font-medium">{slot.time}</div>
                              {!slot.available && slot.conflictingBookings && slot.conflictingBookings.length > 0 && (
                                <div className="text-xs text-red-500 mt-1">
                                  Κλεισμένο
                                </div>
                              )}
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
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Back Button */}
                  <div className="flex justify-start">
                    <button
                      onClick={() => goToStep('slots')}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Πίσω στις Ώρες</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Επιβεβαίωση Κράτησης
                    </h2>
                    <p className="text-gray-600">Συμπληρώστε τα στοιχεία σας για να ολοκληρώσετε την κράτηση</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {/* Left Column - Booking Summary */}
                    <div className="space-y-6">
                      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                          Σύνοψη Κράτησης
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800 font-medium">Γήπεδο:</span>
                            <span className="font-semibold text-gray-900">{selectedPitch.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800 font-medium">Ημερομηνία:</span>
                            <span className="font-semibold text-gray-900">{selectedDate ? selectedDate.toLocaleDateString('el-GR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : ''}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800 font-medium">Ώρα:</span>
                            <span className="font-semibold text-gray-900">{selectedTimeSlot.time}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800 font-medium">Τιμή:</span>
                            <span className="text-xl font-bold text-emerald-600">
                              €{selectedPitch.pricePerSlot}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-center space-x-4">
                          <img
                            src={venue.imageUrl}
                            alt={venue.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{venue.name}</h4>
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{venue.rating}</span>
                              <span className="text-gray-400">({venue.reviewCount} αξιολογήσεις)</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                              <MapPin className="w-4 h-4" />
                              <span>{venue.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Booking Form */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Στοιχεία Κράτησης
                        </h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Όνομα *
                              </label>
                              <input
                                type="text"
                                placeholder="Εισάγετε το όνομά σας"
                                value={formData.firstName}
                                onChange={(e) => handleFormChange('firstName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Επώνυμο *
                              </label>
                              <input
                                type="text"
                                placeholder="Εισάγετε το επώνυμό σας"
                                value={formData.lastName}
                                onChange={(e) => handleFormChange('lastName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Τηλέφωνο *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-lg font-medium">+30</span>
                              </div>
                              <input
                                type="tel"
                                placeholder="6973625633"
                                value={formData.phone}
                                onChange={(e) => {
                                  // Only allow digits and limit to 10 characters
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  handleFormChange('phone', value);
                                }}
                                className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                required
                                maxLength={10}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Εισάγετε τον αριθμό χωρίς το +30 (π.χ. 6973625633)
                            </p>
                          </div>
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              id="terms"
                              checked={formData.termsAccepted}
                              onChange={(e) => handleFormChange('termsAccepted', e.target.checked)}
                              className="mt-1 h-5 w-5 text-emerald-500 focus:ring-emerald-500 border-gray-300 rounded"
                              required
                            />
                            <label htmlFor="terms" className="text-sm text-gray-700">
                              Συμφωνώ με τους{' '}
                              <span className="text-emerald-600 underline cursor-pointer">
                                όρους χρήσης
                              </span>{' '}
                              *
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={() => goToStep('slots')}
                          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          Πίσω
                        </button>
                        <button
                          onClick={handleConfirmBooking}
                          className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>Επιβεβαίωση Κράτησης</span>
                          <span>✅</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* SMS Validation Popup */}
      {showSmsValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση Τηλεφώνου</h3>
              <button
                onClick={() => {
                  setShowSmsValidation(false);
                  // Don't reset reCAPTCHA - keep it for reuse
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Phone Number Display */}
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-2">Θα σας στείλουμε SMS στο:</p>
              <p className="text-lg font-semibold text-gray-900">+30 {formData.phone}</p>
            </div>

            {/* reCAPTCHA Container */}
            <div id="recaptcha-container" className="mb-6"></div>
            
            {/* Send SMS Button */}
            {!verificationId && (
              <button
                onClick={sendSmsVerification}
                disabled={isSendingSms || !recaptchaVerifier}
                className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {isSendingSms ? 'Αποστολή...' : !recaptchaVerifier ? 'Φόρτωση...' : 'Αποστολή SMS'}
              </button>
            )}

            {/* SMS Code Input */}
            {verificationId && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Κωδικός SMS
                  </label>
                  
                  {/* 6-Digit Code Input */}
                  <div className="flex justify-center space-x-2 mb-4">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        data-index={index}
                        value={smsCode[index] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value && /^\d$/.test(value)) { // Only allow digits
                            const newCode = smsCode.split('');
                            newCode[index] = value;
                            const finalCode = newCode.join('');
                            setSmsCode(finalCode);
                            
                            // Auto-focus next input
                            if (index < 5) {
                              setTimeout(() => {
                                const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                                if (nextInput) nextInput.focus();
                              }, 10);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace
                          if (e.key === 'Backspace') {
                            if (!smsCode[index] && index > 0) {
                              // If current input is empty, go to previous
                              setTimeout(() => {
                                const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                                if (prevInput) prevInput.focus();
                              }, 10);
                            } else if (smsCode[index]) {
                              // If current input has value, clear it first
                              const newCode = smsCode.split('');
                              newCode[index] = '';
                              setSmsCode(newCode.join(''));
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedData = e.clipboardData.getData('text');
                          const digits = pastedData.replace(/\D/g, '').slice(0, 6);
                          
                          if (digits.length === 6) {
                            setSmsCode(digits);
                            // Focus last input
                            setTimeout(() => {
                              const lastInput = document.querySelector(`input[data-index="5"]`) as HTMLInputElement;
                              if (lastInput) lastInput.focus();
                            }, 10);
                          }
                        }}
                        className={`
                          w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all
                          ${smsCode[index] 
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                            : 'border-gray-300 bg-white text-gray-900'
                          }
                          ${index === smsCode.length ? 'ring-2 ring-emerald-500' : ''}
                        `}
                        placeholder=""
                      />
                    ))}
                  </div>
                  
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Εισάγετε τον 6ψήφιο κωδικό που λάβατε στο SMS
                  </p>
                </div>

                {/* Verify Button */}
                <button
                  onClick={verifySmsCode}
                  disabled={!smsCode || smsCode.length !== 6 || isVerifyingCode}
                  className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {isVerifyingCode ? 'Επιβεβαίωση...' : 'Επιβεβαίωση Κωδικού'}
                </button>

                {/* Resend SMS */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-500">
                      Επαναποστολή σε {countdown} δευτερόλεπτα
                    </p>
                  ) : (
                    <button
                      onClick={sendSmsVerification}
                      disabled={!canResend}
                      className="flex items-center justify-center space-x-2 text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Επαναποστολή SMS</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 text-center mt-4">
              Η κράτηση θα ολοκληρωθεί μόνο μετά την επιβεβαίωση του τηλεφώνου σας.
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && successBookingData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSuccessPopup(false);
            setSuccessBookingData(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎉</span>
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Η κράτηση ολοκληρώθηκε!
            </h2>
            <p className="text-gray-600 mb-8">
              Θα λάβετε επιβεβαίωση στο τηλέφωνό σας
            </p>

            {/* Booking Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Λεπτομέρειες Κράτησης
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">👤 Όνομα:</span>
                  <span className="font-medium text-gray-900">{successBookingData.userName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">📱 Τηλέφωνο:</span>
                  <span className="font-medium text-gray-900">{successBookingData.userPhone}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">⚽ Γήπεδο:</span>
                  <span className="font-medium text-gray-900">{successBookingData.pitchName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">📅 Ημερομηνία:</span>
                  <span className="font-medium text-gray-900">{successBookingData.date}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">🕐 Ώρα:</span>
                  <span className="font-medium text-gray-900">{successBookingData.time}</span>
                </div>
                
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-600">💰 Τιμή:</span>
                  <span className="font-bold text-green-600 text-lg">€{successBookingData.price}</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowSuccessPopup(false);
                setSuccessBookingData(null);
              }}
              className="w-full bg-emerald-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              Τέλεια! 🎯
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}