'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import type { CacheKey } from '@/lib/api-client';

/* ------------------------------------------------------------------ *
 * Κλειδιά cache
 *
 * Ένα σημείο ορισμού: όποιος θέλει να ακυρώσει την cache μετά από
 * εγγραφή, χρησιμοποιεί το ΙΔΙΟ κλειδί — όχι ένα αντίγραφό του.
 * ------------------------------------------------------------------ */
export const keys = {
  bookings: (venueId?: string, range?: { from: string; to: string }): CacheKey =>
    venueId ? ['/api/bookings/get-by-venue', { venueId, ...(range ?? {}) }] : null,
  pendingBookings: (venueId?: string): CacheKey =>
    venueId ? ['/api/bookings/get-by-venue', { venueId, status: 'pending', limit: 5 }] : null,
  customers: (venueId?: string): CacheKey =>
    venueId ? ['/api/customers/get-by-venue', { venueId }] : null,
  pitches: (venueId?: string): CacheKey =>
    venueId ? ['/api/pitches/get-by-venue', { venueId }] : null,
  dashboard: (venueId?: string, range?: { from: string; to: string }): CacheKey =>
    venueId ? ['/api/dashboard/get-data', { venueId, ...(range ?? {}) }] : null,
  settings: (venueId?: string): CacheKey =>
    venueId ? ['/api/settings/get-data', { venueId }] : null,
  quote: (venueId?: string): CacheKey =>
    venueId ? ['/api/subscription/quote', { venueId }] : null,
} as const;

/* ------------------------------------------------------------------ *
 * Ακύρωση
 * ------------------------------------------------------------------ */

/** Ακυρώνει κάθε εγγραφή cache που αφορά το συγκεκριμένο γήπεδο. */
export function invalidateVenue(venueId: string) {
  return globalMutate(
    (key) => Array.isArray(key) && (key[1] as { venueId?: string })?.venueId === venueId,
    undefined,
    { revalidate: true }
  );
}

/** Ακυρώνει μόνο ό,τι αφορά κρατήσεις — μετά από δημιουργία/ακύρωση. */
export function invalidateBookings(venueId: string) {
  return globalMutate(
    (key) =>
      Array.isArray(key) &&
      typeof key[0] === 'string' &&
      (key[0].includes('/bookings/') || key[0].includes('/dashboard/')) &&
      (key[1] as { venueId?: string })?.venueId === venueId,
    undefined,
    { revalidate: true }
  );
}

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;

export interface BookingsPayload {
  success: boolean;
  bookings: Raw[];
  pitches: Raw[];
  blockedDates: Raw[];
  /** Παρόν όταν το εύρος περιορίστηκε — υπάρχουν παλαιότερες εγγραφές. */
  hasMore?: boolean;
}

export function useBookings(venueId?: string, range?: { from: string; to: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BookingsPayload>(
    keys.bookings(venueId, range)
  );
  return {
    bookings: data?.bookings ?? [],
    pitches: data?.pitches ?? [],
    blockedDates: data?.blockedDates ?? [],
    hasMore: data?.hasMore ?? false,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  };
}

export function useCustomers(venueId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{ customers: Raw[] }>(keys.customers(venueId));
  return { customers: data?.customers ?? [], error, isLoading, refresh: mutate };
}

export function usePitches(venueId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{ pitches: Raw[] }>(keys.pitches(venueId));
  return { pitches: data?.pitches ?? [], error, isLoading, refresh: mutate };
}

export interface UpgradeQuote {
  owed: boolean;
  billedMonthlyBase: number;
  currentMonthlyBase: number;
  amountWithVat: number;
  daysRemaining: number;
  addedPlatform: boolean;
  addedAcademy: boolean;
}

export interface SubscriptionQuote {
  usage: { pitches: number; athletes: number; hasAcademy: boolean };
  limits: { pitches: number; athletes: number };
  atPitchLimit: boolean;
  atAthleteLimit: boolean;
  requiresContact: boolean;
  upgrade: UpgradeQuote;
  /** Χρειάζεται πληρωμή για να προστεθεί η επόμενη εγγραφή; */
  pitchNeedsUnlock: boolean;
  pitchUnlockAmount: number;
  athleteNeedsUnlock: boolean;
  athleteUnlockAmount: number;
  /** Τι πληρώνει σήμερα ανά μήνα με ΦΠΑ· null αν δεν υπάρχει στιγμιότυπο. */
  billedMonthly: number | null;
  quotes?: Array<{ duration: 1 | 6 | 12; monthlyWithVat: number }>;
  venue?: { plan: string | null; planType: string | null; daysRemaining: number; active: boolean };
  headroom?: {
    pitchesToNextTier: number | null;
    athletesToNextTier: number | null;
    platformTierLabel: string;
    academyTierLabel: string | null;
  };
}

/**
 * Μέγεθος και όρια self-serve. Χρησιμοποιείται και για την τιμολόγηση και
 * για να μπλοκάρει η δημιουργία πάνω από το όριο.
 */
export function useSubscriptionQuote(venueId?: string) {
  const { data, error, isLoading } = useSWR<SubscriptionQuote & Raw>(keys.quote(venueId));
  return {
    usage: data?.usage,
    limits: data?.limits,
    atPitchLimit: !!data?.atPitchLimit,
    atAthleteLimit: !!data?.atAthleteLimit,
    requiresContact: !!data?.requiresContact,
    upgrade: data?.upgrade,
    pitchNeedsUnlock: !!data?.pitchNeedsUnlock,
    pitchUnlockAmount: data?.pitchUnlockAmount ?? 0,
    athleteNeedsUnlock: !!data?.athleteNeedsUnlock,
    athleteUnlockAmount: data?.athleteUnlockAmount ?? 0,
    billedMonthly: data?.billedMonthly ?? null,
    quotes: data?.quotes,
    venue: data?.venue,
    headroom: data?.headroom,
    error,
    isLoading,
  };
}

/** Ολόκληρη η απάντηση του quote, για οθόνες που τη χρειάζονται πλήρη. */
export function useSubscriptionQuoteRaw<T = Raw>(venueId?: string) {
  const { data, error, isLoading, mutate } = useSWR<T>(keys.quote(venueId));
  return { raw: data, error, isLoading, refresh: mutate };
}

export function usePendingBookings(venueId?: string) {
  const { data, error, isLoading } = useSWR<BookingsPayload>(keys.pendingBookings(venueId), {
    // Το καμπανάκι είναι σε κάθε σελίδα — μια ήπια περιοδική ανανέωση αρκεί.
    refreshInterval: 120_000,
  });
  return { pending: data?.bookings ?? [], error, isLoading };
}
