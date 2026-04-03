export interface VenueCoupon {
  code: string;              // The coupon keyword (e.g. "KALOKAIRINOS")
  active: boolean;
  discountType: 'percentage' | 'fixed'; // percentage or fixed EUR amount
  discountValue: number;     // e.g. 50 for 50%, or 10 for €10 off
  appliesTo: 'all' | 'basic' | 'pro' | 'enterprise'; // which plan(s)
  expiresAt?: string;        // ISO date string, optional
  description?: string;      // internal note (e.g. "Promo for first 3 months")
}

export interface Venue {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  address?: string;
  ownerId: string;
  stripeCustomerId?: string; // Stripe Customer ID for payments
  daysRemaining?: number;
  plan?: 'subscription' | 'pay-per-booking' | 'trial';
  planType?: 'Basic' | 'Pro' | 'Enterprise';
  subscriptionEndDate?: string; // ISO string for subscription end date
  active?: boolean;
  managementPinHash?: string; // SHA-256 hash of 4-digit PIN
  bookingsEnabled?: boolean; // whether online bookings are active (default true)
  coupon?: VenueCoupon;      // Legacy single coupon (backward compat)
  coupons?: VenueCoupon[];   // Multiple coupons — only one active at a time
  contactDetails?: {
    email?: string;
    phone?: string;
  };
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

// Modern opening hours with multiple time slots
export interface ModernOpeningHours {
  isOpen: boolean;
  slots: OpeningSlot[];
}

// Union type for opening hours
export type DayOpeningHours = ModernOpeningHours | LegacyOpeningHours;

// Type guard to check if opening hours use the modern slots format
export function hasSlots(hours: DayOpeningHours): hours is ModernOpeningHours {
  return 'slots' in hours;
}

// Helper to safely get slots from either format
export function getOpeningSlots(hours: DayOpeningHours): OpeningSlot[] {
  if (hasSlots(hours)) {
    return hours.slots;
  }
  // Convert legacy format to a single slot
  if (hours.isOpen && hours.open && hours.close) {
    return [{ start: hours.open, end: hours.close }];
  }
  return [];
}

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
  active: boolean;
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
  // Payment collection tracking
  totalSlots?: number;       // total players expected
  paidSlots?: number;        // how many have paid
  collectionStatus?: 'pending' | 'partial' | 'complete';
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
  role: 'admin' | 'coach';
  permissions: string[];
  academyUserId?: string;        // Link to AcademyUser doc (for coaches)
  assignedSquadIds?: string[];   // Squads this user can access (for coaches)
  coachViewMode?: 'own_squads' | 'all_squads';  // Coach visibility: own squads only or all (set by admin)
  createdAt: Date;
  updatedAt: Date;
}

// Subscription interface removed - using one-time payments now
// Plan information is stored directly in the venue document

export interface Payment {
  id: string; // Auto generated Firebase ID
  venueId: string; // Venue this payment belongs to
  stripePaymentIntentId: string; // Stripe PaymentIntent ID
  stripeCustomerId?: string; // Stripe Customer ID
  amount: number; // float (euros, not cents)
  currency: string; // e.g., "eur"
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  paymentDate?: string; // ISO string - when payment was completed
  paymentType: 'one_time_plan_purchase' | 'subscription_payment' | 'booking_payment';
  planName?: 'Basic' | 'Pro' | 'Enterprise';
  durationMonths?: number;
  couponCode?: string;       // The coupon code used
  couponDiscount?: number;   // Discount amount in EUR
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}