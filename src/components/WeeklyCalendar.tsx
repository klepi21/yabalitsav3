'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
  Plus,
  Phone,
  Building2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Booking, Pitch, BlockedDate } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface WeeklyCalendarProps {
  bookings: Booking[];
  pitches?: Pitch[];
  blockedDates?: BlockedDate[];
  onBookingClick?: (booking: Booking) => void;
  onSlotClick?: (date: Date, time: string) => void;
  onDeleteBooking?: (bookingId: string) => void;
  deletingBookingId?: string | null;
  onUpdateBookingStatus?: (bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') => void;
  updatingBookingId?: string | null;
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
];

const greekDaysShort = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

export default function WeeklyCalendar({ 
  bookings, 
  pitches = [], 
  blockedDates = [], 
  onBookingClick, 
  onSlotClick, 
  onDeleteBooking, 
  deletingBookingId, 
  onUpdateBookingStatus, 
  updatingBookingId: _updatingBookingId
}: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>(isMobile ? 'daily' : 'weekly');

  const effectiveViewMode = isMobile ? 'daily' : viewMode;

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getBookingsForDateAndTime = (date: Date, time: string) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime);
      const bookingTime = bookingDate.toTimeString().slice(0, 5);
      return bookingDate.toDateString() === date.toDateString() && bookingTime === time;
    });
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(blockedDate => {
      const startDate = new Date(blockedDate.startDate);
      const endDate = new Date(blockedDate.endDate);
      const checkDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const prevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const prevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const longWeekLabel = `${weekStart.toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })}`;
  const shortWeekLabel = `${weekStart.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}`;
  const longDayLabel = currentDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDayLabel = currentDate.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden">
      {/* Premium Header */}
      <div className="p-4 sm:p-8 border-b border-zinc-100 bg-zinc-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center bg-white p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-zinc-200 shadow-sm flex-1 sm:flex-none">
              <button
                onClick={effectiveViewMode === 'weekly' ? prevWeek : prevDay}
                className="p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-zinc-50 transition-all active:scale-95"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-900" />
              </button>

              <div className="px-2 sm:px-6 min-w-0 sm:min-w-[240px] text-center flex-1">
                <h2 className="text-sm sm:text-xl font-black text-zinc-900 tracking-tight truncate">
                  {effectiveViewMode === 'weekly' ? (
                    <>
                      <span className="lg:hidden">{shortWeekLabel}</span>
                      <span className="hidden lg:inline">{longWeekLabel}</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">{shortDayLabel}</span>
                      <span className="hidden sm:inline lg:hidden">{shortDayLabel}</span>
                      <span className="hidden lg:inline">{longDayLabel}</span>
                    </>
                  )}
                </h2>
              </div>

              <button
                onClick={effectiveViewMode === 'weekly' ? nextWeek : nextDay}
                className="p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-zinc-50 transition-all active:scale-95"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-900" />
              </button>
            </div>

            {/* Today Button */}
            <Button
              variant="outline"
              className="h-10 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-2xl border-zinc-200 font-bold hover:bg-zinc-50 text-sm shrink-0"
              onClick={() => setCurrentDate(new Date())}
            >
              Σήμερα
            </Button>
          </div>

          {/* View toggle - hidden on mobile (always daily) */}
          <div className="hidden sm:flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
            <button
              onClick={() => setViewMode('weekly')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                viewMode === 'weekly'
                  ? "bg-zinc-900 text-white shadow-lg"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Calendar className="h-4 w-4" />
              Εβδομάδα
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                viewMode === 'daily'
                  ? "bg-zinc-900 text-white shadow-lg"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Clock className="h-4 w-4" />
              Ημέρα
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-3 sm:p-8">
        {effectiveViewMode === 'weekly' ? (
          <div className="overflow-x-auto -mx-8 px-8">
            <div className="min-w-[1000px]">
              {/* Header Row */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-4 mb-6">
                <div className="h-16 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-zinc-300" />
                </div>
                {weekDays.map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={index} className={cn(
                      "h-20 flex flex-col items-center justify-center rounded-2xl border transition-all",
                      isToday 
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-100" 
                        : "bg-zinc-50 border-zinc-100 text-zinc-900"
                    )}>
                      <div className={cn("text-xs font-black uppercase tracking-widest", isToday ? "text-emerald-100" : "text-zinc-400")}>
                        {greekDaysShort[index]}
                      </div>
                      <div className="text-2xl font-black mt-1">{day.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Time Slots */}
              <div className="space-y-4">
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-[80px_repeat(7,1fr)] gap-4">
                    <div className="h-32 flex items-center justify-center text-sm font-black text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
                      {time}
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const dayBookings = getBookingsForDateAndTime(day, time);
                      const isBlocked = isDateBlocked(day);
                      
                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "group h-32 rounded-2xl border-2 transition-all p-2 relative",
                            isBlocked
                              ? "bg-zinc-50 border-zinc-100/50 cursor-not-allowed opacity-50"
                              : "bg-white border-zinc-50 hover:border-emerald-200 hover:bg-emerald-50/30 cursor-pointer"
                          )}
                          onClick={() => !isBlocked && onSlotClick?.(day, time)}
                        >
                          {isBlocked ? (
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 rotate-[-15deg]">
                              <span className="text-xs font-black text-zinc-400 uppercase tracking-tighter">Μη Διαθέσιμο</span>
                            </div>
                          ) : (
                            <div className="h-full space-y-2 overflow-y-auto custom-scrollbar">
                              {dayBookings.map((booking, bIdx) => {
                                const statusColors = {
                                  confirmed: "bg-emerald-500 shadow-emerald-100",
                                  pending: "bg-amber-500 shadow-amber-100",
                                  completed: "bg-zinc-500 shadow-zinc-100",
                                  cancelled: "bg-red-500 shadow-red-100"
                                };
                                const colorClass = statusColors[booking.status as keyof typeof statusColors] || statusColors.confirmed;
                                
                                return (
                                  <div
                                    key={bIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onBookingClick?.(booking);
                                    }}
                                    className={cn(
                                      "group/booking p-3 rounded-xl text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg",
                                      colorClass
                                    )}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-[11px] font-black truncate leading-tight">{booking.userName || 'Άγνωστος'}</div>
                                        <div className="text-[9px] font-bold opacity-80 mt-0.5 truncate flex items-center gap-1">
                                          <Phone className="h-2 w-2" />
                                          {booking.userPhone || '—'}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 bg-white/20 p-1 rounded-lg">
                                        {onDeleteBooking && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteBooking(booking.id);
                                            }}
                                            disabled={deletingBookingId === booking.id}
                                            className="hover:scale-110 transition-transform"
                                          >
                                            <Trash2 className="h-2.5 w-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Premium Daily View */
          <div className="max-w-4xl mx-auto space-y-4">
            {timeSlots.map((time) => {
              const dayBookings = getBookingsForDateAndTime(currentDate, time);
              const isBlocked = isDateBlocked(currentDate);
              
              return (
                <div key={time} className={cn(
                  "group flex items-stretch gap-3 sm:gap-6 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all",
                  isBlocked
                    ? "bg-zinc-50 border-zinc-100 opacity-60"
                    : "bg-white border-zinc-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50"
                )}>
                  <div className="w-14 sm:w-24 shrink-0 flex items-center justify-center font-black text-base sm:text-xl text-zinc-300 group-hover:text-emerald-500 transition-colors">
                    {time}
                  </div>

                  <div className="h-auto w-px bg-zinc-100" />

                  <div className="flex-1">
                    {isBlocked ? (
                      <div className="py-4 flex items-center gap-3 text-red-500 opacity-60">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-bold text-lg">Μη διαθέσιμο</span>
                      </div>
                    ) : dayBookings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayBookings.map((booking, index) => (
                          <div
                            key={index}
                            onClick={() => onBookingClick?.(booking)}
                            className="bg-zinc-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-zinc-200 hover:border-emerald-300 transition-all cursor-pointer relative group/item"
                          >
                            <div className="flex items-start justify-between gap-2 sm:gap-4">
                              <div className="space-y-1.5 sm:space-y-2 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm sm:text-lg font-black text-zinc-900 truncate">{booking.userName || 'Άγνωστος Πελάτης'}</h4>
                                  <div className={cn(
                                    "h-2 w-2 rounded-full",
                                    booking.status === 'confirmed' ? "bg-emerald-500" :
                                    booking.status === 'pending' ? "bg-amber-500" :
                                    booking.status === 'completed' ? "bg-zinc-500" : "bg-red-500"
                                  )} />
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm font-bold text-zinc-500">
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{booking.userPhone || '—'}</span>
                                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    {pitches.find(p => p.id === booking.pitchId)?.name || 'Άγνωστο'}
                                  </span>
                                  <span className="flex items-center gap-1 text-zinc-900">&euro;{booking.price?.toFixed(2)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity shrink-0">
                                {booking.status !== 'completed' && onUpdateBookingStatus && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateBookingStatus(booking.id, 'completed');
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteBooking?.(booking.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="py-3 sm:py-6 flex items-center justify-between group-hover:px-2 sm:group-hover:px-4 transition-all"
                        onClick={() => onSlotClick?.(currentDate, time)}
                      >
                         <span className="text-zinc-300 font-bold italic text-xs sm:text-base">Κενό</span>
                         <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl font-bold text-xs sm:text-sm h-8 sm:h-9">
                           <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                           <span className="hidden sm:inline">Νέα Κράτηση</span>
                           <span className="sm:hidden">+</span>
                         </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
