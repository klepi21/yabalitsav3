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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService, bookingService, blockedDateService } from '@/lib/firebase-services';
import { Pitch, Booking, BlockedDate, OpeningSlot, getOpeningSlots } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
        <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Το γήπεδο δεν βρέθηκε</h3>
        <p className="mt-1 text-sm text-muted-foreground">Το γήπεδο που αναζητάτε δεν υπάρχει.</p>
        <Button asChild className="mt-4">
          <Link href="/management/pitches">
            Επιστροφή στα Γήπεδα
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
            <BreadcrumbPage>{pitch.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pitch.name}</h1>
          <p className="mt-1 text-muted-foreground">Λεπτομέρειες και πληροφορίες γηπέδου</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/management/pitches/${pitch.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Επεξεργασία
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Διαγραφή
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Διαγραφή Γηπέδου</AlertDialogTitle>
                <AlertDialogDescription>
                  Είστε σίγουροι ότι θέλετε να διαγράψετε το γήπεδο &quot;{pitch.name}&quot;; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Διαγραφή...' : 'Διαγραφή'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Πληροφορίες Γηπέδου
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Όνομα</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">{pitch.name}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Τύπος</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{pitch.type}</Badge>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Τιμή ανά Κράτηση</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">
                &euro;{pitch.pricePerSlot?.toFixed(2) || '0.00'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Διάρκεια Κράτησης</dt>
              <dd className="mt-1 text-sm text-foreground">{pitch.slotDuration} λεπτά</dd>
            </div>
          </CardContent>
        </Card>

        {/* Opening Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ώρες Λειτουργίας
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pitch.defaultOpeningHours && (() => {
                const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const dayNames = {
                  'monday': 'Δευτέρα',
                  'tuesday': 'Τρίτη',
                  'wednesday': 'Τετάρτη',
                  'thursday': 'Πέμπτη',
                  'friday': 'Παρασκευή',
                  'saturday': 'Σάββατο',
                  'sunday': 'Κυριακή'
                };

                return dayOrder.map(day => {
                  const hours = pitch.defaultOpeningHours[day];
                  if (!hours) return null;

                  return (
                    <div key={day} className="flex justify-between items-center py-1">
                      <span className="text-sm font-medium text-foreground">
                        {dayNames[day as keyof typeof dayNames] || day}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {hours.isOpen
                          ? getOpeningSlots(hours).length > 0
                            ? getOpeningSlots(hours).map((slot: OpeningSlot, idx: number) => (
                                <span key={idx}>
                                  {idx > 0 && ', '}
                                  {slot.start} - {slot.end}
                                </span>
                              ))
                            : 'Δεν έχουν οριστεί ώρες'
                          : 'Κλειστό'
                        }
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Blocked Dates */}
        {blockedDates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Κλειστές Ημερομηνίες
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blockedDates.map((blockedDate) => (
                  <div key={blockedDate.id} className="border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 text-sm">
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
                          <p className="text-muted-foreground text-xs mt-1">{blockedDate.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Bookings */}
        <Card className={blockedDates.length > 0 ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Πρόσφατες Κρατήσεις
              </CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href="/bookings">
                  Προβολή όλων
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground">Δεν υπάρχουν κρατήσεις ακόμα</h3>
                <p className="mt-1 text-sm text-muted-foreground">Οι κρατήσεις για αυτό το γήπεδο θα εμφανιστούν εδώ.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">
                          {booking.userName || 'Άγνωστος Πελάτης'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.startTime).toLocaleDateString('el-GR')} στις {new Date(booking.startTime).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">&euro;{booking.price?.toFixed(2) || '0.00'}</p>
                        <Badge variant={
                          booking.status === 'confirmed' ? 'default' :
                          booking.status === 'pending' ? 'secondary' :
                          booking.status === 'completed' ? 'default' :
                          booking.status === 'cancelled' ? 'destructive' :
                          'default'
                        } className="text-xs">
                          {booking.status === 'confirmed' ? 'Επιβεβαιωμένη' :
                           booking.status === 'pending' ? 'Εκκρεμεί' :
                           booking.status === 'completed' ? 'Ολοκληρωμένη' :
                           booking.status === 'cancelled' ? 'Ακυρωμένη' :
                           'Επιβεβαιωμένη'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
