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
import { venueService, paymentService, subscriptionService } from '@/lib/firebase-services';
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

  // Utility function to safely format dates
  const formatDateSafely = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return date;
  };

  // Utility function to calculate days difference safely
  const calculateDaysDifference = (dateString: string | null | undefined) => {
    const date = formatDateSafely(dateString);
    if (!date) return null;
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


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
        
        // Load subscription data from the yabalitsa_subscriptions collection
        try {
          const subscriptionData = await subscriptionService.getByVenueIdField(venueOwner.venueId);
          if (subscriptionData) {
            setSubscription(subscriptionData);
          }
        } catch (subscriptionError) {
          console.error('Error loading subscription data:', subscriptionError);
          // Don't show error for subscription, just log it
        }
        
        // Load last payment data
        try {
          const payments = await paymentService.getBySubscriptionId(venueOwner.venueId);
          if (payments.length > 0) {
            // Sort by payment date and get the most recent
            const sortedPayments = payments.sort((a, b) => 
              new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
            );
            setLastPayment(sortedPayments[0]);
          }
        } catch (paymentError) {
          console.error('Error loading payment data:', paymentError);
          // Don't show error for payments, just log it
        }
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ρυθμίσεις Γηπέδου</h1>
          <p className="mt-2 text-gray-600">Διαμόρφωση προτιμήσεων και ρυθμίσεων του γηπέδου σας</p>
        </div>
        
        {/* Subscription Status Badge */}
        {venue && (
          <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
            venue.plan === 'subscription' 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
          }`}>
            {venue.plan === 'subscription' ? (
              <span>✨ {venue.planType || 'Pro'} Plan</span>
            ) : (
              <span>⚠️ Trial Account</span>
            )}
          </div>
        )}
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
                      {venue.plan === 'subscription' ? 'Συνδρομή' : 'Δωρεάν Trial'}
                    </div>
                    {venue.plan === 'subscription' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {subscription?.subscriptionPlan || venue.planType || 'Basic'} Plan
                      </div>
                    )}
                  </div>
                  
                  {/* Subscription End Date */}
                                        {venue.plan === 'subscription' && (
                        <div className="text-center mt-4">
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Λήγει στις:</span>
                          </div>
                          {subscription?.subscriptionEndDate ? (
                            (() => {
                              const endDate = formatDateSafely(subscription.subscriptionEndDate);
                              if (!endDate) {
                                return (
                                  <div className="text-lg font-semibold text-orange-600">
                                    ⚠️ Ημερομηνία δεν είναι έγκυρη
                                  </div>
                                );
                              }
                              
                              const diffDays = calculateDaysDifference(subscription.subscriptionEndDate);
                              if (diffDays === null) {
                                return (
                                  <div className="text-lg font-semibold text-orange-600">
                                    ⚠️ Δεν είναι δυνατός ο υπολογισμός ημερών
                                  </div>
                                );
                              }
                              
                              return (
                                <>
                                  <div className="text-lg font-semibold text-blue-700">
                                    {endDate.toLocaleDateString('el-GR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {diffDays > 0 ? `${diffDays} ημέρες ακόμα` : 
                                     diffDays === 0 ? 'Λήγει σήμερα!' : 
                                     `Έληξε πριν ${Math.abs(diffDays)} ημέρες`}
                                  </div>
                                </>
                              );
                            })()
                          ) : (
                            <div className="text-lg font-semibold text-gray-500">
                              Ημερομηνία λήξης δεν είναι διαθέσιμη
                            </div>
                          )}
                          
                          {/* Ανανέωση Συνδρομής Button - Πάντα ορατό */}
                          <div className="mt-3">
                            <Link 
                              href="/management/settings/renewal" 
                              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Ανανέωση Συνδρομής
                            </Link>
                          </div>
                        </div>
                      )}
                </div>
                
                <div className="mt-4 text-center">

                  

                </div>
              </div>
            </div>
          )}

          {/* Last Payment Info */}
          {venue && venue.plan === 'subscription' && lastPayment && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💳 Τελευταία Πληρωμή</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Ποσό:</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      €{lastPayment.amount}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {lastPayment.planName} Plan - {lastPayment.durationMonths} μήνες
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Ημερομηνία:</span>
                    </div>
                    <div className="text-lg font-semibold text-blue-700">
                      {new Date(lastPayment.paymentDate).toLocaleDateString('el-GR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {lastPayment.status === 'succeeded' ? 'Επιτυχής πληρωμή' : 'Εκκρεμεί'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">📊 Σύνοψη:</span> Πληρώθηκε το {lastPayment.planName} Plan για {lastPayment.durationMonths} μήνες
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      lastPayment.status === 'succeeded' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {lastPayment.status === 'succeeded' ? '✅ Επιτυχής' : '⏳ Εκκρεμεί'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
