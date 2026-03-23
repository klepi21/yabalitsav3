'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Euro,
  Pencil,
  Trash2,
  AlertCircle,
  CalendarDays,
  Eye,
  ArrowLeft,
  User,
  Smile,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService, bookingService } from '@/lib/firebase-services';
import { User as UserType, Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn, toGreekUpperCase } from '@/lib/utils';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [customer, setCustomer] = useState<UserType | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const customerId = params?.id as string;

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
        const customerData = await userService.getById(customerId);
        if (!customerData) {
          setError('Ο πελάτης δεν βρέθηκε');
          return;
        }
        setCustomer(customerData);

        const allBookings = await bookingService.getByVenue(venueOwner.venueId);
        const customerVenueBookings = allBookings.filter(booking =>
          booking.userId === customerId
        );
        setCustomerBookings(customerVenueBookings.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ));
      } catch (err) {
        console.error('Error loading customer data:', err);
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

  if (error || !customer) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-black tracking-tight text-zinc-900">{error || 'Ο πελάτης δεν βρέθηκε'}</h3>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
          <Link href="/management/customers">Επιστροφή στους Πελάτες</Link>
        </Button>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'ΕΠΙΒΕΒΑΙΩΜΕΝΗ', className: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'ΕΚΚΡΕΜΕΙ', className: 'bg-amber-100 text-amber-700' },
    completed: { label: 'ΟΛΟΚΛΗΡΩΜΕΝΗ', className: 'bg-zinc-100 text-zinc-600' },
    cancelled: { label: 'ΑΚΥΡΩΜΕΝΗ', className: 'bg-red-100 text-red-700' },
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await userService.delete(customer.id);
      router.push('/management/customers');
    } catch (e) {
      console.error('Error deleting customer:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSpent = customerBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      {/* Navigation & Header */}
      <div className="space-y-5">
        <Link
          href="/management/customers"
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-all group"
        >
          <div className="h-8 w-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline">Επιστροφή στους Πελάτες</span>
          <span className="sm:hidden">Πίσω</span>
        </Link>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-200 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-zinc-900 uppercase truncate">
                {toGreekUpperCase(customer.name)}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-500">
                Πελάτης από {new Date(customer.createdAt).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              asChild
              className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl border-zinc-200 font-bold hover:bg-zinc-50 active:scale-95 transition-all flex-1 sm:flex-none"
            >
              <Link href={`/management/customers/${customer.id}/edit`} className="flex items-center justify-center gap-2">
                <Pencil className="h-4 w-4" />
                Επεξεργασία
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-red-100 text-red-500 hover:bg-red-50 active:scale-95 transition-all p-0 shrink-0"
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden w-[95vw] sm:w-full">
                <div className="p-6 sm:p-8">
                  <AlertDialogHeader>
                    <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-xl sm:text-2xl font-black text-zinc-900">Διαγραφή Πελάτη</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-500 font-medium pt-2">
                      Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη <span className="text-zinc-900 font-black">&quot;{customer.name}&quot;</span>;
                      Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-6 gap-3">
                    <AlertDialogCancel className="h-11 rounded-xl border-zinc-200 font-bold">Ακύρωση</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-bold border-0"
                    >
                      {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Οριστική Διαγραφή'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Κρατήσεις', value: customerBookings.length, icon: CalendarDays, color: 'emerald' },
          { label: 'Έσοδα', value: `€${totalSpent.toFixed(0)}`, icon: Euro, color: 'blue' },
          { label: 'Τελευταία', value: customerBookings.length > 0 ? new Date(customerBookings[0].startTime).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }) : '—', icon: Calendar, color: 'violet' },
          { label: 'Ακυρώσεις', value: customerBookings.filter(b => b.status === 'cancelled').length, icon: AlertCircle, color: 'red' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0",
                  stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                  stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                  stat.color === 'violet' ? "bg-violet-50 text-violet-600" : "bg-red-50 text-red-600"
                )}>
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-black text-zinc-900 truncate">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Contact Info */}
        <div>
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5 sm:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-zinc-900">Στοιχεία</h3>
              </div>

              <div className="space-y-4">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-emerald-50 transition-colors group">
                    <Phone className="h-4 w-4 text-zinc-400 group-hover:text-emerald-500" />
                    <span className="text-sm font-bold text-zinc-700">{customer.phone}</span>
                  </a>
                )}

                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-emerald-50 transition-colors group">
                    <Mail className="h-4 w-4 text-zinc-400 group-hover:text-emerald-500" />
                    <span className="text-sm font-bold text-zinc-700 truncate">{customer.email}</span>
                  </a>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-700">
                    Πελάτης από {new Date(customer.createdAt).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings History */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5 sm:p-8">
              <div className="flex items-center justify-between mb-5 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900">Ιστορικό Κρατήσεων</h3>
                </div>
                <Badge className="bg-zinc-100 text-zinc-600 border-none font-black text-xs px-3">
                  {customerBookings.length}
                </Badge>
              </div>

              {customerBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-100">
                  <Smile className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-200 mb-4" />
                  <h4 className="text-base sm:text-lg font-black text-zinc-900">Χωρίς κρατήσεις ακόμα</h4>
                  <p className="text-zinc-500 font-medium text-sm max-w-xs mt-1">Αυτός ο πελάτης δεν έχει κάνει κρατήσεις.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerBookings.map((booking) => {
                    const startDate = new Date(booking.startTime);
                    const isToday = startDate.toDateString() === new Date().toDateString();
                    const status = statusConfig[booking.status] || statusConfig.confirmed;

                    return (
                      <div
                        key={booking.id}
                        className="group p-3 sm:p-4 rounded-xl border border-zinc-100 hover:border-emerald-100 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => router.push(`/management/bookings/${booking.id}`)}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Date block */}
                          <div className={cn(
                            "shrink-0 w-12 h-14 flex flex-col items-center justify-center rounded-lg border-2",
                            isToday
                              ? "bg-zinc-900 border-zinc-900 text-white"
                              : "bg-zinc-50 border-zinc-50 text-zinc-900"
                          )}>
                            <p className={cn("text-[7px] font-black uppercase tracking-wider", isToday ? "text-emerald-400" : "text-zinc-400")}>
                              {toGreekUpperCase(startDate.toLocaleDateString('el-GR', { weekday: 'short' }))}
                            </p>
                            <p className="text-lg font-black leading-none">{startDate.getDate()}</p>
                            <p className={cn("text-[7px] font-black uppercase tracking-wider", isToday ? "text-emerald-400" : "text-zinc-500")}>
                              {toGreekUpperCase(startDate.toLocaleDateString('el-GR', { month: 'short' }))}
                            </p>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn("font-black text-[9px] uppercase tracking-wider px-2 py-0.5 border-none", status.className)}>
                                {toGreekUpperCase(status.label)}
                              </Badge>
                              {isToday && (
                                <Badge className="bg-emerald-600 text-white font-black text-[8px] px-2 py-0.5 border-none">ΣΗΜΕΡΑ</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-500/50" />
                                {startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1 text-zinc-900 font-black">
                                <Euro className="h-3 w-3 text-emerald-500/50" />
                                €{booking.price?.toFixed(0) || '0'}
                              </span>
                            </div>
                          </div>

                          {/* View button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/management/bookings/${booking.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
