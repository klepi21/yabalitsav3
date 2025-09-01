'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { venueService } from '@/lib/firebase-services';
import VenueForm from '@/components/VenueForm';
import { Venue } from '@/types';

export default function NewVenuePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      await venueService.create({
        name: data.name,
        address: data.address,
        contactDetails: {
          email: data.contactDetails.email,
          phone: data.contactDetails.phone,
        },
        notes: data.notes,
      });
      router.push('/venues');
    } catch (error) {
      console.error('Error creating venue:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Venue</h1>
        <p className="mt-2 text-gray-600">Create a new football venue</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <VenueForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
