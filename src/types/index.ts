export interface Venue {
  id: string;
  name: string;
  address: string;
  city?: string;
  contactDetails: {
    email: string;
    phone: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pitch {
  id: string;
  venueId: string;
  name: string;
  type: '5x5' | '6x6' | '7x7' | '8x8' | '9x9';
  defaultOpeningHours: {
    [key: string]: {
      open: string; // HH:mm format
      close: string; // HH:mm format
      isOpen: boolean;
    };
  };
  slotDuration: number; // in minutes
  pricePerSlot: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  id: string;
  pitchId: string;
  venueId: string;
  startTime: Date;
  endTime: Date;
  status: 'available' | 'booked' | 'blocked';
  price: number;
}

export interface Booking {
  id: string;
  slotId: string;
  pitchId: string;
  venueId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  startTime: Date;
  endTime: Date;
  price: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockedSlot {
  id: string;
  pitchId: string;
  venueId: string;
  startTime: Date;
  endTime: Date;
  reason: string;
  isRecurring: boolean;
  recurringPattern?: {
    type: 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for Sunday-Saturday
    dayOfMonth?: number; // 1-31
  };
  createdAt: Date;
}

export interface BlockedDate {
  id: string;
  pitchId: string;
  venueId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  isFullDay: boolean; // If true, blocks entire day; if false, blocks specific time slots
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueSettings {
  id: string;
  venueId: string;
  timezone: string;
  currency: string;
  bookingRules: {
    maxAdvanceBookingDays: number;
    minNoticeHours: number;
    allowSameDayBooking: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueOwner {
  id: string;
  venueId: string;
  email: string;
  password: string; // This will be hashed in Firebase Auth
  name: string;
  phone: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}
