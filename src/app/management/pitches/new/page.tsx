'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { pitchService } from '@/lib/firebase-services';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
  }, [user, venueOwner, authLoading, router, pathname]);

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
        active: true,
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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
            <BreadcrumbPage>Νέο Γήπεδο</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Προσθήκη Νέου Γηπέδου</h1>
        <p className="mt-1 text-muted-foreground">Δημιουργία νέου γηπέδου για το χώρο σας</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Όνομα Γηπέδου *</Label>
                <Input
                  type="text"
                  id="name"
                  {...register('name')}
                  placeholder="π.χ., Κύριο Γήπεδο, Κλειστό 1"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Τύπος Γηπέδου *</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
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

              <div className="space-y-2">
                <Label htmlFor="slotDuration">Διάρκεια Κράτησης (λεπτά) *</Label>
                <Input
                  type="number"
                  id="slotDuration"
                  {...register('slotDuration', { valueAsNumber: true })}
                  placeholder="60"
                  min="30"
                  step="30"
                />
                {errors.slotDuration && (
                  <p className="text-sm text-destructive">{errors.slotDuration.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerSlot">Τιμή ανά Κράτηση (&euro;) *</Label>
                <Input
                  type="number"
                  id="pricePerSlot"
                  {...register('pricePerSlot', { valueAsNumber: true })}
                  placeholder="25.00"
                  min="0"
                  step="0.01"
                />
                {errors.pricePerSlot && (
                  <p className="text-sm text-destructive">{errors.pricePerSlot.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Opening Hours (multi-slot) */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Προεπιλεγμένες Ώρες Λειτουργίας</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => {
                  const openingHours = watch('defaultOpeningHours');
                  const dayData = openingHours[day];
                  const daySlots = dayData?.slots || [];
                  return (
                  <div key={day} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="capitalize">
                        {day === 'monday' ? 'Δευτέρα' :
                         day === 'tuesday' ? 'Τρίτη' :
                         day === 'wednesday' ? 'Τετάρτη' :
                         day === 'thursday' ? 'Πέμπτη' :
                         day === 'friday' ? 'Παρασκευή' :
                         day === 'saturday' ? 'Σάββατο' : 'Κυριακή'}
                      </Label>
                      <input
                        type="checkbox"
                        {...register(`defaultOpeningHours.${day}.isOpen`)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                      />
                    </div>
                    {dayData?.isOpen && (
                      <div className="space-y-3">
                        {daySlots.map((_: { start: string; end: string }, index: number) => (
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
                                  const v = e.target.value; if (v && !v.includes(':')) e.target.value = v.padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2');
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
                                  const v = e.target.value; if (v && !v.includes(':')) e.target.value = v.padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2');
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                const next = [...daySlots]; next.splice(index,1);
                                setValue(`defaultOpeningHours.${day}.slots`, next);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setValue(`defaultOpeningHours.${day}.slots`, [...daySlots, { start: '', end: '' }]);
                          }}
                          className="text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Προσθήκη διαστήματος
                        </Button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" asChild>
                <Link href="/management/pitches">
                  Ακύρωση
                </Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Δημιουργία...' : 'Δημιουργία Γηπέδου'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
