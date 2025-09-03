"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Phone, Mail } from "lucide-react";
import { cn } from "../../lib/utils";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  slots: TimeSlot[];
  hasAvailability: boolean;
}

interface Coach {
  name: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
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

interface CoachSchedulingProps {
  coach?: Coach;
  locations?: string[];
  onLocationChange?: (location: string) => void;
  onTimeSlotSelect?: (day: string, time: string) => void;
  onWeekChange?: (direction: "prev" | "next") => void;
  enableAnimations?: boolean;
  className?: string;
  selectedPitchPrice?: number;
  selectedPitch?: Pitch;
}

const defaultCoach: Coach = {
  name: "Michael Baumgardner",
  phone: "+30 123 456 789",
  email: "info@venue.com",
  rating: 5.0,
  reviewCount: 7,
  imageUrl: "https://images.unsplash.com/photo-1660463532854-f887f2a6c674"
};

// Generate current week schedule with real slots from pitch data
const generateCurrentWeekSchedule = (selectedPitch?: Pitch): DaySchedule[] => {
  const today = new Date();
  const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  const weekSchedule: DaySchedule[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const isToday = i === 0;
    const dayName = isToday ? 'Σήμερα' : dayNames[date.getDay()];
    const dateStr = date.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' });
    const dayKey = dayKeys[date.getDay()];
    
    // Generate time slots based on pitch opening hours
    const slots: TimeSlot[] = [];
    let hasAvailability = false;
    
    if (selectedPitch && selectedPitch.defaultOpeningHours[dayKey]) {
      const daySchedule = selectedPitch.defaultOpeningHours[dayKey];
      
      if (daySchedule.isOpen && daySchedule.slots && daySchedule.slots.length > 0) {
        hasAvailability = true;
        
        // Generate slots for each opening time range
        daySchedule.slots.forEach(openingSlot => {
          const startTime = new Date("2000-01-01T" + openingSlot.start);
          const endTime = new Date("2000-01-01T" + openingSlot.end);
          
          let currentTime = new Date(startTime);
          
          while (currentTime < endTime) {
            const slotStart = currentTime.toTimeString().slice(0, 5);
            const slotEnd = new Date(currentTime.getTime() + (selectedPitch.slotDuration || 60) * 60000);
            const slotEndTime = slotEnd.toTimeString().slice(0, 5);
            
            if (slotEnd <= endTime) {
              slots.push({ 
                time: `${slotStart} - ${slotEndTime}`, 
                available: true 
              });
            }
            
            currentTime.setMinutes(currentTime.getMinutes() + (selectedPitch.slotDuration || 60));
          }
        });
      }
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

export function CoachSchedulingCard({
  coach = defaultCoach,
  locations = [],
  onLocationChange,
  onTimeSlotSelect,
  onWeekChange,
  enableAnimations = true,
  className,
  selectedPitchPrice = 75,
  selectedPitch
}: CoachSchedulingProps) {
  const [selectedLocation, setSelectedLocation] = useState(locations[0] || '');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showConfirmationView, setShowConfirmationView] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{day: string, time: string, dayName: string} | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate week schedule based on selected pitch
  const weekSchedule = generateCurrentWeekSchedule(selectedPitch);

  // Generate week range string
  const weekRange = (() => {
    const start = new Date(currentWeek);
    start.setDate(currentWeek.getDate() - currentWeek.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}`;
  })();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLocationDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    setIsLocationDropdownOpen(false);
    onLocationChange?.(location);
  };

  const handleTimeSlotClick = (day: string, time: string) => {
    const dayInfo = weekSchedule.find(d => d.date === day);
    setSelectedTimeSlot({
      day,
      time,
      dayName: dayInfo?.dayName || day
    });
    setShowConfirmationView(true);
    onTimeSlotSelect?.(day, time);
  };

  const handleBackToMain = () => {
    setShowConfirmationView(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmBooking = () => {
    // Handle booking confirmation logic here
    setShowConfirmationView(false);
    setSelectedTimeSlot(null);
  };

  const handleWeekNavigation = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek);
    if (direction === "prev") {
      newWeek.setDate(currentWeek.getDate() - 7);
    } else {
      newWeek.setDate(currentWeek.getDate() + 7);
    }
    setCurrentWeek(newWeek);
    onWeekChange?.(direction);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -25,
      scale: 0.95,
      filter: "blur(4px)"
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      },
    },
  };

  const timeSlotVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      }
    }
  };

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-w-2xl relative",
        className
      )}
    >
      <div className="relative h-auto">
        {/* Main Content */}
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "-20px" : "0px",
            opacity: showConfirmationView ? 0.3 : 1,
            scale: showConfirmationView ? 0.95 : 1
          }}
          transition={{ 
            type: "spring" as const, 
            stiffness: 300, 
            damping: 30,
            mass: 0.8
          }}
          className="w-full"
        >
      {/* Coach Profile Header */}
      <motion.div 
        variants={shouldAnimate ? itemVariants : {}}
        className="p-6 pb-6"
      >
        <div className="flex items-start justify-between gap-6">
          {/* Left Side - Profile Image */}
          <motion.div
            whileHover={shouldAnimate ? { 
              scale: 1.05,
              transition: { type: "spring" as const, stiffness: 400, damping: 25 }
            } : {}}
            className="flex-shrink-0"
          >
            <img
              src={coach.imageUrl}
              alt={coach.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          </motion.div>

          {/* Center - Coach Info */}
          <div className="flex-1 min-w-0 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {coach.name}
            </h2>
            
            {/* Contact Details Row */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{coach.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{coach.email}</span>
              </div>
            </div>
          </div>

          {/* Right Side - Pricing */}
          <motion.div
            initial={shouldAnimate ? { 
              opacity: 0, 
              scale: 0.8,
              x: 20,
              filter: "blur(4px)"
            } : {}}
            animate={shouldAnimate ? {
              opacity: 1,
              scale: 1,
              x: 0,
              filter: "blur(0px)"
            } : {}}
                          transition={shouldAnimate ? {
                type: "spring" as const,
                stiffness: 400,
                damping: 25,
                delay: 0.3,
                mass: 0.6
              } : {}}
            className="text-right flex-shrink-0"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ανά Κράτηση</p>
            <motion.p 
              className="text-2xl font-bold text-emerald-500"
              initial={shouldAnimate ? { scale: 0.5 } : {}}
              animate={shouldAnimate ? { scale: 1 } : {}}
              transition={shouldAnimate ? {
                type: "spring" as const,
                stiffness: 500,
                damping: 20,
                delay: 0.5
              } : {}}
            >
              €{selectedPitchPrice}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>

      {/* Location Selector */}
      <motion.div 
        variants={shouldAnimate ? itemVariants : {}}
        className="px-6 pb-4 relative z-50"
        style={{ overflow: 'visible' }}
      >
        <label className="block text-sm text-gray-600 mb-2">
          Επιλογή Γηπέδου
        </label>
        <div className="relative z-50" ref={dropdownRef}>
          <motion.button
            whileHover={shouldAnimate ? {
              scale: 1.01,
              transition: { type: "spring" as const, stiffness: 400, damping: 25 }
            } : {}}
            whileTap={shouldAnimate ? { scale: 0.99 } : {}}
            onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
            aria-expanded={isLocationDropdownOpen}
            aria-haspopup="listbox"
            className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <span className="text-gray-900">{selectedLocation || 'Επιλέξτε γήπεδο'}</span>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-500 transition-transform",
              isLocationDropdownOpen && "rotate-180"
            )} />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isLocationDropdownOpen && (
              <motion.div
                initial={shouldAnimate ? { opacity: 0, y: -10, scale: 0.95 } : {}}
                animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : {}}
                exit={shouldAnimate ? { opacity: 0, y: -10, scale: 0.95 } : {}}
                transition={shouldAnimate ? { type: "spring" as const, stiffness: 400, damping: 25 } : {}}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden"
                role="listbox"
              >
                {locations.map((location, index) => (
                  <motion.button
                    key={location}
                    initial={shouldAnimate ? { opacity: 0, x: -10 } : {}}
                    animate={shouldAnimate ? { opacity: 1, x: 0 } : {}}
                    transition={shouldAnimate ? { delay: index * 0.05 } : {}}
                    whileHover={shouldAnimate ? {
                      backgroundColor: "rgb(243 244 246)",
                      transition: { duration: 0.15 }
                    } : {}}
                    onClick={() => handleLocationChange(location)}
                    role="option"
                    aria-selected={location === selectedLocation}
                    className="w-full text-left p-3 hover:bg-gray-100 transition-colors text-gray-900"
                  >
                    {location}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Separator */}
      <motion.div 
        variants={shouldAnimate ? itemVariants : {}}
        className="mx-6 border-t border-gray-200"
      />

      {/* Week Navigation */}
      <motion.div 
        variants={shouldAnimate ? itemVariants : {}}
        className="p-6 pb-4"
      >
        <div className="flex items-center justify-between">
                     <motion.button
             whileHover={shouldAnimate ? {
               scale: 1.05,
               transition: { type: "spring" as const, stiffness: 400, damping: 25 }
             } : {}}
             whileTap={shouldAnimate ? { scale: 0.95 } : {}}
             onClick={() => handleWeekNavigation("prev")}
             aria-label="Previous week"
             className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
           >
             <ChevronLeft className="w-5 h-5 text-gray-500" />
           </motion.button>

          <h3 className="font-semibold text-gray-900">
            {weekRange}
          </h3>

                     <motion.button
             whileHover={shouldAnimate ? {
               scale: 1.05,
               transition: { type: "spring" as const, stiffness: 400, damping: 25 }
             } : {}}
             whileTap={shouldAnimate ? { scale: 0.95 } : {}}
             onClick={() => handleWeekNavigation("next")}
             aria-label="Next week"
             className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
           >
             <ChevronRight className="w-5 h-5 text-gray-500" />
           </motion.button>
        </div>
      </motion.div>

      {/* Daily Schedule */}
      <motion.div 
        variants={shouldAnimate ? itemVariants : {}}
        className="px-6 pb-6 space-y-4"
      >
        {weekSchedule.map((day) => (
          <motion.div
            key={day.date}
            variants={shouldAnimate ? itemVariants : {}}
            className="space-y-3"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {day.dayName}, {day.date}
                </h4>
              </div>
              {!day.hasAvailability && (
                <span className="text-sm text-gray-500">
                  Δεν υπάρχουν διαθέσιμες ώρες
                </span>
              )}
            </div>

            {/* Time Slots */}
            {day.hasAvailability && (
              <motion.div 
                variants={shouldAnimate ? containerVariants : {}}
                className="flex flex-wrap gap-2"
              >
                {day.slots.map((slot) => (
                                     <motion.button
                     key={`${day.date}-${slot.time}`}
                     variants={shouldAnimate ? timeSlotVariants : {}}
                     whileHover={shouldAnimate && slot.available ? {
                       scale: 1.05,
                       y: -2,
                       transition: { type: "spring" as const, stiffness: 400, damping: 25 }
                     } : {}}
                     whileTap={shouldAnimate && slot.available ? { scale: 0.98 } : {}}
                     onClick={() => slot.available && handleTimeSlotClick(day.date, slot.time)}
                     disabled={!slot.available}
                     aria-label={`${slot.available ? 'Book' : 'Unavailable'} time slot at ${slot.time} on ${day.dayName}, ${day.date}`}
                     className={cn(
                       "px-3 py-1.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                       slot.available
                         ? "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900 cursor-pointer"
                         : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                     )}
                   >
                     {slot.time}
                   </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Actions */}
      <motion.div 
        variants={shouldAnimate ? itemVariants : {}}
        className="border-t border-gray-200 p-6"
      >
                 <div className="flex gap-3">
           <motion.button
             whileHover={shouldAnimate ? {
               scale: 1.02,
               transition: { type: "spring" as const, stiffness: 400, damping: 25 }
             } : {}}
             whileTap={shouldAnimate ? { scale: 0.98 } : {}}
             className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
           >
             Ακύρωση
           </motion.button>
           <motion.button
             whileHover={shouldAnimate ? {
               scale: 1.02,
               transition: { type: "spring" as const, stiffness: 400, damping: 25 }
             } : {}}
             whileTap={shouldAnimate ? { scale: 0.98 } : {}}
             className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg hover:bg-emerald-600 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
           >
             Συνέχεια
           </motion.button>
         </div>
        </motion.div>
        </motion.div>

        {/* Confirmation View */}
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "0%" : "100%",
            opacity: showConfirmationView ? 1 : 0 
          }}
          transition={{ 
            type: "spring" as const, 
            stiffness: 300, 
            damping: 30,
            mass: 0.8
          }}
          className="absolute top-0 left-0 w-full h-full bg-white"
        >
          <div className="p-6 space-y-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToMain}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Πίσω</span>
              </motion.button>
              <h3 className="text-lg font-semibold text-gray-900">Επιβεβαίωση Κράτησης</h3>
              <div></div> {/* Spacer for centering */}
            </div>

            {/* Coach info summary */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img
                src={coach.imageUrl}
                alt={coach.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">{coach.name}</h4>
                <p className="text-sm text-gray-600">{coach.phone}</p>
              </div>
            </div>

            {/* Booking details */}
            {selectedTimeSlot && (
                              <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Η Κράτησή Σας</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedTimeSlot.dayName}, {selectedTimeSlot.day}
                      </p>
                      <p className="text-xl font-bold text-emerald-600">
                        {selectedTimeSlot.time}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500">Γήπεδο:</span>
                    <span className="text-gray-900 font-medium">{selectedLocation}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500">Διάρκεια:</span>
                    <span className="text-gray-900 font-medium">1 ώρα</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500">Τιμή:</span>
                    <span className="text-gray-900 font-medium">€{selectedPitchPrice}</span>
                  </div>
                </div>

                {/* Booking Form */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Στοιχεία Κράτησης</h5>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Όνομα *
                        </label>
                        <input
                          type="text"
                          placeholder="Εισάγετε το όνομά σας"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-football-green focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Επώνυμο *
                        </label>
                        <input
                          type="text"
                          placeholder="Εισάγετε το επώνυμό σας"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-football-green focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Τηλέφωνο *
                      </label>
                      <input
                        type="number"
                        placeholder="Εισάγετε το τηλέφωνό σας"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-football-green focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="terms"
                        className="mt-1 h-4 w-4 text-football-green focus:ring-football-green border-gray-300 rounded"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-gray-700">
                        Συμφωνώ με τους <span className="text-football-green underline cursor-pointer">όρους χρήσης</span> *
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm button */}
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.02, y: -1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.98 } : {}}
              onClick={handleConfirmBooking}
              className="w-full relative overflow-hidden py-3 rounded-lg font-semibold transition-all duration-300 bg-emerald-500 hover:bg-emerald-600 text-white border cursor-pointer group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                ΕΠΙΒΕΒΑΙΩΣΗ ΚΡΑΤΗΣΗΣ
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {/* Gradient shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
