'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  StarIcon
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
});

type VenueSettingsFormData = z.infer<typeof venueSettingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  // Pricing VAT helpers
  const VAT_RATE = 0.24;
  const calcFinal = (amount: number) => (amount * (1 + VAT_RATE)).toFixed(2);
  const BASIC_PRICE = 25;
  const PRO_PRICE = 45;
  const ENTERPRISE_PRICE = 75;
  const HYBRID_BASE = 20;
  const HYBRID_PER_BOOKING = 0.75;
  
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
            email: venueData.email || '',
            phone: venueData.phone || '',
          },
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
        email: data.contactDetails.email,
        phone: data.contactDetails.phone,
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

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Left Column: Venue Information */}
        <div className="space-y-6">
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
        </div>

        {/* Right Column: Current Plan & Pricing Packages */}
        <div className="space-y-6">
          {/* Current Plan Info */}
          {venue && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Τρέχον Πλάνο</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Υπόλοιπο ημερών:</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {venue.daysRemaining ?? 0} ημέρες
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Τρέχον πλάνο:</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      Πλήρες Διαχειριστικό (Trial)
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Μετά τη λήξη του trial θα χρειαστεί ενεργοποίηση πληρωμών. 
                    Επικοινωνήστε μαζί μας για αναβάθμιση ή αλλαγή πλάνου.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Plans */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Επιλέξτε το Πλάνο Σας</h3>
                <p className="text-sm text-gray-600">Διαλέξτε το πλάνο που ταιριάζει καλύτερα στις ανάγκες του γηπέδου σας</p>
              </div>

              {/* Option 1: Subscription Plans */}
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full mr-2">ΕΠΙΛΟΓΗ 1</span>
                  SUBSCRIPTION PLANS
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Basic Plan */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-gray-900">Basic</h5>
                        <p className="text-xs text-gray-600">1 γήπεδο, απεριόριστες κρατήσεις</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">€{BASIC_PRICE} <span className="text-[10px] align-top">+ΦΠΑ</span></div>
                        <div className="text-xs text-gray-500">/μήνα €{calcFinal(BASIC_PRICE)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <button className="w-full bg-gray-600 text-white py-1.5 px-3 rounded text-xs hover:bg-gray-700 transition-colors">
                        Επιλογή
                      </button>
                    </div>
                  </div>

                  {/* Pro Plan */}
                  <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 p-3 hover:shadow-md transition-all duration-300">
                    <div className="absolute -top-2 right-2">
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center">
                        <StarIcon className="w-3 h-3 mr-1" />
                        ΠΟΛΥ ΣΥΝΗΘΙΣΜΕΝΟ
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-blue-900">Pro</h5>
                        <p className="text-xs text-blue-700">2-3 γήπεδα, απεριόριστες κρατήσεις</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-900">€{PRO_PRICE} <span className="text-[10px] align-top">+ΦΠΑ</span></div>
                        <div className="text-xs text-blue-600">/μήνα €{calcFinal(PRO_PRICE)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <button className="w-full bg-blue-600 text-white py-1.5 px-3 rounded text-xs hover:bg-blue-700 transition-colors">
                        Επιλογή
                      </button>
                    </div>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-300 p-3 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-purple-900">Enterprise</h5>
                        <p className="text-xs text-purple-700">3+ γήπεδα, unique booking link</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-900">€{ENTERPRISE_PRICE} <span className="text-[10px] align-top">+ΦΠΑ</span></div>
                        <div className="text-xs text-purple-600">/μήνα €{calcFinal(ENTERPRISE_PRICE)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <button className="w-full bg-purple-600 text-white py-1.5 px-3 rounded text-xs hover:bg-purple-700 transition-colors">
                        Επιλογή
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Hybrid Pay-Per-Booking */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full mr-2">ΕΠΙΛΟΓΗ 2</span>
                  HYBRID PAY-PER-BOOKING
                </h4>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-900 mb-1">€{HYBRID_BASE} +ΦΠΑ</div>
                    <div className="text-xs text-green-700 mb-1">/μήνα (base) €{calcFinal(HYBRID_BASE)}</div>
                    <div className="text-base font-bold text-green-800 mb-1">+ €{HYBRID_PER_BOOKING} +ΦΠΑ</div>
                    <div className="text-xs text-green-700 mb-2">/κράτηση €{calcFinal(HYBRID_PER_BOOKING)}</div>
                    <h5 className="text-sm font-bold text-green-900 mb-2">Pay-Per-Booking</h5>
                    <p className="text-xs text-green-600">
                      <span className="font-semibold">Επικοινωνήστε μαζί μας</span> για περισσότερες πληροφορίες
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
