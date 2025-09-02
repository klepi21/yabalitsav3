'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { venueService, pitchService } from '@/lib/firebase-services';
import { Venue, Pitch } from '@/types';
import { MapPinIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function VenueBookingPage() {
  const params = useParams();
  const venueName = params.venueName as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedPitch, setSelectedPitch] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // Get current step (1-4)
  const getCurrentStep = () => {
    if (!selectedPitch) return 1;
    if (!selectedDate) return 2;
    if (!selectedTime) return 3;
    return 4;
  };

  const getPlayersPerPitch = (pitchType: string) => {
    switch (pitchType) {
      case '5x5': return 10;
      case '6x6': return 12;
      case '7x7': return 14;
      case '8x8': return 16;
      case '9x9': return 18;
      default: return 10;
    }
  };

  const getPricePerPerson = (price: number, pitchType: string) => {
    const players = getPlayersPerPitch(pitchType);
    return (price / players).toFixed(0);
  };

  useEffect(() => {
    loadVenueData();
  }, [venueName]);

  const loadVenueData = async () => {
    try {
      const allVenues = await venueService.getAll();
      const foundVenue = allVenues.find(v => 
        v.name.toLowerCase().replace(/\\s+/g, '') === venueName.toLowerCase()
      );

      if (foundVenue) {
        setVenue(foundVenue);
        const pitchesData = await pitchService.getByVenue(foundVenue.id);
        setPitches(pitchesData || []);
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAvailableSlots = (pitchId: string, date: string) => {
    const pitch = pitches.find(p => p.id === pitchId);
    if (!pitch || !date) return [];

    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const daySchedule = pitch.defaultOpeningHours[dayName];
    
    if (!daySchedule || !daySchedule.isOpen || !daySchedule.slots?.length) {
      return [];
    }

    const slots: string[] = [];
    
    daySchedule.slots.forEach(openingSlot => {
      const startTime = new Date("2000-01-01T" + openingSlot.start);
      const endTime = new Date("2000-01-01T" + openingSlot.end);
      
      const currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + pitch.slotDuration * 60000);
        const slotEndTime = slotEnd.toTimeString().slice(0, 5);
        
        if (slotEnd <= endTime) {
          slots.push(slotStart + " - " + slotEndTime);
        }
        
        currentTime.setMinutes(currentTime.getMinutes() + pitch.slotDuration);
      }
    });

    return slots;
  };

  useEffect(() => {
    if (selectedPitch && selectedDate) {
      const slots = generateAvailableSlots(selectedPitch, selectedDate);
      setAvailableSlots(slots);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedPitch, selectedDate]);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d.toISOString().split('T')[0];
  };

  const isDateInRange = (date: Date) => {
    return date >= today && date <= maxDate;
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const weeks = [];
    let week = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      week.push(<td key={`empty-${i}`} className="p-0.5" />);
    }

    // Add days of the month
    for (let day = 1; day <= days; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0, 0);
      const isToday = formatDate(date) === formatDate(today);
      const isSelected = formatDate(date) === selectedDate;
      const isInRange = isDateInRange(date);

      week.push(
        <td key={day} className="p-0.5">
          <button
            onClick={() => {
              if (isInRange) {
                setSelectedDate(formatDate(date));
                setShowCalendar(false);
              }
            }}
            disabled={!isInRange}
            className={`
              w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors
              ${isSelected ? 'bg-football-green text-white font-medium' : ''}
              ${isToday ? 'border-2 border-football-green font-medium' : ''}
              ${isInRange 
                ? 'text-gray-700 hover:bg-football-green/10 hover:text-football-green' 
                : 'text-gray-300 cursor-not-allowed'}
            `}
          >
            {day}
          </button>
        </td>
      );

      if (week.length === 7) {
        weeks.push(<tr key={`week-${weeks.length}`}>{week}</tr>);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<td key={`empty-end-${week.length}`} className="p-0.5" />);
      }
      weeks.push(<tr key={`week-${weeks.length}`}>{week}</tr>);
    }

    return weeks;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Το γήπεδο δεν βρέθηκε</h1>
          <p className="text-gray-600">Δεν βρέθηκε γήπεδο με αυτό το όνομα.</p>
        </div>
      </div>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-football-green/10 to-transparent">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {venue.name}
          </h1>
          <div className="flex items-center text-gray-600 text-sm">
            <MapPinIcon className="h-4 w-4 mr-1" />
            {venue.address}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step < currentStep ? 'bg-football-green text-white' : 
                  step === currentStep ? 'bg-football-green/20 text-football-green border-2 border-football-green' : 
                  'bg-gray-100 text-gray-400'}
              `}>
                {step}
              </div>
              <div className={`
                ml-2 text-sm font-medium whitespace-nowrap
                ${step < currentStep ? 'text-football-green' : 
                  step === currentStep ? 'text-gray-900' : 
                  'text-gray-400'}
              `}>
                {step === 1 ? 'Γήπεδο' : 
                 step === 2 ? 'Ημερομηνία' : 
                 step === 3 ? 'Ώρα' :
                 'Στοιχεία'}
              </div>
              {step < 4 && (
                <div className={`
                  flex-1 h-0.5 mx-4
                  ${step < currentStep ? 'bg-football-green' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
          {/* Row 1: Pitch Selection */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Επιλογή Γηπέδου</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pitches.map((pitch) => (
                <button
                  key={pitch.id}
                  onClick={() => {
                    setSelectedPitch(pitch.id);
                    setSelectedTime('');
                  }}
                  className={`relative overflow-hidden rounded-lg border transition-all ${
                    selectedPitch === pitch.id 
                      ? 'border-football-green bg-football-green/10' 
                      : 'border-gray-200 hover:border-football-green/50'
                  }`}
                >
                  <div className="aspect-[2/1] bg-[#4a9c2d] p-2 flex flex-col items-center justify-between">
                    <div className="w-6 h-6 border-2 border-white/30 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    <div className="w-full h-full border-2 border-white/30 rounded flex items-center justify-center">
                      <div className="text-white text-center z-10">
                        <h3 className="font-bold text-sm mb-1">{pitch.name}</h3>
                        <p className="text-lg font-bold">{pitch.type}</p>
                        <p className="text-xs mt-1">
                          €{pitch.pricePerSlot}
                          <span className="opacity-75">
                            (€{getPricePerPerson(pitch.pricePerSlot, pitch.type)}/άτομο)
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Calendar */}
          {selectedPitch && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Επιλογή Ημερομηνίας</h2>
              <div className="relative">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full text-left px-4 py-2 border rounded-lg hover:border-football-green focus:outline-none focus:border-football-green text-gray-900"
                >
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('el-GR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Επιλέξτε ημερομηνία'}
                </button>

                {showCalendar && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeftIcon className="h-4 w-4 text-gray-900" />
                      </button>
                      <h3 className="text-sm font-medium text-gray-900">
                        {currentMonth.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronRightIcon className="h-4 w-4 text-gray-900" />
                      </button>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr>
                          {['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'].map(day => (
                            <th key={day} className="p-0.5 text-xs font-medium text-gray-700">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {renderCalendar()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Time Slots */}
          {selectedDate && selectedPitch && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Επιλογή Ώρας</h2>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`p-2 rounded text-center text-sm transition-all ${
                        selectedTime === slot
                          ? 'bg-football-green text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Δεν υπάρχουν διαθέσιμες ώρες για την επιλεγμένη ημερομηνία
                </div>
              )}
            </div>
          )}

          {/* Continue Button and Booking Summary */}
          {selectedTime && (
            <div className="pt-4">
              <button 
                onClick={() => {
                  // Here we'll handle the transition to step 4
                  const currentStep = getCurrentStep();
                  if (currentStep === 4) {
                    // Show booking details form
                  }
                }}
                className="w-full py-3 bg-football-green text-white font-medium rounded-lg shadow-sm hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green transition-colors"
              >
                Συνέχεια
              </button>
              
              {/* Booking Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Σύνοψη Κράτησης</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Γήπεδο:</span>
                    <span className="font-medium text-gray-900">
                      {pitches.find(p => p.id === selectedPitch)?.name} ({pitches.find(p => p.id === selectedPitch)?.type})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ημερομηνία:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedDate).toLocaleDateString('el-GR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ώρα:</span>
                    <span className="font-medium text-gray-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                    <span>Τιμή:</span>
                    <span className="font-medium text-gray-900">
                      €{pitches.find(p => p.id === selectedPitch)?.pricePerSlot}
                      <span className="text-gray-500 text-xs ml-1">
                        (€{getPricePerPerson(
                          pitches.find(p => p.id === selectedPitch)?.pricePerSlot || 0,
                          pitches.find(p => p.id === selectedPitch)?.type || ''
                        )}/άτομο)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}