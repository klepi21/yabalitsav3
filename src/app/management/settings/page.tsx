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
  LifeBuoy,
  MessageCircle,
  Send,
  Zap,
  ArrowUpCircle,
  AlertCircle,
  BarChart3,
  Settings,
  Bug,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { venueService } from '@/lib/firebase-services';
import { Venue } from '@/types';
import SupportEmail from '@/components/SupportEmail';
import { calculateDaysRemaining, getSubscriptionEndDate } from '@/lib/subscription-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useSubscriptionQuote } from '@/lib/queries';
import { resolveTier, platformTiers } from '@/lib/pricing';

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
  // Το μέγεθος και η ζώνη έρχονται από την ίδια πηγή με τη σελίδα συνδρομής.
  const { usage: subUsage } = useSubscriptionQuote(venueOwner?.venueId);
  const currentTierLabel = subUsage
    ? resolveTier(platformTiers, subUsage.pitches).id.replace(/^./, (c) => c.toUpperCase())
    : null;
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

  if (authLoading || !venueOwner || isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-4 border-b border-zinc-50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-36 bg-zinc-200 rounded" />
              <div className="h-3 w-56 bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="h-10 w-44 rounded-2xl bg-zinc-100" />
        </div>
        {/* Two column layout skeleton */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            {/* Venue info card skeleton */}
            <div className="rounded-2xl bg-zinc-100 h-80" />
            {/* Coach management skeleton */}
            <div className="rounded-2xl bg-zinc-100 h-20" />
            {/* PIN section skeleton */}
            <div className="rounded-2xl bg-zinc-100 h-48" />
          </div>
          <div className="flex flex-col gap-8">
            {/* Plan card skeleton */}
            <div className="rounded-2xl bg-zinc-100 h-64" />
            {/* Support card skeleton */}
            <div className="rounded-2xl bg-zinc-100 h-48" />
          </div>
        </div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-4 border-b border-zinc-50">
        <div className="flex items-center gap-4">
           <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
             <Settings className="h-6 w-6 text-emerald-400" />
           </div>
           <div className="space-y-0.5">
             <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
               {'Ρυθμίσεις'}
             </h1>
             <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-2xs font-semibold text-zinc-500">
                 {'Διαμόρφωση παραμέτρων συστήματος'}
               </p>
             </div>
           </div>
        </div>

        {/* Subscription Status Badge */}
        {venue && (() => {
          const daysRemaining = calculateDaysRemaining(venue);
          /* Η ζώνη προκύπτει από το τρέχον μέγεθος, όχι από το
             αποθηκευμένο planType — αλλιώς το badge εδώ και η σελίδα
             συνδρομής δείχνουν διαφορετικά πράγματα. */
          const planName = currentTierLabel ?? venue.planType ?? '—';

          if (venue.plan === 'subscription') {
            const isWarning = daysRemaining !== null && daysRemaining <= 7;
            const isExpired = daysRemaining !== null && daysRemaining <= 0;

            return (
              <div className={cn(
                "flex items-center gap-4 px-5 py-3 rounded-xl border shadow-e1 transition-colors bg-white",
                isExpired ? "border-red-100 text-red-600 shadow-red-900/5" :
                isWarning ? "border-amber-100 text-amber-600 shadow-amber-900/5" :
                "border-emerald-100 text-emerald-600 shadow-emerald-900/5"
              )}>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isExpired ? "bg-red-500" :
                  isWarning ? "bg-amber-500 animate-pulse" :
                  "bg-emerald-500"
                )} />
                <div className="flex flex-col">
                  <span className="text-2xs opacity-40 font-semibold">Πλάνο</span>
                  <span className="text-xs font-semibold tracking-tight">{planName} • {daysRemaining} ημέρες</span>
                </div>
              </div>
            );
          } else {
            // Το trial έδειχνε μόνο «Δωρεάν Trial» χωρίς υπόλοιπο ημερών.
            const isTrial = venue.plan === 'trial';
            const trialWarning = isTrial && daysRemaining !== null && daysRemaining <= 7;

            return (
              <div className={cn(
                "flex items-center gap-4 px-5 py-3 rounded-xl border bg-white shadow-e1",
                trialWarning ? "border-amber-100 text-amber-600" : "border-zinc-100 text-zinc-600"
              )}>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  trialWarning ? "bg-amber-500 animate-pulse" : "bg-zinc-300"
                )} />
                <div className="flex flex-col">
                  <span className="text-2xs opacity-40 font-semibold">Πλάνο</span>
                  <span className="text-xs font-semibold tracking-tight">
                    {isTrial
                      ? `Δωρεάν δοκιμή • ${daysRemaining ?? 0} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`
                      : 'Χωρίς πλάνο'}
                  </span>
                </div>
              </div>
            );
          }
        })()}
      </div>

      {/* Success/Error Messages */}
      {(success || pinSuccess || pinError) && (
        <div className="space-y-4">
          {(success || pinSuccess) && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <Check className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <p className="text-sm text-emerald-800">{success || pinSuccess}</p>
            </div>
          )}
          {pinError && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="h-5 w-5 text-red-700 shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-800">{pinError}</p>
            </div>
          )}
        </div>
      )}


      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* Left Column: Venue Information */}
        <div className="flex flex-col gap-8">
          <Card className="border border-border shadow-e2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-3 text-zinc-900">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                </div>
                {'Πληροφορίες Γηπέδου'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                  {/* Venue Name */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-xs font-semibold text-zinc-500">Όνομα Γηπέδου</Label>
                    <Input
                      type="text"
                      id="name"
                      {...register('name')}
                      placeholder="π.χ. Arena 5x5 Central"
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-100 px-5 font-semibold focus:bg-white transition-all text-sm"
                    />
                    {errors.name && (
                      <p className="text-xs font-medium text-red-500 pl-2">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-3">
                    <Label htmlFor="address" className="text-xs font-semibold text-zinc-500">Διεύθυνση</Label>
                    <Input
                      type="text"
                      id="address"
                      {...register('address')}
                      placeholder="Οδός και αριθμός"
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-100 px-5 font-semibold focus:bg-white transition-all text-sm"
                    />
                    {errors.address && (
                      <p className="text-xs font-medium text-red-500 pl-2">{errors.address.message}</p>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-3">
                    <Label htmlFor="city" className="text-xs font-semibold text-zinc-500">Πόλη</Label>
                    <div className="relative">
                      <select
                        id="city"
                        {...register('city')}
                        className="w-full h-11 rounded-xl bg-zinc-50 border border-zinc-100 px-5 font-semibold appearance-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                      >
                        <option value="Αθήνα">Αθήνα</option>
                        <option value="Θεσσαλονίκη">Θεσσαλονίκη</option>
                        <option value="Πάτρα">Πάτρα</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <ArrowLeft className="h-4 w-4 rotate-[-90deg]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-50" />

                {/* Contact Information */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-xs font-semibold text-zinc-500">Email Επικοινωνίας</Label>
                    <Input
                      type="email"
                      id="email"
                      {...register('contactDetails.email')}
                      placeholder="info@example.com"
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-100 px-5 font-semibold focus:bg-white transition-all text-sm"
                    />
                    {errors.contactDetails?.email && (
                      <p className="text-xs font-medium text-red-500 pl-2">{errors.contactDetails.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-xs font-semibold text-zinc-500">Τηλέφωνο</Label>
                    <Input
                      type="tel"
                      id="phone"
                      {...register('contactDetails.phone')}
                      placeholder="210..."
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-100 px-5 font-semibold focus:bg-white transition-all text-sm"
                    />
                    {errors.contactDetails?.phone && (
                      <p className="text-xs font-medium text-red-500 pl-2">{errors.contactDetails.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-11 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 font-semibold text-white transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
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

          {/* Coach Management Section */}
          <Link href="/management/settings/coaches" className="block">
            <Card className="border border-border shadow-e2 hover:shadow-e3 transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                    <Settings className="h-5 w-5 text-zinc-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {'Διαχείριση Χρηστών'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Προπονητές, δικαιώματα, ορατότητα τμημάτων
                    </p>
                  </div>
                </div>
                <ArrowUpCircle className="h-5 w-5 text-zinc-400 rotate-90" />
              </CardContent>
            </Card>
          </Link>

          {/* Management PIN Section */}
          <Card className="border border-border shadow-e2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-3 text-zinc-900">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                </div>
                {'PIN Διαχείρισης'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!venue?.managementPinHash ? (
                <div className="space-y-6">
                  <div className="bg-zinc-50 border border-border rounded-xl p-5">
                    <p className="text-sm text-zinc-700 leading-relaxed">
                      Ο PIN διαχείρισης απαιτείται για ευαίσθητες ενέργειες στον πίνακα ελέγχου. 
                      Ορίστε έναν 4ψήφιο κωδικό για την ασφάλειά σας.
                    </p>
                  </div>
                  <SetPinForm onSubmit={handleSetPin} isSaving={isSavingPin} />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 text-emerald-600 mb-6 font-semibold text-sm">
                    <Zap className="h-5 w-5 fill-emerald-600" />
                    Ο PIN είναι ενεργοποιημένος
                  </div>
                  <ChangePinForm onSubmit={handleChangePin} isSaving={isSavingPin} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Current Plan & Pricing Packages */}
        <div className="flex flex-col gap-8">
          {/* Current Plan Info */}
          {venue && (
            <Card className="border border-border bg-white shadow-e3 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="eyebrow">Τρέχον πλάνο</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">
                  {/* Η ζώνη προκύπτει από το τρέχον μέγεθος, όπως και το
                      badge πάνω και η σελίδα συνδρομής. Το αποθηκευμένο
                      planType είναι στιγμιότυπο αγοράς και ξεπερνιέται. */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-4xl font-semibold text-zinc-900 tracking-tight">
                        {venue.plan === 'subscription' ? (currentTierLabel ?? '—') : 'Δοκιμή'}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {venue.plan === 'subscription' ? 'βάσει μεγέθους' : 'δωρεάν περίοδος'}
                      </span>
                    </div>
                    {subUsage && (
                      <p className="text-xs text-zinc-500">
                        {subUsage.pitches} {subUsage.pitches === 1 ? 'γήπεδο' : 'γήπεδα'}
                        {subUsage.hasAcademy
                          ? ` · ${subUsage.athletes} ${subUsage.athletes === 1 ? 'αθλητής' : 'αθλητές'}`
                          : ''}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 rounded-xl p-4 border border-border">
                      <p className="text-2xs text-zinc-500 mb-1">Υπόλοιπο</p>
                      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
                        {calculateDaysRemaining(venue) ?? 0}{' '}
                        <span className="text-xs font-normal text-zinc-500">ημέρες</span>
                      </p>
                    </div>

                    <div className="bg-zinc-50 rounded-xl p-4 border border-border">
                      <p className="text-2xs text-zinc-500 mb-1">Λήξη</p>
                      <p className="text-base font-semibold text-zinc-900 tabular-nums truncate">
                        {(() => {
                          const endDateInfo = getSubscriptionEndDate(venue, lastPayment);
                          return endDateInfo ? new Date(endDateInfo.date).toLocaleDateString('el-GR', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                        })()}
                      </p>
                    </div>
                  </div>

                  <Button 
                    asChild
                    className="h-11 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 font-semibold text-sm transition-colors"
                  >
                    <Link href="/management/settings/renewal">
                      <ArrowUpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                      Ανανέωση ή αναβάθμιση
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Payment Info */}
          {venue && venue.plan === 'subscription' && lastPayment && (
            <Card className="border border-border shadow-e2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between text-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                    </div>
                    {'Τελευταία Πληρωμή'}
                  </div>
                  <Badge className={cn(
                    "rounded-xl px-4 py-1 font-semibold text-2xs",
                    lastPayment.status === 'succeeded' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {lastPayment.status === 'succeeded' ? 'Ολοκληρωμένη' : 'Εκκρεμεί'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-zinc-50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-500">Ποσό</span>
                    <span className="text-2xl font-semibold text-zinc-900 tabular-nums">
                      €{typeof lastPayment.amount === 'number' ? lastPayment.amount.toFixed(2) : parseFloat(lastPayment.amount || '0').toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-500">Ημερομηνία</span>
                    <span className="text-sm font-semibold text-zinc-700">
                      {lastPayment.paymentDate ? new Date(lastPayment.paymentDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200/50" />
                  <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
                    <BarChart3 className="h-4 w-4" />
                    {lastPayment.planName || 'Συνδρομή'} • {lastPayment.durationMonths || 1}{' '}
                    {(lastPayment.durationMonths || 1) === 1 ? 'μήνας' : 'μήνες'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instant Support via Telegram */}
          {venue && (() => {
            const isTrial = venue.plan !== 'subscription';
            const trialActive = isTrial && (calculateDaysRemaining(venue) ?? 0) > 0;
            /* Πριν: η υποστήριξη ήταν κλειδωμένη σε planType 'pro'/'enterprise'.
               Με τα νέα, βάσει μεγέθους tiers ('Starter'/'Growth'/'Scale') και
               τα δύο θα γίνονταν false και ΚΑΘΕ συνδρομητής θα έχανε σιωπηλά
               τη φόρμα. Πλέον είναι διαθέσιμη σε όλους όσους πληρώνουν· τα
               μεγαλύτερα κέντρα απλώς έχουν πιο γρήγορο rate limit. */
            const planType = (venue.planType || '').toLowerCase();
            const isLargeTier = planType === 'scale' || planType === 'enterprise';
            const isMidTier = planType === 'growth' || planType === 'pro';
            const showTelegram = trialActive || venue.plan === 'subscription';

            if (!showTelegram) return null;

            const rateLimitHours = isLargeTier ? 1 : isMidTier ? 2 : 3;

            return (
              <Card className="border border-border shadow-e2 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">Άμεση υποστήριξη</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Απαντάμε συνήθως εντός της ημέρας</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <TelegramSupportForm venueId={venueOwner?.venueId} rateLimitHours={rateLimitHours} />
                </CardContent>
              </Card>
            );
          })()}

          {/* Help & Support */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="bg-zinc-50 border-b border-border p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-11 w-11 rounded-xl bg-white border border-border text-zinc-700 flex items-center justify-center shrink-0">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">{'Χρειάζεστε βοήθεια;'}</h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Η ομάδα μας είναι διαθέσιμη για οποιαδήποτε απορία.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <SupportEmail variant="highlighted" />
                <div className="flex items-center gap-1.5 text-2xs font-medium text-blue-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Απάντηση σε &lt;24 ώρες
                </div>
              </div>
            </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Νέος PIN"
          value={pinA}
          onChange={(e) => setPinA(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          className="h-14 rounded-xl bg-zinc-50 border-border px-6 font-semibold tabular-nums focus:bg-white text-center text-2xl"
        />
        <Input
          type="password"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="Επιβεβαίωση"
          value={pinB}
          onChange={(e) => setPinB(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          className="h-14 rounded-xl bg-zinc-50 border-border px-6 font-semibold tabular-nums focus:bg-white text-center text-2xl"
        />
      </div>
      <Button
        disabled={isSaving}
        onClick={() => onSubmit(pinA, pinB)}
        className="h-14 w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 font-semibold text-white"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
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
    { value: 'bug', label: 'Πρόβλημα', Icon: Bug },
    { value: 'feature', label: 'Αίτημα', Icon: Lightbulb },
    { value: 'question', label: 'Ερώτηση', Icon: HelpCircle },
    { value: 'urgent', label: 'Επείγον', Icon: AlertTriangle },
    { value: 'other', label: 'Άλλο', Icon: MessageCircle },
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
      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={cn(
              'h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium rounded-lg border transition-colors',
              category === cat.value
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-border bg-white text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <cat.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Message input */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Περιγράψτε το αίτημά σας..."
        rows={3}
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none"
      />

      {/* Status & Send */}
      {sendSuccess && (
        <div className="flex items-center gap-2 text-emerald-800 text-xs bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg animate-in fade-in">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Το μήνυμα στάλθηκε.
        </div>
      )}
      {sendError && (
        <div className="text-red-700 text-xs bg-red-50 border border-red-100 p-2.5 rounded-lg">
          {sendError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-2xs text-zinc-500">
          1 μήνυμα ανά {rateLimitHours === 1 ? 'ώρα' : `${rateLimitHours} ώρες`}
        </span>
        <Button
          onClick={handleSend}
          disabled={isSending || !message.trim()}
          size="sm"
          className="h-9 px-5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 font-semibold text-xs disabled:opacity-40"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1.5" />
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-2xs font-semibold text-zinc-500 ml-2">Τρέχων</Label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="\\d{4}"
            maxLength={4}
            placeholder="— — — —"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="h-14 rounded-xl bg-zinc-50 border-border px-4 font-semibold tabular-nums focus:bg-white text-center text-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-2xs font-semibold text-zinc-500 ml-2">Νέος</Label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="\\d{4}"
            maxLength={4}
            placeholder="— — — —"
            value={newA}
            onChange={(e) => setNewA(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="h-14 rounded-xl bg-zinc-50 border-border px-4 font-semibold tabular-nums focus:bg-white text-center text-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-2xs font-semibold text-zinc-500 ml-2">Επιβεβαίωση</Label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="\\d{4}"
            maxLength={4}
            placeholder="— — — —"
            value={newB}
            onChange={(e) => setNewB(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="h-14 rounded-xl bg-zinc-50 border-border px-4 font-semibold tabular-nums focus:bg-white text-center text-xl"
          />
        </div>
      </div>
      <Button
        disabled={isSaving}
        onClick={() => onSubmit(oldPin, newA, newB)}
        className="h-14 w-full rounded-2xl bg-zinc-900 hover:bg-zinc-800 font-semibold text-white"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            Αποθήκευση...
          </>
        ) : (
          'Αλλαγή PIN'
        )}
      </Button>
    </div>
  );
}
