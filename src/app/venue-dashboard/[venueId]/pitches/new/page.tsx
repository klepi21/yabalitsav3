'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { pitchService } from '@/lib/firebase-services';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const pitchSchema = z.object({
  name: z.string().min(1, 'Pitch name is required'),
  type: z.enum(['5x5', '6x6', '7x7', '8x8', '9x9']),
  size: z.string().min(1, 'Size is required'),
  slotDuration: z.number().min(30, 'Slot duration must be at least 30 minutes'),
  pricePerSlot: z.number().min(0, 'Price must be positive'),
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

type PitchFormData = z.infer<typeof pitchSchema>;

const defaultOpeningHours = {
  monday: { open: '09:00', close: '22:00', isOpen: true },
  tuesday: { open: '09:00', close: '22:00', isOpen: true },
  wednesday: { open: '09:00', close: '22:00', isOpen: true },
  thursday: { open: '09:00', close: '22:00', isOpen: true },
  friday: { open: '09:00', close: '22:00', isOpen: true },
  saturday: { open: '09:00', close: '22:00', isOpen: true },
  sunday: { open: '09:00', close: '22:00', isOpen: true }
};

export default function NewPitchPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<PitchFormData>({
    resolver: zodResolver(pitchSchema),
    defaultValues: {
      defaultOpeningHours
    }
  });

  const handleFormSubmit = async (data: PitchFormData) => {
    setIsLoading(true);
    try {
      await pitchService.create({
        venueId,
        name: data.name,
        type: data.type,
        slotDuration: data.slotDuration,
        pricePerSlot: data.pricePerSlot,
        defaultOpeningHours: data.defaultOpeningHours
      });
      
      router.push(`/venue-dashboard/${venueId}`);
    } catch (error) {
      console.error('Error creating pitch:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDayOpen = (day: string) => {
    const currentValue = watch(`defaultOpeningHours.${day}.isOpen` as any);
    setValue(`defaultOpeningHours.${day}.isOpen` as any, !currentValue);
  };

  // Check authentication and venue access
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    if (venueOwner.venueId !== venueId) {
      router.push(`/venue-dashboard/${venueOwner.venueId}`);
      return;
    }
  }, [venueId, user, venueOwner, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/venue-dashboard/${venueId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Pitch</h1>
        <p className="mt-2 text-gray-600">Create a new pitch for your venue</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Pitch Name *
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Main Pitch, Indoor 1"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Pitch Type *
              </label>
              <select
                id="type"
                {...register('type')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="5-a-side">5-a-side</option>
                <option value="7-a-side">7-a-side</option>
                <option value="futsal">Futsal</option>
                <option value="11-a-side">11-a-side</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                Size *
              </label>
              <input
                type="text"
                id="size"
                {...register('size')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 40m x 20m"
              />
              {errors.size && (
                <p className="mt-1 text-sm text-red-600">{errors.size.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="slotDuration" className="block text-sm font-medium text-gray-700">
                Slot Duration (minutes) *
              </label>
              <input
                type="number"
                id="slotDuration"
                {...register('slotDuration', { valueAsNumber: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="60"
                min="30"
                step="30"
              />
              {errors.slotDuration && (
                <p className="mt-1 text-sm text-red-600">{errors.slotDuration.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="pricePerSlot" className="block text-sm font-medium text-gray-700">
                Price per Slot (€) *
              </label>
              <input
                type="number"
                id="pricePerSlot"
                {...register('pricePerSlot', { valueAsNumber: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="25.00"
                min="0"
                step="0.01"
              />
              {errors.pricePerSlot && (
                <p className="mt-1 text-sm text-red-600">{errors.pricePerSlot.message}</p>
              )}
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Default Opening Hours</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(defaultOpeningHours).map(([day]) => (
                <div key={day} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {day}
                    </label>
                    <input
                      type="checkbox"
                      checked={watch(`defaultOpeningHours.${day}.isOpen` as any)}
                      onChange={() => toggleDayOpen(day)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  {watch(`defaultOpeningHours.${day}.isOpen` as any) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Open</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                          {...register(`defaultOpeningHours.${day}.open` as any, {
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
                          className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        <label className="block text-xs text-gray-500">Close</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                          {...register(`defaultOpeningHours.${day}.close` as any, {
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
                          className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/venue-dashboard/${venueId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Pitch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
