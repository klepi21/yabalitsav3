import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function for merging Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date and time formatting utilities
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('el-GR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function parseTime(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Time slot generation utilities
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number
): string[] {
  const slots: string[] = [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  const current = new Date(start);
  while (current < end) {
    slots.push(formatTime(current));
    current.setMinutes(current.getMinutes() + slotDuration);
  }
  
  return slots;
}

// Day utilities
export function getDayName(dayIndex: number): string {
  const days = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  return days[dayIndex];
}

export function getShortDayName(dayIndex: number): string {
  const days = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
  return days[dayIndex];
}

// Today's slots utility
export function getTodaySlots(pitch: unknown): string[] {
  const today = new Date();
  const dayName = getDayName(today.getDay());
  const openingHours = pitch.defaultOpeningHours[dayName];
  
  if (!openingHours || !openingHours.isOpen) {
    return [];
  }
  
  return generateTimeSlots(
    openingHours.open,
    openingHours.close,
    pitch.slotDuration
  );
}

// Price calculation utility
export function calculatePrice(slotDuration: number, pricePerSlot: number): number {
  return (slotDuration / 60) * pricePerSlot;
}
