'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Venue } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Form validation schema
const venueSettingsSchema = z.object({
  name: z.string().min(1, 'Το όνομα του γηπέδου είναι υποχρεωτικό'),
  address: z.string().min(1, 'Η διεύθυνση είναι υποχρεωτική'),
  city: z.string().min(1, 'Η πόλη είναι υποχρεωτική'),
  contactDetails: z.object({
    email: z.string().email('Μη έγκυρη διεύθυνση email'),
    phone: z.string().min(1, 'Ο αριθμός τηλεφώνου είναι υποχρεωτικός'),
  }),
  notes: z.string().optional(),
});

type VenueSettingsFormData = z.infer<typeof venueSettingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VenueSettingsFormData>({
    resolver: zodResolver(venueSettingsSchema),
  });

  // Load venue data and check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    loadVenueData();
  }, [user, venueOwner, authLoading, router]);

  const loadVenueData = async () => {
    if (!venueOwner) return;
    
    setIsLoading(true);
    try {
      const venueData = await venueService.getById(venueOwner.venueId);
      setVenue(venueData);
      
      if (venueData) {
        reset({
          name: venueData.name,
          address: venueData.address,
          city: venueData.city || 'Αθήνα', // Default to Athens if not set
          contactDetails: {
            email: venueData.contactDetails.email,
            phone: venueData.contactDetails.phone,
          },
          notes: venueData.notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
      setError('Αποτυχία φόρτωσης δεδομένων γηπέδου');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data: VenueSettingsFormData) => {
    if (!venue || !venueOwner) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await venueService.update(venue.id, {
        name: data.name,
        address: data.address,
        city: data.city,
        contactDetails: {
          email: data.contactDetails.email,
          phone: data.contactDetails.phone,
        },
        notes: data.notes,
      });
      
      setSuccess('Οι ρυθμίσεις του γηπέδου ενημερώθηκαν επιτυχώς!');
      
      // Reload venue data to get the updated information
      await loadVenueData();
    } catch (error) {
      console.error('Error updating venue settings:', error);
      setError('Αποτυχία ενημέρωσης ρυθμίσεων γηπέδου');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !venueOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoading) {
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
          href="/management/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ρυθμίσεις Γηπέδου</h1>
        <p className="mt-2 text-gray-600">Διαμόρφωση προτιμήσεων και ρυθμίσεων του γηπέδου σας</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}
      
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Venue Settings Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">Πληροφορίες Γηπέδου</h3>
          </div>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Venue Name */}
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

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Διεύθυνση
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="address"
                  {...register('address')}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                  placeholder="Εισάγετε διεύθυνση γηπέδου"
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                Πόλη
              </label>
              <div className="mt-1">
                <select
                  id="city"
                  {...register('city')}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 bg-white placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                >
                  <option value="Αθήνα">Αθήνα</option>
                  <option value="Θεσσαλονίκη">Θεσσαλονίκη</option>
                  <option value="Πάτρα">Πάτρα</option>
                </select>
              </div>
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Διεύθυνση Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email"
                    {...register('contactDetails.email')}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    placeholder="Εισάγετε διεύθυνση email"
                  />
                </div>
                {errors.contactDetails?.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactDetails.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Αριθμός Τηλεφώνου
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    id="phone"
                    {...register('contactDetails.phone')}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                    placeholder="Εισάγετε αριθμό τηλεφώνου"
                  />
                </div>
                {errors.contactDetails?.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactDetails.phone.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Σημειώσεις
              </label>
              <div className="mt-1">
                <textarea
                  id="notes"
                  rows={4}
                  {...register('notes')}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
                  placeholder="Προσθέστε τυχόν επιπλέον σημειώσεις για το γήπεδό σας"
                />
              </div>
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
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

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Subscription Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Συνδρομή & Πλάνο</h3>
          {venue && (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Υπόλοιπο ημερών:</span>{' '}
                <span className="text-green-700 font-semibold">{(venue as any).daysRemaining ?? 0} ημέρες</span>
              </div>

              <div className="max-w-md">
                <div className={`rounded-xl border p-4 ${((venue as any).plan==='subscription') ? 'border-green-600' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-semibold text-black">Πλήρες Διαχειριστικό</div>
                      <div className="text-gray-600">30€ / μήνα</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">Μετά τη λήξη του trial θα χρειαστεί ενεργοποίηση πληρωμών. Επικοινωνήστε μαζί μας για αναβάθμιση ή αλλαγή πλάνου.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
