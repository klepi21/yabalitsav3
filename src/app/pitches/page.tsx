'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { pitchService } from '@/lib/firebase-services';
import { Pitch } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function PitchesPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Check authentication
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
      const pitchesData = await pitchService.getByVenue(venueOwner.venueId);
      setPitches(pitchesData || []);
    } catch (error) {
      console.error('Error loading pitches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPitches = pitches.filter(pitch =>
    pitch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Γήπεδα</h1>
          <p className="mt-2 text-gray-600">Διαχείριση των ποδοσφαιρικών γηπέδων του χώρου σας</p>
        </div>
        <Link
          href="/pitches/new"
          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green transition-all duration-200 hover:scale-105"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Προσθήκη Γηπέδου
        </Link>
      </div>

      {/* Stats Card */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-football-green/10 rounded-xl mr-4">
              <span className="text-2xl">⚽</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Σύνολο Γηπέδων</h3>
              <p className="text-sm text-gray-500">Διαθέσιμα γήπεδα για κρατήσεις</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-football-green">{pitches.length}</div>
            <div className="text-sm text-gray-500">γήπεδα</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Αναζήτηση γηπέδων..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-football-green focus:border-football-green sm:text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Pitches List */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
        {filteredPitches.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⚽</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Δεν βρέθηκαν γήπεδα.' : 'Δεν υπάρχουν γήπεδα ακόμα'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε προσθέτοντας το πρώτο σας γήπεδο.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/pitches/new"
                  className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-xl text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green transition-all duration-200 hover:scale-105"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Προσθήκη Γηπέδου
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPitches.map((pitch) => (
                <div key={pitch.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-football-green hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-football-green/10 rounded-xl flex items-center justify-center mr-3">
                        <span className="text-xl">⚽</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">{pitch.name}</h4>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-football-green/10 text-football-green border border-football-green/20">
                      {pitch.type}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">💰 Τιμή ανά Κράτηση</span>
                      <span className="text-lg font-bold text-gray-900">€{pitch.pricePerSlot}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">⏱️ Διάρκεια Κράτησης</span>
                      <span className="text-sm font-medium text-gray-900">{pitch.slotDuration} λεπτά</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4 border-t border-gray-100">
                    <Link
                      href={`/pitches/${pitch.id}/edit`}
                      className="flex-1 text-center text-sm text-football-green hover:text-football-green-light font-medium py-2 px-3 rounded-lg hover:bg-football-green/5 transition-colors"
                    >
                      ✏️ Επεξεργασία
                    </Link>
                    <Link
                      href={`/pitches/${pitch.id}`}
                      className="flex-1 text-center text-sm text-football-green hover:text-football-green-light font-medium py-2 px-3 rounded-lg hover:bg-football-green/5 transition-colors"
                    >
                      👁️ Προβολή
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
