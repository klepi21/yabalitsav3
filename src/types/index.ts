export interface Venue {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  address?: string;
  ownerId: string;
  daysRemaining?: number;
  plan?: 'subscription' | 'pay-per-booking' | 'trial';
  planType?: 'Basic' | 'Pro' | 'Enterprise';
  subscriptionEndDate?: string; // ISO string for subscription end date
  active?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpeningSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// Legacy opening hours structure for backward compatibility
export interface LegacyOpeningHours {
  isOpen: boolean;
  open: string; // HH:mm format
  close: string; // HH:mm format
}

// Union type for opening hours
export type DayOpeningHours = {
  isOpen: boolean;
  slots: OpeningSlot[];
} | LegacyOpeningHours;

export interface Pitch {
  id: string;
  venueId: string;
  name: string;
  type: '5x5' | '6x6' | '7x7' | '8x8' | '9x9';
  defaultOpeningHours: {
    [key: string]: DayOpeningHours; // day of week (sunday, monday, etc.)
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
  venueIds?: string[]; // Array of venue IDs where this customer has bookings
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

export interface Subscription {
  id: string; // Auto generated Firebase ID
  venueId: string; // Venue this subscription belongs to
  stripeCustomerId?: string; // Optional - from Stripe customer
  subscriptionEndDate: string; // ISO string
  subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise';
}

export interface Payment {
  id: string; // Auto generated Firebase ID
  amount: number; // float (euros, not cents)
  currency: string; // e.g., "eur"
  paymentDate: string; // ISO string
  paymentIntentId: string; // Stripe PaymentIntent ID
  subscriptionId: string; // reference to yabalitsa_subscriptions document ID (venueId)
  planName?: 'Basic' | 'Pro' | 'Enterprise';
  durationMonths?: number;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded' | 'failed';
}