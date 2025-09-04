// Centralized pricing configuration
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  basePrice: number; // Price in EUR (before VAT)
  features: string[];
  popular?: boolean;
  maxPitches?: number;
  stripePriceIds: {
    monthly: string;
    semiAnnual: string;
    annual: string;
  };
}

export interface PricingConfig {
  vatRate: number; // VAT rate (e.g., 0.24 for 24%)
  discounts: {
    sixMonths: number; // e.g., 0.07 for 7%
    twelveMonths: number; // e.g., 0.12 for 12%
  };
  currency: 'eur' | 'usd';
  plans: PricingPlan[];
}

// Environment variable helpers with fallbacks
const getEnvString = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// Main pricing configuration
export const pricingConfig: PricingConfig = {
  vatRate: 0.24, // 24% VAT
  discounts: {
    sixMonths: 0.07, // 7% discount for 6 months
    twelveMonths: 0.12, // 12% discount for 12 months
  },
  currency: 'eur',
  plans: [
    {
      id: 'basic',
      name: 'Basic',
      description: '1 γήπεδο, απεριόριστες κρατήσεις',
      basePrice: 25,
      maxPitches: 1,
      features: [
        '1 γήπεδο',
        'Απεριόριστες κρατήσεις',
        'Προηγμένο διαχειριστικό',
        'Email υποστήριξη'
      ],
      stripePriceIds: {
        monthly: getEnvString('STRIPE_BASIC_MONTHLY_PRICE_ID', ''),
        semiAnnual: getEnvString('STRIPE_BASIC_SEMI_ANNUAL_PRICE_ID', ''),
        annual: getEnvString('STRIPE_BASIC_ANNUAL_PRICE_ID', '')
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      description: '2-3 γήπεδα, απεριόριστες κρατήσεις',
      basePrice: 45,
      maxPitches: 3,
      features: [
        '2-3 γήπεδα',
        'Απεριόριστες κρατήσεις',
        'Προηγμένο διαχειριστικό',
        'Προτεραιότητα υποστήριξης'
      ],
      popular: true,
      stripePriceIds: {
        monthly: getEnvString('STRIPE_PRO_MONTHLY_PRICE_ID', ''),
        semiAnnual: getEnvString('STRIPE_PRO_SEMI_ANNUAL_PRICE_ID', ''),
        annual: getEnvString('STRIPE_PRO_ANNUAL_PRICE_ID', '')
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: '3+ γήπεδα, unique booking link',
      basePrice: 75,
      maxPitches: 999, // Unlimited
      features: [
        '3+ γήπεδα',
        'Unique booking link',
        'Πλήρες διαχειριστικό',
        'Dedicated υποστήριξη'
      ],
      stripePriceIds: {
        monthly: getEnvString('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', ''),
        semiAnnual: getEnvString('STRIPE_ENTERPRISE_SEMI_ANNUAL_PRICE_ID', ''),
        annual: getEnvString('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID', '')
      }
    }
  ]
};

// Utility functions for price calculations
export const pricingUtils = {
  // Get plan by ID
  getPlan(planId: string): PricingPlan | undefined {
    return pricingConfig.plans.find(plan => plan.id === planId);
  },

  // Get Stripe Price ID for a plan and duration
  getStripePriceId(planId: string, duration: 1 | 6 | 12): string {
    const plan = this.getPlan(planId);
    if (!plan) return '';
    
    if (duration === 1) return plan.stripePriceIds.monthly;
    if (duration === 6) return plan.stripePriceIds.semiAnnual;
    if (duration === 12) return plan.stripePriceIds.annual;
    
    return '';
  },

  // Calculate price with VAT
  calculateFinalPrice(basePrice: number): number {
    return basePrice * (1 + pricingConfig.vatRate);
  },

  // Calculate monthly price with duration discount
  calculateMonthlyPrice(basePrice: number, duration: 1 | 6 | 12): number {
    let discount = 0;
    if (duration === 6) discount = pricingConfig.discounts.sixMonths;
    if (duration === 12) discount = pricingConfig.discounts.twelveMonths;
    
    const discountedPrice = basePrice * (1 - discount);
    return discountedPrice * (1 + pricingConfig.vatRate);
  },

  // Calculate total price for duration
  calculateTotalPrice(basePrice: number, duration: 1 | 6 | 12): number {
    let discount = 0;
    if (duration === 6) discount = pricingConfig.discounts.sixMonths;
    if (duration === 12) discount = pricingConfig.discounts.twelveMonths;
    
    const discountedPrice = basePrice * (1 - discount);
    const totalWithoutVAT = discountedPrice * duration;
    return totalWithoutVAT * (1 + pricingConfig.vatRate);
  },

  // Get amount in cents for Stripe
  getStripeAmount(basePrice: number, duration: 1 | 6 | 12): number {
    const totalPrice = this.calculateTotalPrice(basePrice, duration);
    return Math.round(totalPrice * 100); // Convert to cents
  },

  // Format price for display
  formatPrice(price: number): string {
    return `€${price.toFixed(2)}`;
  },

  // Get all plans
  getAllPlans(): PricingPlan[] {
    return pricingConfig.plans;
  },

  // Get discount percentage for display
  getDiscountPercentage(duration: 1 | 6 | 12): number {
    if (duration === 6) return pricingConfig.discounts.sixMonths * 100;
    if (duration === 12) return pricingConfig.discounts.twelveMonths * 100;
    return 0;
  }
};