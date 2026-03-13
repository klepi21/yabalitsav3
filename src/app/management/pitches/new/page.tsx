'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { pitchService } from '@/lib/firebase-services';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Multi-slot schema (aligned with edit page)
const timeSlotSchema = z.object({
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Μη έγκυρη ώρα (HH:MM)'),
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Μη έγκυρη ώρα (HH:MM)')
}).refine(data => {
  const [sh, sm] = data.start.split(':').map(Number);
  const [eh, em] = data.end.split(':').map(Number);
  return eh * 60 + em > sh * 60 + sm;
}, { message: 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης', path: ['end'] });

const pitchSchema = z.object({
  name: z.string().min(1, 'Το όνομα του γηπέδου είναι υποχρεωτικό'),
  type: z.enum(['5x5', '6x6', '7x7', '8x8', '9x9']),
  slotDuration: z.number().min(30, 'Η διάρκεια πρέπει να είναι τουλάχιστον 30 λεπτά'),
  pricePerSlot: z.number().min(0, 'Η τιμή πρέπει να είναι θετική'),
  defaultOpeningHours: z.object({
    monday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) }),
    tuesday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) }),
    wednesday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) }),
    thursday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) }),
    friday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) }),
    saturday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) }),
    sunday: z.object({ isOpen: z.boolean(), slots: z.array(timeSlotSchema) })
  })
}).refine(data => {
  const overlapFree = (slots: { start: string; end: string }[]) => {
    const sorted = [...slots].sort((a,b)=>a.start.localeCompare(b.start));
    for (let i=0;i<sorted.length-1;i++) if (sorted[i].end > sorted[i+1].start) return false;
    return true;
  };
  return Object.values(data.defaultOpeningHours).every(d => !d.isOpen || overlapFree(d.slots));
}, { message: 'Τα χρονικά διαστήματα δεν πρέπει να επικαλύπτονται', path: ['defaultOpeningHours'] });

type PitchFormData = z.infer<typeof pitchSchema>;

const defaultOpeningHours = {
  monday: { isOpen: false, slots: [] as {start:string;end:string}[] },
  tuesday: { isOpen: false, slots: [] as {start:string;end:string}[] },
  wednesday: { isOpen: false, slots: [] as {start:string;end:string}[] },
  thursday: { isOpen: false, slots: [] as {start:string;end:string}[] },
  friday: { isOpen: false, slots: [] as {start:string;end:string}[] },
  saturday: { isOpen: false, slots: [] as {start:string;end:string}[] },
  sunday: { isOpen: false, slots: [] as {start:string;end:string}[] }
};

export default function NewPitchPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
  }, [user, venueOwner, authLoading, router]);

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
    if (!venueOwner) return;
    
    setIsLoading(true);
    try {
      await pitchService.create({
        venueId: venueOwner.venueId,
        name: data.name,
        type: data.type,
        slotDuration: data.slotDuration,
        pricePerSlot: data.pricePerSlot,
        defaultOpeningHours: data.defaultOpeningHours
      });
      
      router.push('/management/pitches');
    } catch (error) {
      console.error('Error creating pitch:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  if (authLoading || !venueOwner) {
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
          href="/management/pitches"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Προσθήκη Νέου Γηπέδου</h1>
        <p className="mt-2 text-gray-600">Δημιουργία νέου γηπέδου για το χώρο σας</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Όνομα Γηπέδου *
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-football-green focus:border-football-green sm:text-sm"
                placeholder="π.χ., Κύριο Γήπεδο, Κλειστό 1"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Τύπος Γηπέδου *
              </label>
              <select
                id="type"
                {...register('type')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-football-green focus:border-football-green sm:text-sm"
              >
                <option value="5x5">5x5</option>
                <option value="6x6">6x6</option>
                <option value="7x7">7x7</option>
                <option value="8x8">8x8</option>
                <option value="9x9">9x9</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>



            <div>
              <label htmlFor="slotDuration" className="block text-sm font-medium text-gray-700">
                Διάρκεια Κράτησης (λεπτά) *
              </label>
              <input
                type="number"
                id="slotDuration"
                {...register('slotDuration', { valueAsNumber: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-football-green focus:border-football-green sm:text-sm"
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
                Τιμή ανά Κράτηση (€) *
              </label>
              <input
                type="number"
                id="pricePerSlot"
                {...register('pricePerSlot', { valueAsNumber: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-football-green focus:border-football-green sm:text-sm"
                placeholder="25.00"
                min="0"
                step="0.01"
              />
              {errors.pricePerSlot && (
                <p className="mt-1 text-sm text-red-600">{errors.pricePerSlot.message}</p>
              )}
            </div>
          </div>

          {/* Opening Hours (multi-slot) */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Προεπιλεγμένες Ώρες Λειτουργίας</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => {
                const openingHours = watch('defaultOpeningHours');
                const dayData = openingHours[day];
                const daySlots = dayData?.slots || [];
                return (
                <div key={day} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {day === 'monday' ? 'Δευτέρα' :
                       day === 'tuesday' ? 'Τρίτη' :
                       day === 'wednesday' ? 'Τετάρτη' :
                       day === 'thursday' ? 'Πέμπτη' :
                       day === 'friday' ? 'Παρασκευή' :
                       day === 'saturday' ? 'Σάββατο' : 'Κυριακή'}
                    </label>
                    { }
                    <input
                      type="checkbox"
                      {...register(`defaultOpeningHours.${day}.isOpen`)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  { }
                  {dayData?.isOpen && (
                    <div className="space-y-3">
                      { }
                      {daySlots.map((_: { start: string; end: string }, index: number) => (
                        <div key={index} className="flex items-end gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Άνοιγμα</label>
                            { }
                            <input
                              type="text"
                              placeholder="HH:MM"
                              pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                              {...register(`defaultOpeningHours.${day}.slots.${index}.start`)}
                              className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                              onBlur={(e) => {
                                const v = e.target.value; if (v && !v.includes(':')) e.target.value = v.padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2');
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Κλείσιμο</label>
                            { }
                            <input
                              type="text"
                              placeholder="HH:MM"
                              pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                              {...register(`defaultOpeningHours.${day}.slots.${index}.end`)}
                              className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                              onBlur={(e) => {
                                const v = e.target.value; if (v && !v.includes(':')) e.target.value = v.padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2');
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...daySlots]; next.splice(index,1);
                              setValue(`defaultOpeningHours.${day}.slots`, next);
                            }}
                            className="text-red-600 hover:text-red-800 px-2 py-1"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setValue(`defaultOpeningHours.${day}.slots`, [...daySlots, { start: '', end: '' }]);
                        }}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        + Προσθήκη διαστήματος
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/management/pitches"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
            >
              Ακύρωση
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Δημιουργία...' : 'Δημιουργία Γηπέδου'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
