'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Building2,
  Clock,
  Calendar,
  Pencil,
  Trash2,
  Ban,
  ArrowRight,
  ArrowLeft,
  Euro,
  Timer,
  Goal,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService, bookingService, blockedDateService } from '@/lib/firebase-services';
import { Pitch, Booking, BlockedDate, OpeningSlot, getOpeningSlots } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PitchDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (params.id) {
      loadPitchData(params.id as string);
    }
  }, [user, venueOwner, authLoading, router, params.id, pathname]);

  const loadPitchData = async (pitchId: string) => {
    try {
      const pitchData = await pitchService.getById(pitchId);
      if (pitchData) {
        setPitch(pitchData);

        // Load bookings and blocked dates for this pitch
        const [bookingsData, blockedDatesData] = await Promise.all([
          bookingService.getByPitch(pitchId),
          blockedDateService.getByPitch(pitchId)
        ]);
        setBookings(bookingsData || []);
        setBlockedDates(blockedDatesData || []);
      }
    } catch (error) {
      console.error('Error loading pitch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pitch) return;
    setIsDeleting(true);
    try {
      await pitchService.delete(pitch.id);
      router.push('/management/pitches');
    } catch (error) {
      console.error('Error deleting pitch:', error);
    } finally {
      setIsDeleting(false);
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
        <div className="mx-auto h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">Το γήπεδο δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-zinc-500">Το γήπεδο που αναζητάτε δεν υπάρχει.</p>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/management/pitches">
            Επιστροφή στα Γήπεδα
          </Link>
        </Button>
      </div>
    );
  }

  const statusConfig = {
    confirmed: { label: 'Επιβεβαιωμένη', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending: { label: 'Εκκρεμεί', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { label: 'Ολοκληρωμένη', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    cancelled: { label: 'Ακυρωμένη', className: 'bg-red-50 text-red-700 border-red-200' },
  };

  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames: Record<string, string> = {
    'monday': 'Δευτέρα',
    'tuesday': 'Τρίτη',
    'wednesday': 'Τετάρτη',
    'thursday': 'Πέμπτη',
    'friday': 'Παρασκευή',
    'saturday': 'Σάββατο',
    'sunday': 'Κυριακή'
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/management/pitches"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Γήπεδα
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
            <Goal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{pitch.name}</h1>
            <p className="text-sm text-zinc-500">Λεπτομέρειες και πληροφορίες γηπέδου</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="rounded-lg border-zinc-200 hover:bg-zinc-50">
            <Link href={`/management/pitches/${pitch.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Επεξεργασία
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
                Διαγραφή
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-zinc-900">Διαγραφή Γηπέδου</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-500">
                  Είστε σίγουροι ότι θέλετε να διαγράψετε το γήπεδο &quot;{pitch.name}&quot;; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Ακύρωση</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg"
                >
                  {isDeleting ? 'Διαγραφή...' : 'Διαγραφή'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
              <Goal className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Τύπος</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{pitch.type}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600">
              <Euro className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Τιμή / Slot</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">&euro;{pitch.pricePerSlot?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Διάρκεια</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{pitch.slotDuration}&apos;</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 text-violet-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Κρατήσεις</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">{bookings.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opening Hours */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Ώρες Λειτουργίας</h2>
          </div>
          <div className="space-y-0 divide-y divide-zinc-100">
            {pitch.defaultOpeningHours && dayOrder.map(day => {
              const hours = pitch.defaultOpeningHours[day];
              if (!hours) return null;

              const isWeekend = day === 'saturday' || day === 'sunday';

              return (
                <div key={day} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <span className={`text-sm font-medium ${isWeekend ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {dayNames[day] || day}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {hours.isOpen
                      ? getOpeningSlots(hours).length > 0
                        ? getOpeningSlots(hours).map((slot: OpeningSlot, idx: number) => (
                            <span key={idx} className="inline-flex items-center">
                              {idx > 0 && <span className="mx-1.5 text-zinc-300">|</span>}
                              <span className="font-mono text-zinc-700">{slot.start}</span>
                              <span className="mx-1 text-zinc-300">-</span>
                              <span className="font-mono text-zinc-700">{slot.end}</span>
                            </span>
                          ))
                        : <span className="text-zinc-400">Δεν έχουν οριστεί</span>
                      : <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-400 font-normal">Κλειστό</Badge>
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blocked Dates */}
        {blockedDates.length > 0 ? (
          <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600">
                <Ban className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Κλειστές Ημερομηνίες</h2>
            </div>
            <div className="space-y-2.5">
              {blockedDates.map((blockedDate) => (
                <div key={blockedDate.id} className="rounded-lg border border-red-100 bg-red-50/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 text-sm">
                        <span className="font-medium text-zinc-900">
                          {new Date(blockedDate.startDate).toLocaleDateString('el-GR')}
                          {blockedDate.startDate !== blockedDate.endDate &&
                            ` - ${new Date(blockedDate.endDate).toLocaleDateString('el-GR')}`
                          }
                        </span>
                        <Badge variant="outline" className="text-xs border-red-200 text-red-600 font-normal">
                          {blockedDate.isFullDay ? 'Όλη η ημέρα' : 'Συγκεκριμένες ώρες'}
                        </Badge>
                      </div>
                      {blockedDate.reason && (
                        <p className="text-zinc-500 text-xs mt-1.5">{blockedDate.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* If no blocked dates, show a placeholder so the grid stays balanced */
          <div className="rounded-xl border border-zinc-100/60 bg-white p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600">
                <Ban className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Κλειστές Ημερομηνίες</h2>
            </div>
            <div className="text-center py-6">
              <div className="mx-auto h-10 w-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-2.5">
                <Ban className="h-5 w-5 text-zinc-300" />
              </div>
              <p className="text-sm text-zinc-400">Δεν υπάρχουν κλειστές ημερομηνίες</p>
            </div>
          </div>
        )}

        {/* Recent Bookings — full width */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-100/60 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600">
                <Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">Πρόσφατες Κρατήσεις</h2>
            </div>
            <Link
              href="/management/bookings"
              className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              Προβολή όλων
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto h-10 w-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-2.5">
                <Calendar className="h-5 w-5 text-zinc-300" />
              </div>
              <h3 className="text-sm font-medium text-zinc-700">Δεν υπάρχουν κρατήσεις</h3>
              <p className="mt-0.5 text-sm text-zinc-400">Οι κρατήσεις για αυτό το γήπεδο θα εμφανιστούν εδώ.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Πελάτης</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ημερομηνία</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ώρα</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Τιμή</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Κατάσταση</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[...bookings].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, 5).map((booking) => {
                    const status = statusConfig[booking.status] || statusConfig.confirmed;
                    return (
                      <tr key={booking.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-zinc-900">
                            {booking.userName || 'Άγνωστος Πελάτης'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          {new Date(booking.startTime).toLocaleDateString('el-GR')}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono">
                          {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-zinc-900">
                          &euro;{booking.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
