'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { venueService, paymentService } from '@/lib/firebase-services';
import { Venue } from '@/types';
import SupportEmail from '@/components/SupportEmail';
import { calculateDaysRemaining, getSubscriptionEndDate, formatDateSafely } from '@/lib/subscription-utils';

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


  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [lastPayment, setLastPayment] = useState<{
    id: string;
    venueId: string;
    stripePaymentIntentId: string;
    amount: number;
    status: string;
    paymentDate?: string;
    planName?: string;
    durationMonths?: number;
    paymentType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSavingPin, setIsSavingPin] = useState(false);


  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VenueSettingsFormData>({
    resolver: zodResolver(venueSettingsSchema),
  });

  const loadVenueData = useCallback(async () => {
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
        
        // Subscription data is now stored directly in venue document
        // No need to load from separate collection
        
        
        // Load last payment data
        try {
          const payments = await paymentService.getByVenueId(venueOwner.venueId);
          if (payments.length > 0) {
            // Sort by payment date and get the most recent
            const sortedPayments = payments.sort((a, b) => {
              const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
              const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
              return dateB - dateA;
            });
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
  }, [venueOwner, reset]);

  // Load venue data and check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    loadVenueData();
  }, [user, venueOwner, authLoading, router, loadVenueData]);

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

  // Util to hash PIN client-side using SubtleCrypto
  const hashStringSHA256 = async (value: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSetPin = async (pinA: string, pinB: string) => {
    if (!venue || !venueOwner) return;
    setPinError(null);
    setPinSuccess(null);
    if (!/^\d{4}$/.test(pinA) || !/^\d{4}$/.test(pinB)) {
      setPinError('Ο PIN πρέπει να είναι 4ψήφιος (μόνο αριθμοί).');
      return;
    }
    if (pinA !== pinB) {
      setPinError('Οι δύο νέοι PIN δεν ταιριάζουν.');
      return;
    }
    setIsSavingPin(true);
    try {
      const hash = await hashStringSHA256(pinA);
      await venueService.update(venue.id, { managementPinHash: hash });
      setPinSuccess('Ο PIN ορίστηκε επιτυχώς.');
      await loadVenueData();
    } catch (e) {
      console.error(e);
      setPinError('Αποτυχία αποθήκευσης PIN.');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleChangePin = async (oldPin: string, newPinA: string, newPinB: string) => {
    if (!venue || !venueOwner) return;
    setPinError(null);
    setPinSuccess(null);
    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPinA) || !/^\d{4}$/.test(newPinB)) {
      setPinError('Κάθε PIN πρέπει να είναι 4ψήφιος (μόνο αριθμοί).');
      return;
    }
    if (newPinA !== newPinB) {
      setPinError('Οι δύο νέοι PIN δεν ταιριάζουν.');
      return;
    }
    setIsSavingPin(true);
    try {
      const oldHash = await hashStringSHA256(oldPin);
      if (venue.managementPinHash && oldHash !== venue.managementPinHash) {
        setPinError('Ο τρέχων PIN δεν είναι σωστός.');
        setIsSavingPin(false);
        return;
      }
      const newHash = await hashStringSHA256(newPinA);
      await venueService.update(venue.id, { managementPinHash: newHash });
      setPinSuccess('Ο PIN ενημερώθηκε επιτυχώς.');
      await loadVenueData();
    } catch (e) {
      console.error(e);
      setPinError('Αποτυχία ενημέρωσης PIN.');
    } finally {
      setIsSavingPin(false);
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
        
        
        {/* Subscription Status Badge - matches SidebarWrapper logic */}
        {venue && (() => {
          const daysRemaining = calculateDaysRemaining(venue, lastPayment);
          
          if (venue.plan === 'subscription') {
            if (daysRemaining !== null && daysRemaining > 7) {
              // All OK - Green indicator
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 border border-green-300">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-green-800">
                    {venue.planType || 'Basic'} Plan
                  </span>
                  <span className="text-xs text-green-600">
                    ({daysRemaining} ημέρες)
                  </span>
                </div>
              );
            } else if (daysRemaining !== null && daysRemaining > 0) {
              // Warning - Expires soon
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 border border-amber-300">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-amber-800">
                    {venue.planType || 'Basic'} - {daysRemaining} ημέρες
                  </span>
                </div>
              );
            } else {
              // Expired
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 border border-red-300">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-red-800">
                    Πλάνο έληξε
                  </span>
                </div>
              );
            }
          } else {
            // Trial or No Plan
            return (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-300">
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-600">
                  {venue.plan === 'trial' ? 'Δωρεάν Trial' : 'Χωρίς Πλάνο'}
                </span>
              </div>
            );
          }
        })()}
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

      {pinSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{pinSuccess}</div>
        </div>
      )}
      {pinError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{pinError}</div>
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
          {/* Management PIN Section - moved here under venue info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🔐 PIN Διαχείρισης</h4>
              {!venue?.managementPinHash ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700">Δεν έχει οριστεί PIN. Πατήστε για να ορίσετε 4ψήφιο PIN.</div>
                  <SetPinForm onSubmit={handleSetPin} isSaving={isSavingPin} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700">Ο PIN έχει οριστεί. Για αλλαγή, εισάγετε τον τρέχον και δύο φορές τον νέο.</div>
                  <ChangePinForm onSubmit={handleChangePin} isSaving={isSavingPin} />
                </div>
              )}
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
                      {(() => {
                        const daysRemaining = calculateDaysRemaining(venue, lastPayment);
                        return daysRemaining !== null ? `${daysRemaining} ημέρες` : '0 ημέρες';
                      })()}
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
                        {venue.planType || 'Basic'} Plan
                      </div>
                    )}
                    {/* Renewal/Upgrade Button - positioned under the plan info */}
                    <div className="mt-3">
                      {(() => {
                        const daysRemaining = calculateDaysRemaining(venue, lastPayment);
                        
                        if (venue.plan === 'subscription') {
                          if (daysRemaining !== null && daysRemaining <= 7) {
                            // Show renewal button if less than 7 days remaining
                            return (
                              <Link
                              href="#"
                              //href="/management/settings/renewal"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                              >
                                ⚡ Ανανέωση
                              </Link>
                            );
                          } else {
                            // Show upgrade button if more than 7 days remaining
                            return (
                              <Link
                              href="#"
                              //href="/management/settings/renewal"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                              >
                                🚀 Αναβάθμιση
                              </Link>
                            );
                          }
                        } else {
                          // Show activation button for trial/no plan
                          return (
                              <Link
                              href="#"
                              //href="/management/settings/renewal"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                              >
                              ✨ Ενεργοποίηση
                            </Link>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Subscription End Date - Full width below the grid, aligned like the other sections */}
                {venue.plan === 'subscription' && (
                  <div className="mt-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Λήγει στις:</span>
                      </div>
                      {(() => {
                        const daysRemaining = calculateDaysRemaining(venue, lastPayment);
                        const endDateInfo = getSubscriptionEndDate(venue, lastPayment);
                        
                        if (endDateInfo) {
                          const endDate = formatDateSafely(endDateInfo.date);
                          if (!endDate) {
                            return (
                              <div className="text-lg font-semibold text-orange-600">
                                ⚠️ Ημερομηνία δεν είναι έγκυρη
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
                                {daysRemaining !== null ? (
                                  daysRemaining > 0 ? `${daysRemaining} ημέρες ακόμα` : 
                                  daysRemaining === 0 ? 'Λήγει σήμερα!' : 
                                  `Έληξε πριν ${Math.abs(daysRemaining)} ημέρες`
                                ) : 'Δεν είναι δυνατός ο υπολογισμός ημερών'}
                              </div>
                            </>
                          );
                        } else {
                          // No end date available at all
                          return (
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-500 mb-2">
                                📅 Δεν βρέθηκε ημερομηνία λήξης
                              </div>
                              <div className="text-sm text-gray-600 mb-3">
                                {venue.plan === 'subscription' ? 
                                  'Το πλάνο σας είναι ενεργό αλλά δεν έχει καταγραφεί ημερομηνία λήξης' :
                                  'Δεν έχετε ενεργό πλάνο συνδρομής'
                                }
                              </div>
                              <div className="flex flex-col gap-2">
                                <Link 
                                  href="#"
                                  //href="/management/settings/renewal"
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                                >
                                  🚀 Ενεργοποίηση Πλάνου
                                </Link>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Payment Info */}
          {venue && venue.plan === 'subscription' && lastPayment && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">💳 Τελευταία Πληρωμή</h4>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    lastPayment.status === 'succeeded' 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {lastPayment.status === 'succeeded' ? '✅ Επιτυχής' : '⏳ Εκκρεμεί'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-green-800 mb-2">
                      Ποσό Πληρωμής
                    </div>
                    <div className="text-3xl font-bold text-green-700">
                      €{typeof lastPayment.amount === 'number' ? lastPayment.amount.toFixed(2) : parseFloat(lastPayment.amount || '0').toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      {lastPayment.planName || 'Basic'} Plan · {lastPayment.durationMonths || 1} μήνες
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-800 mb-2">
                      Ημερομηνία Πληρωμής
                    </div>
                    <div className="text-lg font-semibold text-blue-700">
                      {lastPayment.paymentDate ? (
                        new Date(lastPayment.paymentDate).toLocaleDateString('el-GR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      ) : (
                        'Δεν καταγράφηκε'
                      )}
                    </div>
                    <div className="text-sm text-blue-600 mt-2">
                      {lastPayment.paymentDate ? (
                        (() => {
                          const daysDiff = Math.floor((new Date().getTime() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24));
                          if (daysDiff === 0) return 'Σήμερα';
                          if (daysDiff === 1) return 'Πριν 1 ημέρα';
                          return `Πριν ${daysDiff} ημέρες`;
                        })()
                      ) : (
                        'Ημερομηνία μη διαθέσιμη'
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Payment Summary */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 mb-1">
                        📊 Σύνοψη Πληρωμής
                      </div>
                      <div className="text-sm text-gray-600">
                        Ενεργοποιήθηκε το {lastPayment.planName || 'Basic'} πλάνο 
                        για {lastPayment.durationMonths || 1} μήνες με συνολικό κόστος €{typeof lastPayment.amount === 'number' ? lastPayment.amount.toFixed(2) : parseFloat(lastPayment.amount || '0').toFixed(2)}
                      </div>
                    </div>
                    {lastPayment.paymentType === 'one_time_plan_purchase' && (
                      <div className="ml-4 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Εφάπαξ Αγορά
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Support Section */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🆘 Χρειάζεστε βοήθεια;</h4>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Η ομάδα υποστήριξης μας είναι εδώ για να σας βοηθήσει με οποιαδήποτε ερώτηση ή πρόβλημα
                </p>
                <SupportEmail variant="highlighted" />
                <p className="text-sm text-gray-500 mt-3">
                  Απάντηση εντός 24 ωρών
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SetPinForm({ onSubmit, isSaving }: { onSubmit: (pinA: string, pinB: string) => void; isSaving: boolean }) {
  const [pinA, setPinA] = useState('');
  const [pinB, setPinB] = useState('');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Νέος PIN (4 ψηφία)"
          className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
          value={pinA}
          onChange={(e) => setPinA(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Επιβεβαίωση PIN"
          className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
          value={pinB}
          onChange={(e) => setPinB(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
      </div>
      <button
        disabled={isSaving}
        onClick={() => onSubmit(pinA, pinB)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Αποθήκευση...' : 'Ορισμός PIN'}
      </button>
    </div>
  );
}

function ChangePinForm({ onSubmit, isSaving }: { onSubmit: (oldPin: string, newA: string, newB: string) => void; isSaving: boolean }) {
  const [oldPin, setOldPin] = useState('');
  const [newA, setNewA] = useState('');
  const [newB, setNewB] = useState('');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Τρέχων PIN"
          className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
          value={oldPin}
          onChange={(e) => setOldPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Νέος PIN"
          className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
          value={newA}
          onChange={(e) => setNewA(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Επιβεβαίωση"
          className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:outline-none focus:ring-football-green sm:text-sm"
          value={newB}
          onChange={(e) => setNewB(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
      </div>
      <button
        disabled={isSaving}
        onClick={() => onSubmit(oldPin, newA, newB)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Αποθήκευση...' : 'Αλλαγή PIN'}
      </button>
    </div>
  );
}
