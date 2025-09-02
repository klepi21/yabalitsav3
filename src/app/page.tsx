'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { venueService, pitchService, bookingService } from '@/lib/firebase-services';
import { Venue, Pitch, Booking } from '@/types';

interface SearchResult {
  venue: Venue;
  pitch: Pitch;
  price: number;
}

export default function RootPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState({
    date: '',
    pitchType: '',
    time: '',
    city: ''
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [venuesData, pitchesData, bookingsData] = await Promise.all([
        venueService.getAll(),
        pitchService.getAll(),
        bookingService.getAll()
      ]);
      
      setVenues(venuesData || []);
      setPitches(pitchesData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.date || !searchQuery.pitchType || !searchQuery.time) {
      return;
    }
    
    // City is optional - if not selected, show all cities

    setHasSearched(true);
    setIsSearching(true);
    
    try {
      console.log('🔍 Starting search with:', searchQuery);
      console.log('📊 Available data:', { venues: venues.length, pitches: pitches.length, bookings: bookings.length });
      
      const results: SearchResult[] = [];
      const selectedDate = new Date(searchQuery.date);
      const selectedTime = searchQuery.time;
      
      // Filter pitches by type
      const matchingPitches = pitches.filter(pitch => pitch.type === searchQuery.pitchType);
      console.log('⚽ Matching pitches:', matchingPitches.length, 'for type:', searchQuery.pitchType);
      
      for (const pitch of matchingPitches) {
        console.log('🔍 Checking pitch:', pitch.name, pitch.type, 'venueId:', pitch.venueId);
        const venue = venues.find(v => v.id === pitch.venueId);
        if (!venue) {
          console.log('❌ No venue found for pitch:', pitch.id, 'venueId:', pitch.venueId);
          console.log('Available venue IDs:', venues.map(v => v.id));
          continue;
        }

        // Filter by city if selected
        if (searchQuery.city && venue?.city !== searchQuery.city) {
          console.log('❌ Venue city does not match:', venue?.city || 'undefined', 'vs', searchQuery.city);
          continue;
        }
        console.log('✅ Venue city matches or no city filter:', venue?.city || 'undefined', 'vs', searchQuery.city);

        // Check if pitch is available for the selected date and time
        const isAvailable = await checkPitchAvailability(pitch, selectedDate, selectedTime);
        console.log('✅ Pitch availability:', pitch.name, isAvailable);
        
        if (isAvailable) {
          results.push({
            venue,
            pitch,
            price: pitch.pricePerSlot
          });
        }
      }

      console.log('🎯 Final results:', results.length);
      // Sort by price (lowest first)
      results.sort((a, b) => a.price - b.price);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const checkPitchAvailability = async (pitch: Pitch, date: Date, time: string): Promise<boolean> => {
    console.log('🔍 Checking availability for pitch:', pitch.name, 'on', date.toDateString(), 'at', time);
    
    // Check if the date is blocked
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const daySchedule = pitch.defaultOpeningHours[dayName];
    console.log('🕐 Opening hours for', dayName, ':', daySchedule);
    
    if (!daySchedule || !daySchedule.isOpen || !daySchedule.slots.length) {
      console.log('❌ Pitch is closed on', dayName);
      return false;
    }

    // Check if the time is within any of the opening slots
    const [hours, minutes] = time.split(':').map(Number);
    const selectedTime = new Date(date);
    selectedTime.setHours(hours, minutes, 0, 0);
    const selectedTimeString = selectedTime.toTimeString().slice(0, 5);

    // Check if the selected time falls within any of the opening slots
    const isWithinOpeningHours = daySchedule.slots.some(slot => {
      console.log('⏰ Time check:', selectedTimeString, 'vs', slot.start, '-', slot.end);
      return selectedTimeString >= slot.start && selectedTimeString < slot.end;
    });

    if (!isWithinOpeningHours) {
      console.log('❌ Time outside all opening slots');
      return false;
    }

    console.log('✅ Time is within an opening slot');

    // Check if there are conflicting bookings
    const conflictingBookings = bookings.filter(booking => 
      booking.pitchId === pitch.id &&
      booking.status !== 'cancelled' &&
      new Date(booking.startTime).toDateString() === date.toDateString()
    );

    console.log('📅 Conflicting bookings found:', conflictingBookings.length);

    // Check if the selected time conflicts with any existing booking
    for (const booking of conflictingBookings) {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      if (selectedTime >= bookingStart && selectedTime < bookingEnd) {
        console.log('❌ Time conflicts with existing booking:', bookingStart.toTimeString(), '-', bookingEnd.toTimeString());
        return false;
      }
    }

    console.log('✅ Pitch is available!');
    return true;
  };

  const handleBookNow = (venueId: string, pitchId: string, time: string) => {
    // Redirect to a booking page with pre-filled data
    const params = new URLSearchParams({
      venueId,
      pitchId,
      date: searchQuery.date,
      time
    });
    router.push(`/book?${params.toString()}`);
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800/70 via-green-700/50 to-white flex flex-col">
      {/* Header */}
      <div className="min-h-screen flex flex-col">
        <div className={`text-center px-4 relative transition-all duration-700 ease-in-out ${
          !hasSearched ? 'flex-1 flex flex-col justify-center' : 'pt-12 sm:pt-16 pb-8 sm:pb-12'
        }`}>
          {/* Upper Right Corner Link */}
          <div className={`absolute transition-all duration-700 ease-in-out ${
            !hasSearched ? 'top-4 right-4' : 'top-0 right-4'
          } flex items-center space-x-4`}>
            <a href="/for-venues" className="text-black hover:text-gray-700 font-medium text-sm transition-colors">
              Έχεις γηπεδάκια?
            </a>
            <a href="/management" className="text-black hover:text-gray-700 font-medium text-sm transition-colors">
              Σύνδεση
            </a>
          </div>
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-center mb-4 sm:mb-6">
              <Image
                src="/yabalitsalogo.png"
                alt="Yabalitsa Logo"
                width={200}
                height={80}
                className="h-16 sm:h-20 w-auto"
              />
            </div>
            <p className="text-lg sm:text-xl text-gray-600">Βρες και κλείσε γήπεδο ποδοσφαίρου</p>
          </div>

          {/* Minimal Search Form */}
          <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                {/* City Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Πόλη
                  </label>
                  <select
                    value={searchQuery.city}
                    onChange={(e) => setSearchQuery({...searchQuery, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 text-sm"
                  >
                    <option value="">Όλες οι πόλεις</option>
                    <option value="Αθήνα">Αθήνα</option>
                    <option value="Θεσσαλονίκη">Θεσσαλονίκη</option>
                    <option value="Πάτρα">Πάτρα</option>
                  </select>
                </div>

                {/* Date Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Ημερομηνία
                  </label>
                  <input
                    type="date"
                    value={searchQuery.date}
                    onChange={(e) => setSearchQuery({...searchQuery, date: e.target.value})}
                    min={getCurrentDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 text-sm"
                  />
                </div>

                {/* Pitch Type Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Τύπος Γηπέδου
                  </label>
                  <select
                    value={searchQuery.pitchType}
                    onChange={(e) => setSearchQuery({...searchQuery, pitchType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 text-sm"
                  >
                    <option value="">Επιλέξτε τύπο</option>
                    <option value="5x5">5x5</option>
                    <option value="6x6">6x6</option>
                    <option value="7x7">7x7</option>
                    <option value="8x8">8x8</option>
                    <option value="9x9">9x9</option>
                  </select>
                </div>

                {/* Time Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Ώρα
                  </label>
                  <select
                    value={searchQuery.time}
                    onChange={(e) => setSearchQuery({...searchQuery, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700 text-sm"
                  >
                    <option value="">Επιλέξτε ώρα</option>
                    {(() => {
                      // Get the selected date's day of week
                      const selectedDate = searchQuery.date ? new Date(searchQuery.date) : null;
                      const dayOfWeek = selectedDate?.getDay();
                      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const dayName = dayOfWeek !== undefined ? dayNames[dayOfWeek] : null;

                      console.log('Selected day:', dayName);

                      // Get available slots for the selected pitch
                      const selectedPitch = pitches.find(p => p.type === searchQuery.pitchType);
                      console.log('Selected pitch:', selectedPitch);
                      console.log('Opening hours:', selectedPitch?.defaultOpeningHours);
                      
                      if (!dayName || !selectedPitch) {
                        return <option value="">Επιλέξτε ημερομηνία και τύπο γηπέδου</option>;
                      }

                      const daySchedule = selectedPitch.defaultOpeningHours[dayName];
                      console.log('Day schedule:', daySchedule);

                      if (!daySchedule?.isOpen || !daySchedule?.slots?.length) {
                        return <option value="">Δεν υπάρχουν διαθέσιμες ώρες</option>;
                      }

                      // Generate all possible hours between slot ranges
                      const availableHours = new Set<string>();
                      daySchedule.slots.forEach(slot => {
                        const [startHour] = slot.start.split(':').map(Number);
                        const [endHour] = slot.end.split(':').map(Number);
                        
                        for (let hour = startHour; hour < endHour; hour++) {
                          availableHours.add(`${hour.toString().padStart(2, '0')}:00`);
                        }
                      });

                      console.log('Available hours:', Array.from(availableHours));

                      // Convert to sorted array and create options
                      return Array.from(availableHours)
                        .sort()
                        .map(timeString => (
                          <option key={timeString} value={timeString}>
                            {timeString}
                          </option>
                        ));
                    })()}
                  </select>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.date || !searchQuery.pitchType || !searchQuery.time || isSearching}
                  className="w-full sm:w-auto bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg text-sm transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Αναζήτηση...</span>
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="h-5 w-5" />
                      <span>Αναζήτηση</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && searchResults.length > 0 && (
          <div className="w-full pb-20">
            <div className="max-w-5xl mx-auto px-4">
              <div className="text-left mt-6 mb-3">
                <h2 className="text-lg text-gray-700">
                  {searchResults.length === 1 ? 'Βρέθηκε 1 γήπεδο' : `Βρέθηκαν ${searchResults.length} γήπεδα`}
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                {searchResults.map((result, index) => (
                  <div key={`${result.venue.id}-${result.pitch.id}`} className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg ${result.venue.name?.toLowerCase().includes('tziolas') ? 'border-2 border-green-700' : 'border border-gray-100'} hover:shadow-xl hover:bg-white transition-all duration-300 overflow-hidden mb-3 sm:mb-4 w-full`}>
                    <div className="p-3 sm:p-4">
                      {/* Horizontal Layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        {/* Left Side - Venue & Pitch Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1 sm:mb-2">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
                              {result.venue.name}
                              {result.venue.name?.toLowerCase().includes('tziolas') && (
                                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-700/30">
                                  sponsored
                                </span>
                              )}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                              {result.pitch.type}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600 text-xs sm:text-sm mb-1">
                            <MapPinIcon className="h-4 w-4 mr-1 hidden sm:inline" />
                            <span>{result.venue.address}</span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            <span className="font-medium">{result.pitch.name}</span> • Διάρκεια: {result.pitch.slotDuration} λεπτά
                          </div>
                        </div>

                        {/* Right Side - Price & Button */}
                        <div className="flex flex-col sm:items-end space-y-2 sm:space-y-3 sm:ml-6">
                          <div className="text-right sm:text-right">
                            <div className="text-lg sm:text-2xl font-bold text-green-600">€{result.price}</div>
                          </div>
                          <button
                            disabled={true}
                            className="bg-gray-400 cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg text-sm w-full sm:w-auto"
                          >
                            Κράτηση Τώρα
                          </button>
                        </div>
                      </div>

                      {/* Contact Info - Below */}
                      {result.venue.contactDetails && (
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            {result.venue.contactDetails.phone && (
                              <div className="flex items-center">
                                <span className="mr-1">📞</span>
                                <span>{result.venue.contactDetails.phone}</span>
                              </div>
                            )}
                            {result.venue.contactDetails.email && (
                              <div className="flex items-center">
                                <span className="mr-1">📧</span>
                                <span>{result.venue.contactDetails.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-20">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 mb-8 hover:bg-white transition-all duration-300">
              <div className="text-6xl mb-4">😔</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν βρέθηκαν διαθέσιμα γήπεδα</h3>
              <p className="text-gray-600 mb-4">
                Δοκίμασε διαφορετική ημερομηνία, ώρα ή τύπο γηπέδου
              </p>
              <button
                onClick={() => {
                  setSearchQuery({ date: '', pitchType: '', time: '', city: '' });
                  setSearchResults([]);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Νέα Αναζήτηση
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-20">
          <div className="text-center py-8 text-gray-500 border-t border-gray-100">
            <p>© 2024 Yabalitsa. Όλα τα δικαιώματα διατηρούνται.</p>
          </div>
        </div>
      </div>
    </div>
  );
}