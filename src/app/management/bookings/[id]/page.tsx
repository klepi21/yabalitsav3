'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  CalendarDays,
  MapPin,
  Loader2,
  Pencil,
  CheckCircle,
  Flag,
  XCircle,
  CalendarX,
  Banknote,
  Check,
  Minus,
  Plus,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, pitchService } from '@/lib/firebase-services';
import { cn } from '@/lib/utils';
import { Booking, Pitch } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function BookingDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const getPlayersPerPitch = (pitchType: string) => {
    switch (pitchType) {
      case '5x5': return 10; // 5v5 = 10 players
      case '6x6': return 12; // 6v6 = 12 players
      case '7x7': return 14; // 7v7 = 14 players
      case '8x8': return 16; // 8v8 = 16 players
      case '9x9': return 18; // 9v9 = 18 players
      default: return 10;
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (params.id) {
      loadBookingData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id, pathname]);

  const loadBookingData = async (bookingId: string) => {
    try {
      const bookingData = await bookingService.getById(bookingId);
      if (bookingData) {
        setBooking(bookingData);

        // Load pitch data if available
        if (bookingData.pitchId) {
          const pitchData = await pitchService.getById(bookingData.pitchId);
          setPitch(pitchData);
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    if (!booking) return;

    setIsUpdating(true);
    try {
      await bookingService.update(booking.id, { status: newStatus });

      // Reload booking data
      await loadBookingData(booking.id);

      // Redirect to bookings page to refresh data
      router.push('/management/bookings');
    } catch (error) {
      console.error('Error updating booking status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'Επιβεβαιωμένη', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
      pending: { label: 'Εκκρεμεί', className: 'border-amber-300 text-amber-700 bg-amber-50' },
      completed: { label: 'Ολοκληρωμένη', className: 'border-slate-300 text-slate-700 bg-slate-50' },
      cancelled: { label: 'Ακυρωμένη', className: 'border-red-300 text-red-700 bg-red-50' },
    };
    const { label, className } = config[status] || config.confirmed;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <CalendarX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">Η κράτηση δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-muted-foreground">Η κράτηση που αναζητάτε δεν υπάρχει.</p>
        <Button className="mt-4" asChild>
          <Link href="/management/bookings">
            Επιστροφή στις Κρατήσεις
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
            <BreadcrumbLink href="/dashboard">Πίνακας Ελέγχου</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/management/bookings">Κρατήσεις</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Λεπτομέρειες Κράτησης</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Λεπτομέρειες Κράτησης</h2>
          <p className="mt-1 text-muted-foreground">Προβολή ολοκληρωμένων πληροφοριών για αυτή την κράτηση</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/management/bookings/${booking.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Επεξεργασία
            </Link>
          </Button>

          {booking.status === 'pending' && (
            <Button
              onClick={() => handleUpdateStatus('confirmed')}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {isUpdating ? 'Ενημέρωση...' : 'Επιβεβαίωση'}
            </Button>
          )}

          {booking.status !== 'completed' && (
            <Button
              onClick={() => handleUpdateStatus('completed')}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {isUpdating ? 'Ενημέρωση...' : 'Ολοκλήρωση'}
            </Button>
          )}

          {booking.status !== 'cancelled' && (
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {isUpdating ? 'Ενημέρωση...' : 'Ακύρωση'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Πληροφορίες Πελάτη
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Όνομα</dt>
              <dd className="mt-1 text-sm text-foreground">{booking.userName || 'Άγνωστος Πελάτης'}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm text-foreground">{booking.userEmail || 'Δεν παρέχεται email'}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Τηλέφωνο</dt>
              <dd className="mt-1 text-sm text-foreground">{booking.userPhone || 'Δεν παρέχεται τηλέφωνο'}</dd>
            </div>
          </CardContent>
        </Card>

        {/* Booking Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-primary" />
              Πληροφορίες Κράτησης
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ημερομηνία</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {new Date(booking.startTime).toLocaleDateString('el-GR')}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ώρα</dt>
              <dd className="mt-1 text-lg font-semibold text-primary">
                {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})} - {new Date(booking.endTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Κατάσταση</dt>
              <dd className="mt-1">
                {getStatusBadge(booking.status)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Συνολική Τιμή</dt>
              <dd className="mt-1">
                <div className="text-2xl font-bold text-foreground">
                  {'\u20AC'}{booking.price?.toFixed(2) || '0.00'}
                </div>
                {pitch && (
                  <div className="text-sm text-muted-foreground mt-1">
                    ({'\u20AC'}{((booking.price || 0) / getPlayersPerPitch(pitch.type)).toFixed(0)}/άτομο)
                  </div>
                )}
              </dd>
            </div>
          </CardContent>
        </Card>

        {/* Pitch Information */}
        {pitch && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                Πληροφορίες Γηπέδου
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Όνομα Γηπέδου</dt>
                <dd className="mt-1 text-sm text-foreground">{pitch.name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Τύπος</dt>
                <dd className="mt-1 text-sm text-foreground">{pitch.type}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Τιμή ανά Κράτηση</dt>
                <dd className="mt-1 text-sm text-foreground">{'\u20AC'}{pitch.pricePerSlot?.toFixed(2) || '0.00'}</dd>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Σημειώσεις</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground">
              {booking.notes || 'Δεν υπάρχουν σημειώσεις για αυτή την κράτηση.'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Collection Tracker */}
      {pitch && booking.status !== 'cancelled' && (
        <CollectionTracker
          booking={booking}
          pitch={pitch}
          getPlayersPerPitch={getPlayersPerPitch}
          onUpdate={async (data) => {
            await bookingService.update(booking.id, data);
            await loadBookingData(booking.id);
          }}
        />
      )}
    </div>
  );
}

function CollectionTracker({
  booking,
  pitch,
  getPlayersPerPitch,
  onUpdate,
}: {
  booking: Booking;
  pitch: Pitch;
  getPlayersPerPitch: (type: string) => number;
  onUpdate: (data: Partial<Booking>) => Promise<void>;
}) {
  const defaultSlots = getPlayersPerPitch(pitch.type);
  const totalSlots = booking.totalSlots || defaultSlots;
  const paidSlots = booking.paidSlots || 0;
  const pricePerPerson = totalSlots > 0 ? (booking.price || 0) / totalSlots : 0;
  const paidAmount = paidSlots * pricePerPerson;
  const remainingAmount = (booking.price || 0) - paidAmount;
  const [isSaving, setIsSaving] = useState(false);

  const collectionStatus = paidSlots === 0 ? 'pending' : paidSlots >= totalSlots ? 'complete' : 'partial';

  const handleUpdate = async (newPaid: number, newTotal?: number) => {
    setIsSaving(true);
    try {
      const total = newTotal ?? totalSlots;
      const paid = Math.max(0, Math.min(newPaid, total));
      const status = paid === 0 ? 'pending' : paid >= total ? 'complete' : 'partial';
      await onUpdate({
        paidSlots: paid,
        totalSlots: total,
        collectionStatus: status as Booking['collectionStatus'],
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Είσπραξη
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              collectionStatus === 'complete' && 'border-emerald-300 text-emerald-700 bg-emerald-50',
              collectionStatus === 'partial' && 'border-amber-300 text-amber-700 bg-amber-50',
              collectionStatus === 'pending' && 'border-zinc-300 text-zinc-500 bg-zinc-50',
            )}
          >
            {collectionStatus === 'complete' ? 'Εξοφλήθηκε' : collectionStatus === 'partial' ? 'Μερική Πληρωμή' : 'Εκκρεμεί'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-emerald-50">
            <p className="text-2xl font-black text-emerald-700">{'\u20AC'}{paidAmount.toFixed(0)}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Εισπράχθηκαν</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-50">
            <p className="text-2xl font-black text-amber-700">{'\u20AC'}{remainingAmount.toFixed(0)}</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase">Υπόλοιπο</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-zinc-50">
            <p className="text-2xl font-black text-zinc-700">{'\u20AC'}{pricePerPerson.toFixed(1)}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Ανά Άτομο</p>
          </div>
        </div>

        {/* Player count adjuster */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-700">Αριθμός Παικτών</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpdate(Math.min(paidSlots, totalSlots - 1), totalSlots - 1)}
              disabled={totalSlots <= 2 || isSaving}
              className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-black text-zinc-900">{totalSlots}</span>
            <button
              onClick={() => handleUpdate(paidSlots, totalSlots + 1)}
              disabled={totalSlots >= 30 || isSaving}
              className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Player grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-zinc-700">
              {paidSlots}/{totalSlots} πλήρωσαν
            </p>
            {paidSlots < totalSlots && (
              <button
                onClick={() => handleUpdate(totalSlots)}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Όλοι πλήρωσαν
              </button>
            )}
            {paidSlots > 0 && (
              <button
                onClick={() => handleUpdate(0)}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Μηδενισμός
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: totalSlots }, (_, i) => {
              const isPaid = i < paidSlots;
              return (
                <button
                  key={i}
                  onClick={() => handleUpdate(isPaid ? i : i + 1)}
                  disabled={isSaving}
                  className={cn(
                    "h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-90",
                    isPaid
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                      : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                  )}
                >
                  {isPaid ? <Check className="h-5 w-5" /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                collectionStatus === 'complete' ? "bg-emerald-500" : "bg-amber-400"
              )}
              style={{ width: `${totalSlots > 0 ? (paidSlots / totalSlots) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 text-right font-medium">
            {totalSlots > 0 ? Math.round((paidSlots / totalSlots) * 100) : 0}% εισπράχθηκε
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
