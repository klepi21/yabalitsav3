'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Ban,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService, blockedDateService } from '@/lib/firebase-services';
import { Pitch, BlockedDate, getOpeningSlots } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
  const pathname = usePathname();
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

  const loadPitchData = useCallback(async (pitchId: string) => {
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
              slots: getOpeningSlots(hours)
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
  }, [reset]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (params.id) {
      loadPitchData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id, loadPitchData, pathname]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Pitch not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">The pitch you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild className="mt-4">
          <Link href="/management/pitches">
            Back to Pitches
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Πίνακας Ελέγχου</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/management/pitches">Γήπεδα</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/management/pitches/${pitch.id}`}>{pitch.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Επεξεργασία</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Επεξεργασία Γηπέδου</h1>
        <p className="mt-1 text-muted-foreground">Ενημέρωση πληροφοριών γηπέδου</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {/* Edit Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Όνομα Γηπέδου</Label>
                <Input
                  type="text"
                  id="name"
                  {...register('name')}
                  placeholder="Εισάγετε όνομα γηπέδου"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Τύπος</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Επιλέξτε τύπο</option>
                  <option value="5x5">5x5</option>
                  <option value="6x6">6x6</option>
                  <option value="7x7">7x7</option>
                  <option value="8x8">8x8</option>
                  <option value="9x9">9x9</option>
                </select>
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pricePerSlot">Τιμή ανά Κράτηση (&euro;)</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="pricePerSlot"
                  {...register('pricePerSlot', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.pricePerSlot && (
                  <p className="text-sm text-destructive">{errors.pricePerSlot.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slotDuration">Διάρκεια Κράτησης (λεπτά)</Label>
                <Input
                  type="number"
                  id="slotDuration"
                  {...register('slotDuration', { valueAsNumber: true })}
                  placeholder="60"
                />
                {errors.slotDuration && (
                  <p className="text-sm text-destructive">{errors.slotDuration.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Opening Hours */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium text-foreground">Ώρες Λειτουργίας</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                  <div key={day} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="capitalize">
                        {day === 'monday' ? 'Δευτέρα' :
                         day === 'tuesday' ? 'Τρίτη' :
                         day === 'wednesday' ? 'Τετάρτη' :
                         day === 'thursday' ? 'Πέμπτη' :
                         day === 'friday' ? 'Παρασκευή' :
                         day === 'saturday' ? 'Σάββατο' :
                         day === 'sunday' ? 'Κυριακή' : day}
                      </Label>
                      <input
                        type="checkbox"
                        {...register(`defaultOpeningHours.${day}.isOpen`)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                      />
                    </div>

                    {watch(`defaultOpeningHours.${day}.isOpen`) && (
                      <div className="space-y-3">
                        {/* Existing time slots */}
                        {watch(`defaultOpeningHours.${day}.slots`)?.map((_slot: { start: string; end: string }, index: number) => (
                          <div key={index} className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Άνοιγμα</Label>
                              <Input
                                type="text"
                                placeholder="HH:MM"
                                pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                                {...register(`defaultOpeningHours.${day}.slots.${index}.start`)}
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value && !value.includes(':')) {
                                    const formatted = value.padStart(4, '0').replace(/(\d{2})(\d{2})/, '$1:$2');
                                    e.target.value = formatted;
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Κλείσιμο</Label>
                              <Input
                                type="text"
                                placeholder="HH:MM"
                                pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                                {...register(`defaultOpeningHours.${day}.slots.${index}.end`)}
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value && !value.includes(':')) {
                                    const formatted = value.padStart(4, '0').replace(/(\d{2})(\d{2})/, '$1:$2');
                                    e.target.value = formatted;
                                  }
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                const slots = watch(`defaultOpeningHours.${day}.slots`) || [];
                                const newSlots = [...slots];
                                newSlots.splice(index, 1);
                                setValue(`defaultOpeningHours.${day}.slots`, newSlots);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}

                        {/* Add new slot button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const slots = watch(`defaultOpeningHours.${day}.slots`) || [];
                            setValue(`defaultOpeningHours.${day}.slots`, [...slots, { start: '', end: '' }]);
                          }}
                          className="text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Προσθήκη διαστήματος
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Blocked Dates Management */}
            <div className="bg-muted rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                  <Ban className="h-5 w-5 text-destructive" />
                  Κλειστές Ημερομηνίες
                </h3>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowAddBlockedDate(!showAddBlockedDate)}
                >
                  {showAddBlockedDate ? 'Ακύρωση' : 'Προσθήκη Κλειστής Ημερομηνίας'}
                </Button>
              </div>

              {/* Add Blocked Date Form */}
              {showAddBlockedDate && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Ημερομηνία Έναρξης *</Label>
                        <Input
                          type="date"
                          value={newBlockedDate.startDate}
                          onChange={(e) => setNewBlockedDate({...newBlockedDate, startDate: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ημερομηνία Λήξης *</Label>
                        <Input
                          type="date"
                          value={newBlockedDate.endDate}
                          onChange={(e) => setNewBlockedDate({...newBlockedDate, endDate: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <Label>Λόγος Κλεισίματος</Label>
                      <Input
                        type="text"
                        value={newBlockedDate.reason}
                        onChange={(e) => setNewBlockedDate({...newBlockedDate, reason: e.target.value})}
                        placeholder="π.χ. Συντήρηση, Ειδική Εκδήλωση"
                      />
                    </div>
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="isFullDay"
                        checked={newBlockedDate.isFullDay}
                        onChange={(e) => setNewBlockedDate({...newBlockedDate, isFullDay: e.target.checked})}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                      />
                      <Label htmlFor="isFullDay" className="ml-2">
                        Κλείσιμο όλης της ημέρας
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={addBlockedDate}
                    >
                      Προσθήκη Κλειστής Ημερομηνίας
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Existing Blocked Dates */}
              {blockedDates.length > 0 ? (
                <div className="space-y-3">
                  {blockedDates.map((blockedDate) => (
                    <Card key={blockedDate.id} className="border-destructive/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="font-medium text-foreground">
                                {new Date(blockedDate.startDate).toLocaleDateString('el-GR')}
                                {blockedDate.startDate !== blockedDate.endDate &&
                                  ` - ${new Date(blockedDate.endDate).toLocaleDateString('el-GR')}`
                                }
                              </span>
                              <Badge variant="destructive" className="text-xs">
                                {blockedDate.isFullDay ? 'Όλη η ημέρα' : 'Συγκεκριμένες ώρες'}
                              </Badge>
                            </div>
                            {blockedDate.reason && (
                              <p className="text-muted-foreground text-sm mt-1">{blockedDate.reason}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeBlockedDate(blockedDate.id)}
                            className="text-destructive hover:text-destructive"
                            title="Διαγραφή"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Δεν υπάρχουν κλειστές ημερομηνίες για αυτό το γήπεδο.</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" asChild>
                <Link href={`/management/pitches/${pitch.id}`}>
                  Ακύρωση
                </Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
