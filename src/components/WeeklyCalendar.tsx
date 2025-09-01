'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Booking } from '@/types';

interface WeeklyCalendarProps {
  bookings: Booking[];
  pitches?: Pitch[];
  onBookingClick?: (booking: Booking) => void;
  onSlotClick?: (date: Date, time: string) => void;
  onDeleteBooking?: (bookingId: string) => void;
  deletingBookingId?: string | null;
  onUpdateBookingStatus?: (bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') => void;
  updatingBookingId?: string | null;
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];


const greekDaysShort = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

export default function WeeklyCalendar({ bookings, pitches = [], onBookingClick, onSlotClick, onDeleteBooking, deletingBookingId, onUpdateBookingStatus, updatingBookingId }: WeeklyCalendarProps) {
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

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={viewMode === 'weekly' ? prevWeek : prevDay}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-900" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900">
            {viewMode === 'weekly' 
              ? `${weekStart.toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })}`
              : currentDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            }
          </h2>
          
          <button
            onClick={viewMode === 'weekly' ? nextWeek : nextDay}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-900" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'weekly' 
                ? 'bg-football-green text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Εβδομάδα
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'daily' 
                ? 'bg-football-green text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ClockIcon className="h-4 w-4 inline mr-2" />
            Ημέρα
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'weekly' ? (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="h-12"></div> {/* Empty corner */}
              {weekDays.map((day, index) => (
                <div key={index} className="h-12 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{greekDaysShort[index]}</div>
                  <div className="text-xs text-gray-500">{day.getDate()}</div>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                <div className="h-16 flex items-center justify-center text-sm text-gray-500 font-medium">
                  {formatTime(time)}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayBookings = getBookingsForDateAndTime(day, time);
                  return (
                    <div
                      key={dayIndex}
                      className="h-16 border border-gray-200 rounded-lg p-1 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => onSlotClick?.(day, time)}
                    >
                                             {dayBookings.map((booking, bookingIndex) => (
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
                                   <TrashIcon className="h-3 w-3" />
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       ))}
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
                <div key={time} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="w-16 text-sm font-medium text-gray-500">
                    {formatTime(time)}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {dayBookings.length > 0 ? (
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
                                  <TrashIcon className="h-4 w-4" />
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
