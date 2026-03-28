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
import { Card, CardContent } from '@/components/ui/card';
import { cn, toGreekUpperCase } from '@/lib/utils';

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
    <div className="space-y-10 pb-20">
      {/* Navigation & Header */}
      <div className="space-y-6">
        <Link
          href="/management/pitches"
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-all group"
        >
          <div className="h-8 w-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Επιστροφή στα Γήπεδα
        </Link>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-200 flex items-center justify-center shrink-0">
              <Goal className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase(pitch.name)}</h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[12px] uppercase tracking-wider px-3">
                  {pitch.type}
                </Badge>
              </div>
              <p className="text-sm sm:text-lg font-medium text-zinc-500 hidden sm:block">Πλήρης διαχείριση και στατιστικά γηπέδου.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              asChild
              className="h-11 sm:h-14 px-4 sm:px-6 rounded-2xl border-zinc-200 font-bold hover:bg-zinc-50 active:scale-95 transition-all flex-1 sm:flex-none"
            >
              <Link href={`/management/pitches/${pitch.id}/edit`} className="flex items-center justify-center gap-2">
                <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                Επεξεργασία
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl border-red-100 text-red-500 hover:bg-red-50 active:scale-95 transition-all p-0"
                >
                  <Trash2 className="h-6 w-6" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
                <div className="p-8">
                  <AlertDialogHeader>
                    <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή Γηπέδου</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-500 font-medium pt-2">
                       Είστε σίγουροι ότι θέλετε να διαγράψετε το γήπεδο <span className="text-zinc-900 font-black">&quot;{pitch.name}&quot;</span>; <br/>
                       Αυτή η ενέργεια είναι μόνιμη και όλες οι συνδεδεμένες κρατήσεις θα επηρεαστούν.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-8 gap-3">
                    <AlertDialogCancel className="h-12 rounded-xl border-zinc-200 font-bold">Ακύρωση</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-bold border-0"
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Τιμή (Slot)', value: `\u20AC${pitch.pricePerSlot?.toFixed(2)}`, icon: Euro, color: 'emerald' },
          { label: 'Διάρκεια', value: `${pitch.slotDuration}\'`, icon: Timer, color: 'blue' },
          { label: 'Κρατήσεις', value: bookings.length, icon: Users, color: 'violet' },
          { label: 'Τύπος', value: pitch.type, icon: Goal, color: 'amber' }
        ].map((stat, idx) => (
          <Card key={idx} className="premium-card border-0 hover:translate-y-[-2px] transition-all">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                  stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                  stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                  stat.color === 'violet' ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-600"
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">{stat.label}</p>
                  <p className="text-xl font-black text-zinc-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Side Details */}
        <div className="space-y-8 lg:col-span-1">
          {/* Opening Hours */}
          <Card className="premium-card border-0">
             <CardContent className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900">Ωράριο</h3>
                </div>

                <div className="space-y-4">
                  {dayOrder.map(day => {
                    const hours = pitch.defaultOpeningHours[day];
                    if (!hours) return null;
                    const isWeekend = day === 'saturday' || day === 'sunday';
                    
                    return (
                      <div key={day} className="flex items-center justify-between py-1">
                         <span className={cn(
                           "text-sm font-bold capitalize",
                           isWeekend ? "text-blue-600" : "text-zinc-500"
                         )}>
                           {dayNames[day]}
                         </span>
                         <div className="text-right">
                           {hours.isOpen ? (
                             <div className="flex flex-col items-end">
                               {getOpeningSlots(hours).map((slot: OpeningSlot, idx: number) => (
                                 <span key={idx} className="text-sm font-black text-zinc-900 tabular-nums">
                                   {slot.start} - {slot.end}
                                 </span>
                               ))}
                             </div>
                           ) : (
                             <Badge className="bg-zinc-100 text-zinc-400 border-none font-bold text-[12px]">ΚΛΕΙΣΤΟ</Badge>
                           )}
                         </div>
                      </div>
                    );
                  })}
                </div>
             </CardContent>
          </Card>

          {/* Blocked Dates */}
          <Card className="premium-card border-0 overflow-hidden">
            <CardContent className="p-5 sm:p-8 space-y-5 sm:space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-zinc-900">Εξαιρέσεις</h3>
              </div>

              {blockedDates.length > 0 ? (
                <div className="space-y-3">
                  {blockedDates.slice(0, 5).map((blockedDate) => (
                    <div key={blockedDate.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-red-100 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-black text-zinc-900">
                          {new Date(blockedDate.startDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
                        </p>
                        <Badge className="bg-white text-red-600 border border-red-50 font-bold text-[11px] uppercase">
                          {blockedDate.isFullDay ? 'Full Day' : 'Partial'}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium line-clamp-2">{blockedDate.reason || 'Χωρίς αιτιολογία'}</p>
                    </div>
                  ))}
                  {blockedDates.length > 5 && (
                    <p className="text-center text-xs font-bold text-zinc-400 italic pt-2">... και ακόμα {blockedDates.length - 5} εξαιρέσεις</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 bg-zinc-50 rounded-2xl border border-dashed border-zinc-100">
                  <p className="text-xs font-bold text-zinc-400">Δεν υπάρχουν εξαιρέσεις</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings - Main Area */}
        <div className="lg:col-span-2">
          <Card className="premium-card border-0 h-full">
            <CardContent className="p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900">Ιστορικό Κρατήσεων</h3>
                </div>
                <Link href="/management/bookings" className="text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors shrink-0">
                  {toGreekUpperCase('Όλες →')}
                </Link>
              </div>

              {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50/50 rounded-3xl border-2 border-dashed border-zinc-100">
                   <Users className="h-12 w-12 text-zinc-200 mb-4" />
                   <h4 className="text-lg font-black text-zinc-900">Χωρίς κρατήσεις ακόμα</h4>
                   <p className="text-zinc-500 font-medium max-w-xs">Οι μελλοντικές και προηγούμενες κρατήσεις αυτού του γηπέδου θα εμφανίζονται εδώ.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="pb-4 text-left text-xs font-black uppercase tracking-widest text-zinc-400 px-2 sm:px-4">Πελάτης</th>
                        <th className="pb-4 text-left text-xs font-black uppercase tracking-widest text-zinc-400 px-2 sm:px-4 hidden sm:table-cell">Ημερομηνία</th>
                        <th className="pb-4 text-left text-xs font-black uppercase tracking-widest text-zinc-400 px-2 sm:px-4">Ώρα</th>
                        <th className="pb-4 text-right text-xs font-black uppercase tracking-widest text-zinc-400 px-2 sm:px-4">Κατάσταση</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {[...bookings].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, 8).map((booking) => {
                        const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.confirmed;
                        return (
                          <tr key={booking.id} className="group hover:bg-zinc-50/50 transition-colors">
                            <td className="py-4 sm:py-5 px-2 sm:px-4">
                              <p className="font-bold text-zinc-900 text-sm">{booking.userName || 'Άγνωστος'}</p>
                              <p className="text-xs text-zinc-400 sm:hidden">
                                {new Date(booking.startTime).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
                              </p>
                            </td>
                            <td className="py-4 sm:py-5 px-2 sm:px-4 font-medium text-zinc-500 hidden sm:table-cell">
                               {new Date(booking.startTime).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-4 sm:py-5 px-2 sm:px-4 font-black text-zinc-900 tabular-nums text-sm">
                               {new Date(booking.startTime).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-4 sm:py-5 px-2 sm:px-4 text-right">
                               <Badge className={cn(
                                 "font-black text-[11px] uppercase tracking-wider px-2 py-0.5 border-none",
                                 status.className
                               )}>
                                 {status.label}
                               </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
