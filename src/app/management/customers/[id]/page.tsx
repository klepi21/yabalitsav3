'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Euro,
  Pencil,
  Trash2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService, bookingService } from '@/lib/firebase-services';
import { User, Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

export default function CustomerDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [customer, setCustomer] = useState<User | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customerId = params?.id as string;

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const loadCustomerData = async () => {
      if (!customerId) return;

      try {
        setIsLoading(true);

        // Load customer data
        const customerData = await userService.getById(customerId);
        if (!customerData) {
          setError('Ο πελάτης δεν βρέθηκε');
          return;
        }
        setCustomer(customerData);

        // Load customer's bookings for this venue
        const allBookings = await bookingService.getByVenue(venueOwner.venueId);
        const customerVenueBookings = allBookings.filter(booking =>
          booking.userId === customerId
        );
        setCustomerBookings(customerVenueBookings);

      } catch (error) {
        console.error('Error loading customer data:', error);
        setError('Σφάλμα στη φόρτωση των δεδομένων του πελάτη');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomerData();
  }, [user, venueOwner, authLoading, router, customerId, pathname]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive text-lg mb-4">{error}</p>
        <Button variant="destructive" asChild>
          <Link href="/management/customers">Επιστροφή στους Πελάτες</Link>
        </Button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Επιβεβαιωμένη';
      case 'pending': return 'Εκκρεμεί';
      case 'completed': return 'Ολοκληρωμένη';
      case 'cancelled': return 'Ακυρωμένη';
      default: return status;
    }
  };

  const handleDelete = async () => {
    try {
      await userService.delete(customer.id);
      router.push('/management/customers');
    } catch (e) {
      console.error('Error deleting customer:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/management/dashboard">Πίνακας Ελέγχου</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/management/customers">Πελάτες</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{customer.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Πληροφορίες Πελάτη</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/management/customers/${customer.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Επεξεργασία
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Διαγραφή
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Διαγραφή Πελάτη</AlertDialogTitle>
                <AlertDialogDescription>
                  Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη &quot;{customer.name}&quot;; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Διαγραφή
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center mb-6">
                <h3 className="text-xl font-semibold text-foreground">{customer.name}</h3>
              </div>

              <Separator className="mb-4" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{customer.phone}</span>
                </div>

                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{customer.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    Πελάτης από: {formatDate(customer.createdAt)}
                  </span>
                </div>

                {customer.venueIds && customer.venueIds.length > 0 && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {customer.venueIds.length} {customer.venueIds.length > 1 ? 'γήπεδα' : 'γήπεδο'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Κρατήσεις ({customerBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-sm font-medium text-foreground">
                    Δεν υπάρχουν κρατήσεις ακόμα
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Αυτός ο πελάτης δεν έχει κάνει κρατήσεις στο γήπεδό σας.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerBookings.map((booking) => (
                    <div key={booking.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={getStatusVariant(booking.status)}>
                              {getStatusText(booking.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              ID: {booking.id.slice(-8)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-foreground">{formatDate(booking.startTime)}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-foreground">
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-foreground">{booking.price}</span>
                            </div>

                            {booking.notes && (
                              <div className="sm:col-span-2">
                                <span className="text-muted-foreground">Σημείωση: {booking.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/management/bookings/${booking.id}`}>
                              Προβολή Κράτησης
                            </Link>
                          </Button>
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
    </div>
  );
}
