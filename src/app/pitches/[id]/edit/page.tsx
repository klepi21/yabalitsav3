'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService } from '@/lib/firebase-services';
import { Pitch } from '@/types';

// Form validation schema
const pitchEditSchema = z.object({
  name: z.string().min(1, 'Το όνομα του γηπέδου είναι υποχρεωτικό'),
  type: z.string().min(1, 'Ο τύπος του γηπέδου είναι υποχρεωτικός'),
  pricePerSlot: z.number().min(0, 'Η τιμή πρέπει να είναι θετική'),
  slotDuration: z.number().min(15, 'Η διάρκεια πρέπει να είναι τουλάχιστον 15 λεπτά'),
  defaultOpeningHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    friday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    saturday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    }),
    sunday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean()
    })
  })
});

type PitchEditFormData = z.infer<typeof pitchEditSchema>;

// Type assertion to ensure type compatibility
const assertPitchType = (type: string): Pitch['type'] => {
  if (['5x5', '6x6', '7x7', '8x8', '9x9'].includes(type)) {
    return type as Pitch['type'];
  }
  return '5x5'; // default
};

export default function EditPitchPage() {
  const router = useRouter();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PitchEditFormData>({
    resolver: zodResolver(pitchEditSchema),
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (params.id) {
      loadPitchData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id]);

  const loadPitchData = async (pitchId: string) => {
    try {
      const pitchData = await pitchService.getById(pitchId);
      if (pitchData) {
        setPitch(pitchData);
        reset(pitchData);
      }
    } catch (error) {
      console.error('Error loading pitch data:', error);
      setError('Failed to load pitch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data: PitchEditFormData) => {
    if (!pitch) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await pitchService.update(pitch.id, {
        ...data,
        type: assertPitchType(data.type)
      });
      router.push(`/pitches/${pitch.id}`);
    } catch (error) {
      console.error('Error updating pitch:', error);
      setError('Failed to update pitch');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Pitch not found</h3>
        <p className="mt-1 text-sm text-gray-500">The pitch you're looking for doesn't exist.</p>
        <Link
          href="/pitches"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Pitches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/pitches/${pitch.id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στις Λεπτομέρειες Γηπέδου
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Επεξεργασία Γηπέδου</h1>
        <p className="mt-2 text-gray-600">Ενημέρωση πληροφοριών γηπέδου</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Όνομα Γηπέδου
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    placeholder="Εισάγετε όνομα γηπέδου"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Τύπος
                </label>
                <div className="mt-1">
                  <select
                    id="type"
                    {...register('type')}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                  >
                    <option value="">Επιλέξτε τύπο</option>
                    <option value="5x5">5x5</option>
                    <option value="6x6">6x6</option>
                    <option value="7x7">7x7</option>
                    <option value="8x8">8x8</option>
                    <option value="9x9">9x9</option>
                  </select>
                </div>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>


            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="pricePerSlot" className="block text-sm font-medium text-gray-700">
                  Τιμή ανά Κράτηση (€)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    id="pricePerSlot"
                    {...register('pricePerSlot', { valueAsNumber: true })}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
                {errors.pricePerSlot && (
                  <p className="mt-1 text-sm text-red-600">{errors.pricePerSlot.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="slotDuration" className="block text-sm font-medium text-gray-700">
                  Διάρκεια Κράτησης (λεπτά)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="slotDuration"
                    {...register('slotDuration', { valueAsNumber: true })}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    placeholder="60"
                  />
                </div>
                {errors.slotDuration && (
                  <p className="mt-1 text-sm text-red-600">{errors.slotDuration.message}</p>
                )}
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <div className="flex items-center mb-4">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Ώρες Λειτουργίας</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                  <div key={day} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700 capitalize">
                        {day === 'monday' ? 'Δευτέρα' :
                         day === 'tuesday' ? 'Τρίτη' :
                         day === 'wednesday' ? 'Τετάρτη' :
                         day === 'thursday' ? 'Πέμπτη' :
                         day === 'friday' ? 'Παρασκευή' :
                         day === 'saturday' ? 'Σάββατο' :
                         day === 'sunday' ? 'Κυριακή' : day}
                      </label>
                      <input
                        type="checkbox"
                        {...register(`defaultOpeningHours.${day}.isOpen`)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    {watch(`defaultOpeningHours.${day}.isOpen`) && (
                      <div className="grid grid-cols-2 gap-2">
                                                 <div>
                           <label className="block text-xs text-gray-500">Άνοιγμα</label>
                           <input
                             type="text"
                             placeholder="HH:MM"
                             pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                             {...register(`defaultOpeningHours.${day}.open`, {
                               setValueAs: (value) => {
                                 if (!value) return '';
                                 // Convert 12h to 24h format
                                 const [time, period] = value.split(' ');
                                 if (period === 'PM' && time !== '12:00') {
                                   const [hours, minutes] = time.split(':');
                                   return `${parseInt(hours) + 12}:${minutes}`;
                                 } else if (period === 'AM' && time === '12:00') {
                                   return '00:00';
                                 }
                                 return value;
                               }
                             })}
                             className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                             onBlur={(e) => {
                               const value = e.target.value;
                               if (value && !value.includes(':')) {
                                 // If user enters just numbers, format as HH:MM
                                 const formatted = value.padStart(4, '0').replace(/(\d{2})(\d{2})/, '$1:$2');
                                 e.target.value = formatted;
                               }
                             }}
                           />
                         </div>
                         <div>
                           <label className="block text-xs text-gray-500">Κλείσιμο</label>
                           <input
                             type="text"
                             placeholder="HH:MM"
                             pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                             {...register(`defaultOpeningHours.${day}.close`, {
                               setValueAs: (value) => {
                                 if (!value) return '';
                                 // Convert 12h to 24h format
                                 const [time, period] = value.split(' ');
                                 if (period === 'PM' && time !== '12:00') {
                                   const [hours, minutes] = time.split(':');
                                   return `${parseInt(hours) + 12}:${minutes}`;
                                 } else if (period === 'AM' && time === '12:00') {
                                   return '00:00';
                                 }
                                 return value;
                               }
                             })}
                             className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                             onBlur={(e) => {
                               const value = e.target.value;
                               if (value && !value.includes(':')) {
                                 // If user enters just numbers, format as HH:MM
                                 const formatted = value.padStart(4, '0').replace(/(\d{2})(\d{2})/, '$1:$2');
                                 e.target.value = formatted;
                               }
                             }}
                           />
                         </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <Link
                href={`/pitches/${pitch.id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
              >
                Ακύρωση
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
