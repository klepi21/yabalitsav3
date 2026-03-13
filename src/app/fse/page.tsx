'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { Venue, Pitch } from '@/types';

interface SearchResult {
  venue: Venue;
  pitch: Pitch;
  price: number;
}

interface SmartSuggestion {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venue: Venue;
  pitch: Pitch;
  price: number;
}

export default function FSEPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState({
    date: '',
    pitchType: '',
    time: '',
    city: ''
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching] = useState(false);
  const [hasSearched] = useState(false);
  const [suggestions] = useState<SmartSuggestion[]>([]);

  // Format date to Greek format (e.g., "Τετάρτη 15 Σεπτεμβρίου")
  const formatGreekDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
    const monthNames = [
      'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
      'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
    ];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    
    return `${dayName} ${day} ${month}`;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800/70 via-green-700/50 to-white flex flex-col">
      {/* Header */}
      <div className="min-h-screen flex flex-col">
        <div className={`text-center px-4 relative transition-all duration-700 ease-in-out ${
          !hasSearched ? 'flex-1 flex flex-col justify-center' : 'pt-12 sm:pt-16 pb-8 sm:pb-12'
        }`}>
          {/* Upper Right Corner Link - Removed as requested */}
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
            <p className="text-lg sm:text-xl text-gray-900">Βρες και κλείσε γήπεδο ποδοσφαίρου</p>
          </div>

          {/* FSE Coming Soon - Disabled Search Form */}
          <div className="max-w-5xl mx-auto px-4">
            {/* Non-dismissible Popup */}
            <div className="bg-green-700 text-white rounded-xl p-4 mb-4 shadow-lg border-2 border-green-600">
              <div className="text-center">
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="text-lg font-bold mb-1">FSE Έρχεται Σύντομα!</h3>
                <p className="text-sm opacity-90">Η προηγμένη μηχανή αναζήτησής μας βρίσκεται υπό ανάπτυξη</p>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end opacity-50">
                {/* City Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Πόλη
                  </label>
                  <select
                    value={searchQuery.city}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
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
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
                  />
                </div>

                {/* Pitch Type Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                    Τύπος Γηπέδου
                  </label>
                  <select
                    value={searchQuery.pitchType}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
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
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
                  >
                    <option value="">Επιλέξτε ώρα</option>
                    {(() => {
                      // Generate all available hours from 8:00 to 23:00
                      const availableHours = [];
                      for (let hour = 8; hour <= 23; hour++) {
                        availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
                      }
                      
                      return availableHours.map(timeString => (
                        <option key={timeString} value={timeString}>
                          {timeString}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Search Button */}
                <button
                  disabled
                  className="w-full sm:w-auto bg-gray-400 text-white font-medium py-2 px-6 rounded-lg text-sm cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  <span>Αναζήτηση</span>
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
                {searchResults.map((result) => (
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
                      {(result.venue.phone || result.venue.email) && (
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            {result.venue.phone && (
                              <div className="flex items-center">
                                <span className="mr-1">📞</span>
                                <span>{result.venue.phone}</span>
                              </div>
                            )}
                            {result.venue.email && (
                              <div className="flex items-center">
                                <span className="mr-1">📧</span>
                                <span>{result.venue.email}</span>
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
            {suggestions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* No results card - small compact box */}
                <div className="lg:col-span-1">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 hover:bg-white transition-all duration-300 h-fit">
                    <div className="text-4xl mb-3">😔</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Δεν βρέθηκαν διαθέσιμα γήπεδα</h3>
                    <p className="text-sm text-gray-600 mb-4">Δοκίμασε διαφορετική ημερομηνία, ώρα ή τύπο γηπέδου</p>

                  </div>
                </div>

                {/* Suggestions card - takes more space */}
                <div className="lg:col-span-3 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 p-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">Διαθέσιμες εναλλακτικές</h4>
                  <p className="text-sm text-gray-600 mb-6">Παρόμοιες ώρες και επόμενες ημέρες για {searchQuery.pitchType}{searchQuery.city ? ` στην ${searchQuery.city}` : ''}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map((sug, idx) => (
                      <div key={`${sug.pitch.id}-${sug.date}-${sug.time}-${idx}`} className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-xl p-4 hover:shadow-lg hover:border-green-300 transition-all duration-300">
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-lg mb-1">{sug.venue.name}</div>
                            <div className="text-xs text-gray-600 mb-2">{sug.venue.address}</div>
                            <div className="text-xs text-gray-700 font-medium mb-3">{sug.pitch.name} • {sug.pitch.type}</div>
                            
                            <div className="bg-green-100 rounded-lg p-3 mb-3">
                              <div className="text-center">
                                <div className="text-xs text-gray-600 mb-1">Ημερομηνία</div>
                                <div className="font-bold text-green-800">{formatGreekDate(sug.date)}</div>
                                <div className="text-2xl font-bold text-green-700 mt-1">{sug.time}</div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-700">€{sug.price}</div>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <button 
                              onClick={() => handleBookNow(sug.venue.id, sug.pitch.id, sug.time)} 
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
                            >
                              Επιλογή
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 mb-8 hover:bg-white transition-all duration-300">
                <div className="text-6xl mb-4">😔</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν βρέθηκαν διαθέσιμα γήπεδα</h3>
                <p className="text-gray-600 mb-4">Δοκίμασε διαφορετική ημερομηνία, ώρα ή τύπο γηπέδου</p>
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
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-20">
          <div className="text-center py-8 text-gray-500 border-t border-gray-100">
            <div className="mb-4">
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <Link 
                  href="/terms" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  📋 Όροι Χρήσης
                </Link>
                <Link 
                  href="/privacy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  🔒 Πολιτική Απορρήτου
                </Link>
                <Link 
                  href="/for-venues" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  🏟️ Εγγραφή για Γήπεδα
                </Link>
                <Link 
                  href="/venue-login" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  🔑 Σύνδεση
                </Link>
              </div>
            </div>
            <p>© {new Date().getFullYear()} Yabalitsa. Όλα τα δικαιώματα διατηρούνται.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
