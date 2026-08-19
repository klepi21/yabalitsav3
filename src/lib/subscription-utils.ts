// Utility functions for subscription calculations

export interface VenueData {
  id: string;
  plan?: string;
  planType?: string;
  daysRemaining?: number;
  subscriptionEndDate?: string;
}

export interface PaymentData {
  paymentDate?: string;
  durationMonths?: number;
}

// Utility function to safely format dates
export const formatDateSafely = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  return date;
};

// Utility function to calculate days difference safely
export const calculateDaysDifference = (dateString: string | null | undefined) => {
  const date = formatDateSafely(dateString);
  if (!date) return null;
  
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Calculate days remaining - use stored daysRemaining for display
export const calculateDaysRemaining = (venue: VenueData | null) => {
  if (!venue) return null;
  
  // Always use stored daysRemaining for display
  return venue.daysRemaining ?? 0;
};

/**
 * Ημερομηνία λήξης συνδρομής.
 *
 * Το `daysRemaining` έχει ΠΡΟΤΕΡΑΙΟΤΗΤΑ γιατί είναι το πεδίο που πραγματικά
 * ελέγχει την πρόσβαση: το Cloud Function το μειώνει καθημερινά και στο 0
 * απενεργοποιεί το venue.
 *
 * Το αποθηκευμένο `subscriptionEndDate` γράφεται μία φορά κατά την πληρωμή
 * και μετά δεν συντηρείται, οπότε ξεφεύγει. Στο demo έδειχνε «363 ημέρες»
 * δίπλα σε «Λήξη 10 Οκτ 2026» — δύο αντιφατικοί αριθμοί στην ίδια κάρτα.
 * Χρησιμοποιείται πλέον μόνο ως εφεδρεία.
 */
export const getSubscriptionEndDate = (venue: VenueData | null, lastPayment?: PaymentData | null) => {
  if (!venue) return null;

  // Πρώτη προτεραιότητα: ο μετρητής που επιβάλλει την πρόσβαση.
  if (typeof venue.daysRemaining === 'number' && venue.daysRemaining > 0) {
    const calculatedEndDate = new Date();
    calculatedEndDate.setHours(0, 0, 0, 0);
    calculatedEndDate.setDate(calculatedEndDate.getDate() + venue.daysRemaining);
    return {
      date: calculatedEndDate.toISOString(),
      source: 'daysRemaining' as const
    };
  }

  // Εφεδρεία: ό,τι γράφτηκε κατά την πληρωμή.
  if (venue.subscriptionEndDate) {
    return {
      date: venue.subscriptionEndDate,
      source: 'yabalitsa_venues' as const
    };
  }

  // Τελευταία εφεδρεία: υπολογισμός από την τελευταία πληρωμή.
  if (lastPayment && lastPayment.paymentDate && lastPayment.durationMonths) {
    const paymentDate = new Date(lastPayment.paymentDate);
    const calculatedEndDate = new Date(paymentDate);
    calculatedEndDate.setMonth(calculatedEndDate.getMonth() + lastPayment.durationMonths);
    return {
      date: calculatedEndDate.toISOString(),
      source: 'payment' as const
    };
  }

  return null;
};
