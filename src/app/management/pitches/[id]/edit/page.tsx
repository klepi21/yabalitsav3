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
import { pitchService, blockedDateService } from '@/lib/firebase-services';
import { Pitch, BlockedDate } from '@/types';

// Form validation schema
// Time slot validation schema
const timeSlotSchema = z.object({
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Μη έγκυρη ώρα (HH:MM)'),
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Μη έγκυρη ώρα (HH:MM)')
}).refine(data => {
  // Ensure end time is after start time
  const [startHour, startMin] = data.start.split(':').map(Number);
  const [endHour, endMin] = data.end.split(':').map(Number);
  const startMins = startHour * 60 + startMin;
  const endMins = endHour * 60 + endMin;
  return endMins > startMins;
}, {
  message: 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης',
  path: ['end']
});

const pitchEditSchema = z.object({
  name: z.string().min(1, 'Το όνομα του γηπέδου είναι υποχρεωτικό'),
  type: z.string().min(1, 'Ο τύπος του γηπέδου είναι υποχρεωτικός'),
  pricePerSlot: z.number().min(0, 'Η τιμή πρέπει να είναι θετική'),
  slotDuration: z.number().min(15, 'Η διάρκεια πρέπει να είναι τουλάχιστον 15 λεπτά'),
  defaultOpeningHours: z.object({
    monday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    }),
    tuesday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    }),
    wednesday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    }),
    thursday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    }),
    friday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    }),
    saturday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    }),
    sunday: z.object({
      isOpen: z.boolean(),
      slots: z.array(timeSlotSchema)
    })
  })
}).refine(data => {
  // Validate that each day's slots don't overlap
  const validateDaySlots = (slots: { start: string; end: string }[]) => {
    if (!slots.length) return true;
    const sortedSlots = [...slots].sort((a, b) => {
      const [aHour, aMin] = a.start.split(':').map(Number);
      const [bHour, bMin] = b.start.split(':').map(Number);
      return (aHour * 60 + aMin) - (bHour * 60 + bMin);
    });
    
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const [endHour, endMin] = sortedSlots[i].end.split(':').map(Number);
      const [nextStartHour, nextStartMin] = sortedSlots[i + 1].start.split(':').map(Number);
      const endMins = endHour * 60 + endMin;
      const nextStartMins = nextStartHour * 60 + nextStartMin;
      if (endMins >= nextStartMins) return false;
    }
    return true;
  };

  return Object.values(data.defaultOpeningHours).every(day => 
    !day.isOpen || validateDaySlots(day.slots)
  );
}, {
  message: 'Τα χρονικά διαστήματα δεν πρέπει να επικαλύπτονται',
  path: ['defaultOpeningHours']
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
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddBlockedDate, setShowAddBlockedDate] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    isFullDay: true
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PitchEditFormData>({
    resolver: zodResolver(pitchEditSchema),
    defaultValues: {
      defaultOpeningHours: {
        monday: { isOpen: false, slots: [] },
        tuesday: { isOpen: false, slots: [] },
        wednesday: { isOpen: false, slots: [] },
        thursday: { isOpen: false, slots: [] },
        friday: { isOpen: false, slots: [] },
        saturday: { isOpen: false, slots: [] },
        sunday: { isOpen: false, slots: [] }
      }
    }
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
        
        // Ensure each day has a slots array
        const formattedData = {
          ...pitchData,
          defaultOpeningHours: Object.entries(pitchData.defaultOpeningHours).reduce((acc, [day, hours]) => ({
            ...acc,
            [day]: {
              isOpen: hours.isOpen,
              slots: hours.slots || []
            }
          }), {})
        };
        
        reset(formattedData);
        
        // Load blocked dates for this pitch
        const blockedDatesData = await blockedDateService.getByPitch(pitchId);
        setBlockedDates(blockedDatesData);
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
      // Clean up the opening hours data
      const cleanedOpeningHours = Object.entries(data.defaultOpeningHours).reduce((acc, [day, hours]) => ({
        ...acc,
        [day]: {
          isOpen: hours.isOpen,
          slots: hours.isOpen ? hours.slots.filter(slot => slot.start && slot.end) : []
        }
      }), {});

      console.log('Saving pitch data:', {
        ...data,
        defaultOpeningHours: cleanedOpeningHours,
        type: assertPitchType(data.type)
      });

      await pitchService.update(pitch.id, {
        ...data,
        defaultOpeningHours: cleanedOpeningHours,
        type: assertPitchType(data.type)
      });
      
      router.push(`/management/pitches/${pitch.id}`);
    } catch (error) {
      console.error('Error updating pitch:', error);
      setError('Failed to update pitch');
    } finally {
      setIsSaving(false);
    }
  };

  const addBlockedDate = async () => {
    if (!pitch || !newBlockedDate.startDate || !newBlockedDate.endDate) return;
    
    try {
      await blockedDateService.create({
        pitchId: pitch.id,
        venueId: pitch.venueId,
        startDate: new Date(newBlockedDate.startDate),
        endDate: new Date(newBlockedDate.endDate),
        reason: newBlockedDate.reason || 'Δεν έχει οριστεί λόγος',
        isFullDay: newBlockedDate.isFullDay
      });
      
      // Reset form and reload blocked dates
      setNewBlockedDate({ startDate: '', endDate: '', reason: '', isFullDay: true });
      setShowAddBlockedDate(false);
      await loadPitchData(pitch.id);
    } catch (error) {
      console.error('Error adding blocked date:', error);
      setError('Αποτυχία προσθήκης κλειστής ημερομηνίας');
    }
  };

  const removeBlockedDate = async (blockedDateId: string) => {
    if (!pitch) return;
    
    try {
      await blockedDateService.delete(blockedDateId);
      await loadPitchData(pitch.id);
    } catch (error) {
      console.error('Error removing blocked date:', error);
      setError('Αποτυχία διαγραφής κλειστής ημερομηνίας');
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
          href="/management/pitches"
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
          href={`/management/pitches/${pitch.id}`}
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
                      <div className="space-y-3">
                        {/* Existing time slots */}
                        {watch(`defaultOpeningHours.${day}.slots`)?.map((slot: any, index: number) => (
                          <div key={index} className="flex items-end gap-2">
                            <div>
                              <label className="block text-xs text-gray-500">Άνοιγμα</label>
                              <input
                                type="text"
                                placeholder="HH:MM"
                                pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                                {...register(`defaultOpeningHours.${day}.slots.${index}.start`)}
                                className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value && !value.includes(':')) {
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
                                {...register(`defaultOpeningHours.${day}.slots.${index}.end`)}
                                className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value && !value.includes(':')) {
                                    const formatted = value.padStart(4, '0').replace(/(\d{2})(\d{2})/, '$1:$2');
                                    e.target.value = formatted;
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const slots = watch(`defaultOpeningHours.${day}.slots`) || [];
                                const newSlots = [...slots];
                                newSlots.splice(index, 1);
                                setValue(`defaultOpeningHours.${day}.slots`, newSlots);
                              }}
                              className="text-red-600 hover:text-red-800 px-2 py-1"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        
                        {/* Add new slot button */}
                        <button
                          type="button"
                          onClick={() => {
                            const slots = watch(`defaultOpeningHours.${day}.slots`) || [];
                            setValue(`defaultOpeningHours.${day}.slots`, [...slots, { start: '', end: '' }]);
                          }}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          + Προσθήκη διαστήματος
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Blocked Dates Management */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">🚫 Κλειστές Ημερομηνίες</h3>
                <button
                  type="button"
                  onClick={() => setShowAddBlockedDate(!showAddBlockedDate)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {showAddBlockedDate ? 'Ακύρωση' : 'Προσθήκη Κλειστής Ημερομηνίας'}
                </button>
              </div>

              {/* Add Blocked Date Form */}
              {showAddBlockedDate && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ημερομηνία Έναρξης *
                      </label>
                      <input
                        type="date"
                        value={newBlockedDate.startDate}
                        onChange={(e) => setNewBlockedDate({...newBlockedDate, startDate: e.target.value})}
                        className="block w-full text-sm border border-gray-300 rounded px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ημερομηνία Λήξης *
                      </label>
                      <input
                        type="date"
                        value={newBlockedDate.endDate}
                        onChange={(e) => setNewBlockedDate({...newBlockedDate, endDate: e.target.value})}
                        className="block w-full text-sm border border-gray-300 rounded px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Λόγος Κλεισίματος
                    </label>
                    <input
                      type="text"
                      value={newBlockedDate.reason}
                      onChange={(e) => setNewBlockedDate({...newBlockedDate, reason: e.target.value})}
                      placeholder="π.χ. Συντήρηση, Ειδική Εκδήλωση"
                      className="block w-full text-sm border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="isFullDay"
                      checked={newBlockedDate.isFullDay}
                      onChange={(e) => setNewBlockedDate({...newBlockedDate, isFullDay: e.target.checked})}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isFullDay" className="ml-2 text-sm text-gray-700">
                      Κλείσιμο όλης της ημέρας
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addBlockedDate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Προσθήκη Κλειστής Ημερομηνίας
                  </button>
                </div>
              )}

              {/* Existing Blocked Dates */}
              {blockedDates.length > 0 ? (
                <div className="space-y-3">
                  {blockedDates.map((blockedDate) => (
                    <div key={blockedDate.id} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="font-medium text-gray-900">
                              {new Date(blockedDate.startDate).toLocaleDateString('el-GR')}
                              {blockedDate.startDate !== blockedDate.endDate && 
                                ` - ${new Date(blockedDate.endDate).toLocaleDateString('el-GR')}`
                              }
                            </span>
                            <span className="text-red-600 font-medium">
                              {blockedDate.isFullDay ? 'Όλη η ημέρα' : 'Συγκεκριμένες ώρες'}
                            </span>
                          </div>
                          {blockedDate.reason && (
                            <p className="text-gray-600 text-sm mt-1">{blockedDate.reason}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBlockedDate(blockedDate.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Διαγραφή"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Δεν υπάρχουν κλειστές ημερομηνίες για αυτό το γήπεδο.</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <Link
                href={`/management/pitches/${pitch.id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
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
