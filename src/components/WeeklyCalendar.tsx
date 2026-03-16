'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Trash2 } from 'lucide-react';
import { Booking, Pitch, BlockedDate } from '@/types';

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

export default function WeeklyCalendar({ bookings, pitches = [], blockedDates = [], onBookingClick, onSlotClick, onDeleteBooking, deletingBookingId, onUpdateBookingStatus, updatingBookingId }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');

  // Get the start of the current week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
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
      
      // Reset time to compare only dates
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };



  const formatTime = (time: string) => {
    return time; // Already in 24h format
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Επιβεβαιωμένη';
      case 'pending': return 'Εκκρεμεί';
      case 'completed': return 'Ολοκληρωμένη';
      case 'cancelled': return 'Ακυρωμένη';
      default: return 'Άγνωστη';
    }
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

  // Build responsive date labels
  const longWeekLabel = `${weekStart.toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })}`;
  const shortWeekLabel = `${weekStart.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}`;
  const longDayLabel = currentDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDayLabel = currentDate.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:space-x-4">
          <button
            onClick={viewMode === 'weekly' ? prevWeek : prevDay}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <ChevronLeft className="h-5 w-5 text-gray-900" />
          </button>
          
          <h2 className="leading-tight text-lg sm:text-xl font-semibold text-gray-900">
            {viewMode === 'weekly' ? (
              <>
                <span className="sm:hidden">{shortWeekLabel}</span>
                <span className="hidden sm:inline">{longWeekLabel}</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">{shortDayLabel}</span>
                <span className="hidden sm:inline">{longDayLabel}</span>
              </>
            )}
          </h2>
          
          <button
            onClick={viewMode === 'weekly' ? nextWeek : nextDay}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <ChevronRight className="h-5 w-5 text-gray-900" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors min-w-[96px] ${
              viewMode === 'weekly' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Εβδομάδα
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors min-w-[96px] ${
              viewMode === 'daily' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Ημέρα
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'weekly' ? (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <div className="min-w-[720px] sm:min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-1 mb-2 sticky top-0 z-10 bg-white/90 backdrop-blur-sm">
              <div className="h-12"></div> {/* Empty corner */}
              {weekDays.map((day, index) => (
                <div key={index} className="h-12 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-xs sm:text-sm font-medium text-gray-900">{greekDaysShort[index]}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500">{day.getDate()}</div>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                <div className="h-20 sm:h-24 flex items-center justify-center text-xs sm:text-sm text-gray-500 font-medium sticky left-0 z-10 bg-white">
                  {formatTime(time)}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayBookings = getBookingsForDateAndTime(day, time);
                  return (
                                        <div
                      key={dayIndex}
                      className={`h-20 sm:h-24 border rounded-lg p-1 transition-colors ${
                        isDateBlocked(day) 
                          ? 'border-red-300 bg-red-50 cursor-not-allowed' 
                          : 'border-gray-200 cursor-pointer hover:bg-gray-50 touch-manipulation'
                      }`}
                      onClick={() => !isDateBlocked(day) && onSlotClick?.(day, time)}
                    >
                      {isDateBlocked(day) ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-red-500 text-xs font-medium">🚫 Κλειστό</div>
                            <div className="text-red-400 text-[10px]">Μη διαθέσιμο</div>
                          </div>
                        </div>
                      ) : (
                        dayBookings.map((booking, bookingIndex) => (
                         <div
                           key={bookingIndex}
                           className={`text-xs p-1 rounded mb-1 text-white cursor-pointer ${getStatusColor(booking.status)}`}
                           onClick={(e) => {
                             e.stopPropagation();
                             onBookingClick?.(booking);
                           }}
                         >
                           <div className="flex items-center justify-between">
                             <div className="flex-1">
                               <div className="font-medium truncate">{booking.userName || 'Άγνωστος Πελάτης'}</div>
                               <div className="text-xs opacity-90 flex items-center">
                                 <span className="mr-1">📱</span>
                                 {booking.userPhone || 'Χωρίς τηλέφωνο'}
                               </div>
                               <div className="text-xs opacity-90 flex items-center">
                                 <span className="mr-1">⚽</span>
                                 {(() => {
                                   const pitch = pitches.find(p => p.id === booking.pitchId);
                                   return pitch ? `${pitch.name} (${pitch.type})` : 'Άγνωστο Γήπεδο';
                                 })()}
                               </div>
                               <div className="text-xs opacity-90">{getStatusText(booking.status)}</div>
                             </div>
                             <div className="flex items-center space-x-1">
                               {booking.status !== 'completed' && onUpdateBookingStatus && (
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     onUpdateBookingStatus(booking.id, 'completed');
                                   }}
                                   disabled={updatingBookingId === booking.id}
                                   className="text-white hover:text-green-200 disabled:opacity-50"
                                   title="Ολοκλήρωση"
                                 >
                                   <span className="text-xs">✅</span>
                                 </button>
                               )}
                               {onDeleteBooking && (
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     onDeleteBooking(booking.id);
                                   }}
                                   disabled={deletingBookingId === booking.id}
                                   className="text-white hover:text-red-200 disabled:opacity-50"
                                   title="Διαγραφή"
                                 >
                                   <Trash2 className="h-3 w-3" />
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Daily View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {timeSlots.map((time) => {
              const dayBookings = getBookingsForDateAndTime(currentDate, time);
              return (
                <div key={time} className={`flex items-center space-x-4 p-3 border rounded-lg ${
                  isDateBlocked(currentDate) 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="w-16 text-sm font-medium text-gray-500">
                    {formatTime(time)}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {isDateBlocked(currentDate) ? (
                      <div className="flex items-center justify-center w-full py-4">
                        <div className="text-center">
                          <div className="text-red-500 text-sm font-medium">🚫 Ημέρα Κλειστή</div>
                          <div className="text-red-400 text-xs">Δεν είναι δυνατή η κράτηση</div>
                        </div>
                      </div>
                    ) : dayBookings.length > 0 ? (
                      dayBookings.map((booking, index) => (
                        <div
                          key={index}
                          className={`px-3 py-2 rounded-lg text-white cursor-pointer ${getStatusColor(booking.status)}`}
                          onClick={() => onBookingClick?.(booking)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{booking.userName || 'Άγνωστος Πελάτης'}</div>
                              <div className="text-sm opacity-90 flex items-center">
                                <span className="mr-1">📱</span>
                                {booking.userPhone || 'Χωρίς τηλέφωνο'}
                              </div>
                              <div className="text-sm opacity-90 flex items-center">
                                <span className="mr-1">⚽</span>
                                {(() => {
                                  const pitch = pitches.find(p => p.id === booking.pitchId);
                                  return pitch ? `${pitch.name} (${pitch.type})` : 'Άγνωστο Γήπεδο';
                                })()}
                              </div>
                              <div className="text-sm opacity-90">{getStatusText(booking.status)}</div>
                              <div className="text-sm opacity-90">€{booking.price?.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {booking.status !== 'completed' && onUpdateBookingStatus && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateBookingStatus(booking.id, 'completed');
                                  }}
                                  disabled={updatingBookingId === booking.id}
                                  className="text-white hover:text-green-200 disabled:opacity-50"
                                  title="Ολοκλήρωση"
                                >
                                  <span className="text-sm">✅</span>
                                </button>
                              )}
                              {onDeleteBooking && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteBooking(booking.id);
                                  }}
                                  disabled={deletingBookingId === booking.id}
                                  className="text-white hover:text-red-200 disabled:opacity-50"
                                  title="Διαγραφή"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-sm">Δεν υπάρχουν κρατήσεις</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
