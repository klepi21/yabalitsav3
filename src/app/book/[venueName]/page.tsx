'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { venueService, pitchService } from '@/lib/firebase-services';
import { Venue, Pitch } from '@/types';
import { CoachSchedulingCard } from '@/components/ui/coach-scheduling-card';

export default function VenueBookingPage() {
  const params = useParams();
  const venueName = params.venueName as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPitch, setSelectedPitch] = useState<string>('');

  useEffect(() => {
    loadVenueData();
  }, [venueName]);

  const loadVenueData = async () => {
    try {
      const allVenues = await venueService.getAll();
      const foundVenue = allVenues.find(v => 
        v.name.toLowerCase().replace(/\s+/g, '') === venueName.toLowerCase()
      );

      if (foundVenue) {
        setVenue(foundVenue);
        const pitchesData = await pitchService.getByVenue(foundVenue.id);
        setPitches(pitchesData || []);
        if (pitchesData && pitchesData.length > 0) {
          setSelectedPitch(pitchesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotSelect = (day: string, time: string) => {
    // Handle time slot selection logic here
  };

  const handleLocationChange = (location: string) => {
    // Extract pitch ID from location string and update selectedPitch
    const pitchIndex = locations.findIndex(loc => loc === location);
    if (pitchIndex !== -1) {
      setSelectedPitch(pitches[pitchIndex].id);
    }
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    // Handle week navigation logic here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-800/70 via-green-700/50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-800/70 via-green-700/50 to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Το γήπεδο δεν βρέθηκε</h1>
          <p className="text-gray-600">Δεν βρέθηκε γήπεδο με αυτό το όνομα.</p>
        </div>
      </div>
    );
  }

  // Convert pitches to locations for the component
  const locations = pitches.map(pitch => `${pitch.name} (${pitch.type})`);

  // Get selected pitch price and data
  const selectedPitchPrice = pitches.find(p => p.id === selectedPitch)?.pricePerSlot || 0;
  const selectedPitchData = pitches.find(p => p.id === selectedPitch);

  // Create venue coach object
  const venueCoach = {
    name: venue.name,
    phone: venue.phone || "Δεν υπάρχει τηλέφωνο",
    email: venue.email || "Δεν υπάρχει email",
    address: venue.address || "Διεύθυνση δεν είναι διαθέσιμη",
    rating: 4.8,
    reviewCount: 12,
    imageUrl: "/yaba.png"
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800/70 via-green-700/50 to-white flex items-center justify-center">
      <div className="max-w-4xl w-full px-4 flex justify-center">
        <CoachSchedulingCard
          coach={venueCoach}
          locations={locations}
          onTimeSlotSelect={handleTimeSlotSelect}
          onLocationChange={handleLocationChange}
          onWeekChange={handleWeekChange}
          enableAnimations={true}
          selectedPitchPrice={selectedPitchPrice}
          selectedPitch={selectedPitchData}
        />
      </div>
    </div>
  );
}