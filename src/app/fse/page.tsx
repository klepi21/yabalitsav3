'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Venue, Pitch } from '@/types';

interface SearchResult {
  venue: Venue;
  pitch: Pitch;
  price: number;
}

export default function FSEPage() {
  const [searchQuery, setSearchQuery] = useState({
    date: '',
    pitchType: '',
    time: '',
    city: ''
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);


  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const { venueService, pitchService } = await import('@/lib/firebase-services');
      const allVenues = await venueService.getAll();
      
      let filteredVenues = allVenues;
      if (searchQuery.city) {
        filteredVenues = filteredVenues.filter(v => 
          (v.address && v.address.toLowerCase().includes(searchQuery.city.toLowerCase())) || 
          (v.city && v.city.toLowerCase() === searchQuery.city.toLowerCase())
        );
      }
      
      const results: SearchResult[] = [];
      
      await Promise.all(filteredVenues.map(async (venue) => {
        try {
          const pitches = await pitchService.getByVenue(venue.id);
          const activePitches = pitches.filter(p => p.active !== false);
          
          activePitches.forEach(pitch => {
            if (searchQuery.pitchType && pitch.type !== searchQuery.pitchType) return;
            
            // We do not check booking availability in this MVP step unless date/time is handled deeply, 
            // so we return the pitch if it matches basic criteria.
            results.push({
              venue: venue as Venue,
              pitch: pitch as Pitch,
              price: pitch.pricePerSlot || 0
            });
          });
        } catch (err) {
          console.error(`Failed to load pitches for venue ${venue.id}`, err);
        }
      }));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040D12] text-white flex flex-col font-sans selection:bg-[#74ee16]/30">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#74ee16]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Header Back Link */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B151C]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            Αρχική
          </Link>
          <Image src="/yabalo.png" alt="Yabalitsa Logo" width={110} height={22} className="filter brightness-0 invert" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-32 pb-20 relative z-10">
        <div className={`text-center px-4 w-full transition-all duration-700 ease-in-out ${
          !hasSearched ? 'flex-1 flex flex-col justify-center max-w-[1000px] mx-auto' : 'mb-12 max-w-[1000px] mx-auto'
        }`}>
          
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-4">
              Αναζήτηση <span className="text-[#74ee16]">Γηπέδων.</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 font-light max-w-2xl mx-auto">
              Βρείτε το ιδανικό γήπεδο 5x5, 6x6 ή 8x8 δίπλα σας και κάντε Online Κράτηση σε δευτερόλεπτα.
            </p>
          </div>

          <div className="px-4">
            <div className="bg-[#0B151C] backdrop-blur-md border border-white/10 rounded-[2rem] p-6 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                {/* City Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2 text-left">
                    Πόλη
                  </label>
                  <select
                    value={searchQuery.city}
                    onChange={(e) => setSearchQuery({...searchQuery, city: e.target.value})}
                    className="w-full h-12 rounded-xl border border-white/10 bg-[#040D12] px-4 text-white text-sm outline-none focus:border-[#74ee16] transition-colors"
                  >
                    <option value="">Όλες οι πόλεις</option>
                    <option value="Αθήνα">Αθήνα</option>
                    <option value="Θεσσαλονίκη">Θεσσαλονίκη</option>
                    <option value="Πάτρα">Πάτρα</option>
                  </select>
                </div>

                {/* Date Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2 text-left">
                    Ημερομηνία
                  </label>
                  <input
                    type="date"
                    value={searchQuery.date}
                    onChange={(e) => setSearchQuery({...searchQuery, date: e.target.value})}
                    className="w-full h-12 rounded-xl border border-white/10 bg-[#040D12] px-4 text-white text-sm outline-none focus:border-[#74ee16] transition-colors [color-scheme:dark]"
                  />
                </div>

                {/* Pitch Type Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2 text-left">
                    Τύπος
                  </label>
                  <select
                    value={searchQuery.pitchType}
                    onChange={(e) => setSearchQuery({...searchQuery, pitchType: e.target.value})}
                    className="w-full h-12 rounded-xl border border-white/10 bg-[#040D12] px-4 text-white text-sm outline-none focus:border-[#74ee16] transition-colors"
                  >
                    <option value="">Όλοι οι τύποι</option>
                    <option value="5x5">5x5</option>
                    <option value="6x6">6x6</option>
                    <option value="7x7">7x7</option>
                    <option value="8x8">8x8</option>
                    <option value="9x9">9x9</option>
                  </select>
                </div>

                {/* Time Selection */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2 text-left">
                    Ώρα
                  </label>
                  <select
                    value={searchQuery.time}
                    onChange={(e) => setSearchQuery({...searchQuery, time: e.target.value})}
                    className="w-full h-12 rounded-xl border border-white/10 bg-[#040D12] px-4 text-white text-sm outline-none focus:border-[#74ee16] transition-colors"
                  >
                    <option value="">Οποιαδήποτε</option>
                    {(() => {
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
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full sm:col-span-1 h-12 bg-[#74ee16] hover:bg-[#5dc611] text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(116,238,22,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Αναζήτηση</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="w-full flex-1 flex flex-col items-center justify-center mt-12">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#74ee16] rounded-full animate-spin mb-4" />
            <p className="text-zinc-400 animate-pulse">Αναζήτηση διαθεσιμότητας...</p>
          </div>
        )}

        {/* Search Results rendering */}
        {hasSearched && !isSearching && searchResults.length > 0 && (
          <div className="max-w-[1000px] mx-auto px-4 w-full flex flex-col gap-6 mt-8">
            <h2 className="text-xl font-medium text-white mb-2">
              Βρέθηκαν <span className="text-[#74ee16] font-bold">{searchResults.length}</span> γήπεδα
            </h2>
            
            {searchResults.map((result, idx) => (
              <div key={`${result.venue.id}-${result.pitch.id}-${idx}`} className="bg-[#0B151C] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-white/20 transition-all group shadow-xl">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white group-hover:text-[#74ee16] transition-colors">{result.venue.name}</h3>
                    <span className="bg-white/10 text-zinc-300 text-xs px-3 py-1 rounded-full font-medium tracking-wide shadow-sm">
                      {result.pitch.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-zinc-400 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1.5 opacity-70" />
                    <span>{result.venue.address || 'Διεύθυνση μη διαθέσιμη'}</span>
                  </div>
                  
                  <div className="bg-white/5 border border-white/5 inline-flex flex-col sm:flex-row gap-4 p-3 rounded-xl px-5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#74ee16] animate-pulse" />
                      <span className="font-bold text-white">{result.pitch.name}</span>
                    </div>
                    <div className="hidden sm:block w-[1px] bg-white/10" />
                    <div className="text-zinc-400">Διάρκεια: <span className="text-white font-medium">{result.pitch.slotDuration} λεπτά</span></div>
                  </div>
                </div>

                <div className="flex flex-col md:items-end w-full md:w-auto gap-4 border-t border-white/5 md:border-t-0 pt-6 md:pt-0">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{result.price}</span>
                    <span className="text-[#74ee16] font-bold text-xl mb-1">€</span>
                  </div>
                  <Link 
                    href={`/book/${encodeURIComponent(result.venue.name || result.venue.id)}`}
                    className="w-full md:w-auto bg-[#74ee16] hover:bg-[#5dc611] text-black font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(116,238,22,0.15)] hover:shadow-[0_0_25px_rgba(116,238,22,0.3)] text-center shadow-lg"
                  >
                    Κράτηση Τώρα
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* No Results Context */}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <div className="max-w-3xl mx-auto px-4 w-full">
             <div className="bg-[#0B151C] border border-white/10 rounded-3xl p-12 text-center shadow-2xl">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Δεν βρέθηκαν γήπεδα</h3>
                <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                  Δυστυχώς δεν υπάρχουν διαθέσιμα γήπεδα με αυτά τα κριτήρια αυτή τη στιγμή. Δοκιμάστε διαφορετική ημερομηνία, ώρα ή πόλη.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery({ date: '', pitchType: '', time: '', city: '' });
                    setHasSearched(false);
                  }}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3 rounded-xl font-bold transition-all"
                >
                  Καθαρισμός Φίλτρων
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 border-t border-white/5 bg-[#0B151C]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-8 text-sm mb-6">
            <Link href="/terms" className="text-zinc-500 hover:text-white transition-colors">Όροι Χρήσης</Link>
            <Link href="/privacy" className="text-zinc-500 hover:text-white transition-colors">Πολιτική Απορρήτου</Link>
            <Link href="/for-venues" className="text-zinc-500 hover:text-white transition-colors">Για Ιδιοκτήτες</Link>
          </div>
          <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} Yabalitsa. Με επιφύλαξη παντός δικαιώματος.</p>
        </div>
      </footer>
    </div>
  );
}
