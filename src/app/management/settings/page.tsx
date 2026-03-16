'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Lock,
  CreditCard,
  CalendarDays,
  LifeBuoy,
  MessageCircle,
  Send,
  Clock,
  Zap,
  ArrowUpCircle,
  Sparkles,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Venue } from '@/types';
import SupportEmail from '@/components/SupportEmail';
import { calculateDaysRemaining, getSubscriptionEndDate, formatDateSafely } from '@/lib/subscription-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
  const pathname = usePathname();
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
    if (!venueOwner || !user) return;

    setIsLoading(true);
    setError(null);
    try {
      // Get auth token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Use server-side API to fetch data with proper auth
      const response = await fetch('/api/settings/get-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: venueOwner.venueId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch settings data');
      }

      const data = await response.json();

      // Convert venue data
      const venueData = data.venue ? {
        ...data.venue,
        createdAt: new Date(data.venue.createdAt),
        updatedAt: new Date(data.venue.updatedAt),
      } : null;

      setVenue(venueData);

      if (venueData) {
        reset({
          name: venueData.name,
          address: venueData.address,
          city: venueData.city || 'Αθήνα', // Default to Athens if not set
          contactDetails: {
            email: venueData.contactDetails?.email || '',
            phone: venueData.contactDetails?.phone || '',
          },
        });

        // Load last payment data
        if (data.payments && data.payments.length > 0) {
          const payments = data.payments.map((p: Record<string, unknown>) => ({
            ...p,
            createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt as number).toISOString(),
            updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date(p.updatedAt as number).toISOString(),
          }));

          // Sort by payment date and get the most recent
          const sortedPayments = payments.sort((a: { paymentDate?: string }, b: { paymentDate?: string }) => {
            const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return dateB - dateA;
          });
          setLastPayment(sortedPayments[0]);
        }
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Αποτυχία φόρτωσης δεδομένων γηπέδου';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner, user, reset]);

  // Load venue data and check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadVenueData();
  }, [user, venueOwner, authLoading, router, loadVenueData, pathname]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Σφάλμα κατά τη φόρτωση ρυθμίσεων</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <p className="mt-2 text-xs">
              Αν το πρόβλημα συνεχίζεται, δοκιμάστε να ανανεώσετε τη σελίδα ή να συνδεθείτε ξανά.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setError(null);
                loadVenueData();
              }}
            >
              Δοκιμάστε ξανά
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/management/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ρυθμίσεις Γηπέδου</h1>
          <p className="mt-2 text-muted-foreground">Διαμόρφωση προτιμήσεων και ρυθμίσεων του γηπέδου σας</p>
        </div>

        {/* Subscription Status Badge - matches SidebarWrapper logic */}
        {venue && (() => {
          const daysRemaining = calculateDaysRemaining(venue);

          if (venue.plan === 'subscription') {
            if (daysRemaining !== null && daysRemaining > 7) {
              return (
                <Badge variant="default" className="gap-2 px-4 py-2 text-sm">
                  <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full"></div>
                  {venue.planType || 'Basic'} Plan
                  <span className="text-xs opacity-80">
                    ({daysRemaining} ημέρες)
                  </span>
                </Badge>
              );
            } else if (daysRemaining !== null && daysRemaining > 0) {
              return (
                <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm border border-amber-300 bg-amber-100 text-amber-800">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                  {venue.planType || 'Basic'} - {daysRemaining} ημέρες
                </Badge>
              );
            } else {
              return (
                <Badge variant="destructive" className="gap-2 px-4 py-2 text-sm">
                  <div className="w-2.5 h-2.5 bg-red-200 rounded-full"></div>
                  Πλάνο έληξε
                </Badge>
              );
            }
          } else {
            return (
              <Badge variant="outline" className="gap-2 px-4 py-2 text-sm">
                <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full"></div>
                {venue.plan === 'trial' ? 'Δωρεάν Trial' : 'Χωρίς Πλάνο'}
              </Badge>
            );
          }
        })()}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <AlertDescription className="text-primary">{success}</AlertDescription>
        </Alert>
      )}

      {pinSuccess && (
        <Alert>
          <AlertDescription className="text-primary">{pinSuccess}</AlertDescription>
        </Alert>
      )}
      {pinError && (
        <Alert variant="destructive">
          <AlertDescription>{pinError}</AlertDescription>
        </Alert>
      )}


      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* Left Column: Venue Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Πληροφορίες Γηπέδου
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Venue Name */}
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

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Διεύθυνση</Label>
                  <Input
                    type="text"
                    id="address"
                    {...register('address')}
                    placeholder="Εισάγετε διεύθυνση γηπέδου"
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address.message}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">Πόλη</Label>
                  <select
                    id="city"
                    {...register('city')}
                    className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="Αθήνα">Αθήνα</option>
                    <option value="Θεσσαλονίκη">Θεσσαλονίκη</option>
                    <option value="Πάτρα">Πάτρα</option>
                  </select>
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Διεύθυνση Email</Label>
                    <Input
                      type="email"
                      id="email"
                      {...register('contactDetails.email')}
                      placeholder="Εισάγετε διεύθυνση email"
                    />
                    {errors.contactDetails?.email && (
                      <p className="text-sm text-destructive">{errors.contactDetails.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Αριθμός Τηλεφώνου</Label>
                    <Input
                      type="tel"
                      id="phone"
                      {...register('contactDetails.phone')}
                      placeholder="Εισάγετε αριθμό τηλεφώνου"
                    />
                    {errors.contactDetails?.phone && (
                      <p className="text-sm text-destructive">{errors.contactDetails.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Αποθήκευση...
                      </>
                    ) : (
                      'Αποθήκευση Αλλαγών'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Management PIN Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                PIN Διαχείρισης
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!venue?.managementPinHash ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Δεν έχει οριστεί PIN. Πατήστε για να ορίσετε 4ψήφιο PIN.</p>
                  <SetPinForm onSubmit={handleSetPin} isSaving={isSavingPin} />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Ο PIN έχει οριστεί. Για αλλαγή, εισάγετε τον τρέχον και δύο φορές τον νέο.</p>
                  <ChangePinForm onSubmit={handleChangePin} isSaving={isSavingPin} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Current Plan & Pricing Packages */}
        <div className="space-y-6">
          {/* Current Plan Info */}
          {venue && (
            <Card>
              <CardHeader>
                <CardTitle>Τρέχον Πλάνο</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Υπόλοιπο ημερών:</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {(() => {
                        const daysRemaining = calculateDaysRemaining(venue);
                        return daysRemaining !== null ? `${daysRemaining} ημέρες` : '0 ημέρες';
                      })()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Τρέχον πλάνο:</span>
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {venue.plan === 'subscription' ? 'Συνδρομή' : 'Δωρεάν Trial'}
                    </div>
                    {venue.plan === 'subscription' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {venue.planType || 'Basic'} Plan
                      </div>
                    )}
                    {/* Renewal/Upgrade Button */}
                    <div className="mt-3">
                      {(() => {
                        const daysRemaining = calculateDaysRemaining(venue);

                        if (venue.plan === 'subscription') {
                          if (daysRemaining !== null && daysRemaining <= 7) {
                            return (
                              <Button variant="default" size="sm" asChild>
                                <Link href="#">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Ανανέωση
                                </Link>
                              </Button>
                            );
                          } else {
                            return (
                              <Button variant="outline" size="sm" asChild>
                                <Link href="/management/settings/renewal">
                                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                                  Αναβάθμιση
                                </Link>
                              </Button>
                            );
                          }
                        } else {
                          return (
                            <Button variant="default" size="sm" asChild>
                              <Link href="/management/settings/renewal">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Ενεργοποίηση
                              </Link>
                            </Button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Subscription End Date */}
                {venue.plan === 'subscription' && (
                  <>
                    <Separator className="my-4" />
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Λήγει στις:</span>
                      </div>
                      {(() => {
                        const daysRemaining = calculateDaysRemaining(venue);
                        const endDateInfo = getSubscriptionEndDate(venue, lastPayment);

                        if (endDateInfo) {
                          const endDate = formatDateSafely(endDateInfo.date);
                          if (!endDate) {
                            return (
                              <div className="text-lg font-semibold text-amber-600 flex items-center justify-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                Ημερομηνία δεν είναι έγκυρη
                              </div>
                            );
                          }

                          return (
                            <>
                              <div className="text-lg font-semibold text-primary">
                                {endDate.toLocaleDateString('el-GR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {daysRemaining !== null ? (
                                  daysRemaining > 0 ? `${daysRemaining} ημέρες ακόμα` :
                                  daysRemaining === 0 ? 'Λήγει σήμερα!' :
                                  `Έληξε πριν ${Math.abs(daysRemaining)} ημέρες`
                                ) : 'Δεν είναι δυνατός ο υπολογισμός ημερών'}
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <div className="text-center">
                              <div className="text-lg font-semibold text-muted-foreground mb-2 flex items-center justify-center gap-1">
                                <CalendarDays className="h-5 w-5" />
                                Δεν βρέθηκε ημερομηνία λήξης
                              </div>
                              <div className="text-sm text-muted-foreground mb-3">
                                {venue.plan === 'subscription' ?
                                  'Το πλάνο σας είναι ενεργό αλλά δεν έχει καταγραφεί ημερομηνία λήξης' :
                                  'Δεν έχετε ενεργό πλάνο συνδρομής'
                                }
                              </div>
                              <Button asChild>
                                <Link href="/management/settings/renewal">
                                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                                  Ενεργοποίηση Πλάνου
                                </Link>
                              </Button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Last Payment Info */}
          {venue && venue.plan === 'subscription' && lastPayment && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Τελευταία Πληρωμή
                  </CardTitle>
                  <Badge variant={lastPayment.status === 'succeeded' ? 'default' : 'secondary'}>
                    {lastPayment.status === 'succeeded' ? 'Επιτυχής' : 'Εκκρεμεί'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="text-sm font-medium text-primary mb-2">
                      Ποσό Πληρωμής
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {'\u20AC'}{typeof lastPayment.amount === 'number' ? lastPayment.amount.toFixed(2) : parseFloat(lastPayment.amount || '0').toFixed(2)}
                    </div>
                    <div className="text-sm text-primary/70 mt-2">
                      {lastPayment.planName || 'Basic'} Plan {'\u00B7'} {lastPayment.durationMonths || 1} μήνες
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Ημερομηνία Πληρωμής
                    </div>
                    <div className="text-lg font-semibold text-blue-700 dark:text-blue-400">
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
                    <div className="text-sm text-blue-600 dark:text-blue-400/70 mt-2">
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
                <Separator className="my-4" />
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        Σύνοψη Πληρωμής
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ενεργοποιήθηκε το {lastPayment.planName || 'Basic'} πλάνο
                        για {lastPayment.durationMonths || 1} μήνες με συνολικό κόστος {'\u20AC'}{typeof lastPayment.amount === 'number' ? lastPayment.amount.toFixed(2) : parseFloat(lastPayment.amount || '0').toFixed(2)}
                      </div>
                    </div>
                    {lastPayment.paymentType === 'one_time_plan_purchase' && (
                      <Badge variant="secondary" className="ml-4">
                        Εφάπαξ Αγορά
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instant Support via Telegram — shown for trial, pro, enterprise (not basic) */}
          {venue && (() => {
            const isTrial = venue.plan !== 'subscription';
            const trialActive = isTrial && (calculateDaysRemaining(venue) ?? 0) > 0;
            const planType = (venue.planType || '').toLowerCase();
            const isPro = planType === 'pro';
            const isEnterprise = planType === 'enterprise';
            const showTelegram = trialActive || isPro || isEnterprise;

            if (!showTelegram) return null;

            const rateLimitHours = isEnterprise ? 1 : isPro ? 2 : 1; // trial = 1h

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Άμεση Επικοινωνία
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TelegramSupportForm venueId={venueOwner?.venueId} rateLimitHours={rateLimitHours} />
                </CardContent>
              </Card>
            );
          })()}

          {/* Support Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                Χρειάζεστε βοήθεια;
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Η ομάδα υποστήριξης μας είναι εδώ για να σας βοηθήσει με οποιαδήποτε ερώτηση ή πρόβλημα
                </p>
                <SupportEmail variant="highlighted" />
                <p className="text-sm text-muted-foreground mt-3">
                  Απάντηση εντός 24 ωρών
                </p>
              </div>
            </CardContent>
          </Card>

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
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Νέος PIN (4 ψηφία)"
          value={pinA}
          onChange={(e) => setPinA(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Επιβεβαίωση PIN"
          value={pinB}
          onChange={(e) => setPinB(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
      </div>
      <Button
        disabled={isSaving}
        onClick={() => onSubmit(pinA, pinB)}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Αποθήκευση...
          </>
        ) : (
          'Ορισμός PIN'
        )}
      </Button>
    </div>
  );
}

function TelegramSupportForm({ venueId, rateLimitHours = 1 }: { venueId?: string; rateLimitHours?: number }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('question');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const categories = [
    { value: 'bug', label: 'Bug', icon: '🐛' },
    { value: 'feature', label: 'Αίτημα', icon: '💡' },
    { value: 'question', label: 'Ερώτηση', icon: '❓' },
    { value: 'urgent', label: 'Επείγον', icon: '🚨' },
    { value: 'other', label: 'Άλλο', icon: '💬' },
  ];

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, category, venueId, rateLimitHours }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      setSendSuccess(true);
      setMessage('');
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Αποτυχία αποστολής');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Στείλτε μήνυμα απευθείας στην ομάδα ανάπτυξης. Θα λάβετε απάντηση άμεσα.
      </p>
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
        Μπορείτε να στείλετε 1 μήνυμα ανά {rateLimitHours === 1 ? 'ώρα' : `${rateLimitHours} ώρες`}.
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              category === cat.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Message input */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Περιγράψτε το αίτημά σας..."
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
      />

      {/* Send button */}
      <div className="flex items-center justify-between">
        <div>
          {sendSuccess && (
            <p className="text-sm text-emerald-600 font-medium">Το μήνυμα στάλθηκε επιτυχώς!</p>
          )}
          {sendError && (
            <p className="text-sm text-destructive">{sendError}</p>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={isSending || !message.trim()}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Αποστολή...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1.5" />
              Αποστολή
            </>
          )}
        </Button>
      </div>
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
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Τρέχων PIN"
          value={oldPin}
          onChange={(e) => setOldPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Νέος PIN"
          value={newA}
          onChange={(e) => setNewA(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Επιβεβαίωση"
          value={newB}
          onChange={(e) => setNewB(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        />
      </div>
      <Button
        disabled={isSaving}
        onClick={() => onSubmit(oldPin, newA, newB)}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Αποθήκευση...
          </>
        ) : (
          'Αλλαγή PIN'
        )}
      </Button>
    </div>
  );
}
