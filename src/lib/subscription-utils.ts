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

// Get subscription end date - prioritize from yabalitsa_venues collection
export const getSubscriptionEndDate = (venue: VenueData | null, lastPayment?: PaymentData | null) => {
  if (!venue) return null;
  
  // First priority: use subscriptionEndDate from yabalitsa_venues collection
  if (venue.subscriptionEndDate) {
    return {
      date: venue.subscriptionEndDate,
      source: 'yabalitsa_venues' as const
    };
  }
  
  // Second priority: calculate from last payment
  if (lastPayment && lastPayment.paymentDate && lastPayment.durationMonths) {
    const paymentDate = new Date(lastPayment.paymentDate);
    const calculatedEndDate = new Date(paymentDate);
    calculatedEndDate.setMonth(calculatedEndDate.getMonth() + lastPayment.durationMonths);
    return {
      date: calculatedEndDate.toISOString(),
      source: 'payment' as const
    };
  }
  
  // Third priority: calculate from current date + days remaining
  if (venue.daysRemaining && venue.daysRemaining > 0) {
    const calculatedEndDate = new Date();
    calculatedEndDate.setDate(calculatedEndDate.getDate() + venue.daysRemaining);
    return {
      date: calculatedEndDate.toISOString(),
      source: 'daysRemaining' as const
    };
  }
  
  return null;
};
