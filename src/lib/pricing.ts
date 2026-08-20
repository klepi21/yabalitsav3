// Centralized pricing configuration

/**
 * Διάρκεια δωρεάν δοκιμής σε ημέρες.
 *
 * ΜΟΝΑΔΙΚΗ πηγή αλήθειας — πριν ήταν hardcoded «15» σε τρία διαφορετικά
 * σημεία (δημιουργία venue, fallback στο firebase-services, test data),
 * που σημαίνει ότι μια αλλαγή μπορούσε εύκολα να ξεχαστεί κάπου.
 *
 * Πώς δουλεύει: η τιμή γράφεται ως `daysRemaining` πάνω στο venue κατά τη
 * δημιουργία. Ένα προγραμματισμένο Cloud Function (`decrementDaysRemaining`,
 * καθημερινά στις 00:00) το μειώνει κατά 1 και στο 0 θέτει `active: false`.
 * Άρα η αλλαγή αυτής της τιμής επηρεάζει ΜΟΝΟ νέες εγγραφές — τα υπάρχοντα
 * venues κρατούν τον δικό τους αποθηκευμένο μετρητή.
 */
export const TRIAL_DAYS = 30;

export interface PricingConfig {
  vatRate: number; // VAT rate (e.g., 0.24 for 24%)
  discounts: {
    sixMonths: number; // e.g., 0.07 for 7%
    twelveMonths: number; // e.g., 0.12 for 12%
  };
  currency: 'eur' | 'usd';
}

// Main pricing configuration
export const pricingConfig: PricingConfig = {
  vatRate: 0.24, // 24% VAT
  discounts: {
    sixMonths: 0.07, // 7% discount for 6 months
    twelveMonths: 0.12, // 12% discount for 12 months
  },
  currency: 'eur',
};

/* ==================================================================== *
 *  ΤΙΜΟΛΟΓΗΣΗ ΒΑΣΕΙ ΜΕΓΕΘΟΥΣ
 *
 *  Το παλιό μοντέλο χρέωνε €21/μήνα σε όλους: το ίδιο πλήρωνε ένα
 *  γηπεδάκι με 2 σκάφη και μια ακαδημία 400 αθλητών. Επειδή το κόστος
 *  εξυπηρέτησης μεγαλώνει με το μέγεθος αλλά τα έσοδα όχι, το περιθώριο
 *  αντιστρεφόταν όσο μεγάλωναν οι πελάτες.
 *
 *  Αρχές σχεδιασμού — «να μεγαλώνουμε μαζί του χωρίς να του κακοφαίνεται»:
 *
 *  1. ΖΩΝΕΣ, ΟΧΙ ΜΕΤΡΗΤΗΣ. Χρέωση ανά μονάδα (π.χ. €0,40/αθλητή) μοιάζει
 *     με ταξίμετρο και δημιουργεί άγχος. Οι ζώνες δίνουν σταθερό,
 *     προβλέψιμο λογαριασμό.
 *  2. ΦΘΙΝΟΝ ΠΟΣΟΣΤΟ. Όσο μεγαλώνει ο πελάτης, τόσο ΜΙΚΡΟΤΕΡΟ ποσοστό του
 *     τζίρου του πληρώνει. Η ανάπτυξη ανταμείβεται, δεν φορολογείται.
 *  3. ΧΑΜΗΛΟ ΚΑΤΩΦΛΙ. Ο μικρότερος πελάτης πληρώνει σχεδόν ό,τι και πριν.
 *  4. ΠΟΤΕ HARD BLOCK. Αν ξεπεράσει τη ζώνη του, η πλατφόρμα ΣΥΝΕΧΙΖΕΙ να
 *     δουλεύει. Ενημερώνεται ήρεμα, δεν κλειδώνεται.
 *  5. ΔΙΑΦΑΝΕΙΑ ΠΡΙΝ ΤΟ ΟΡΙΟ. Βλέπει πού βρίσκεται πριν το φτάσει.
 *  6. GRANDFATHERING. Οι υπάρχοντες πελάτες δεν αλλάζουν τιμή από κάτω
 *     προς τα πάνω χωρίς προειδοποίηση.
 * ==================================================================== */

export interface PricingTier {
  id: string;
  label: string;
  /** Ανώτατο όριο της ζώνης· `null` = πέρα από το self-serve. */
  upTo: number | null;
  /** Μηνιαία τιμή προ ΦΠΑ. `null` όταν η τιμή συμφωνείται. */
  monthly: number | null;
  /** Η ζώνη δεν έχει αυτόματη τιμή — απαιτεί επικοινωνία. */
  custom?: true;
}

/**
 * Πάνω από αυτά τα μεγέθη δεν υπάρχει αυτόματη τιμή.
 *
 * Δεν είναι τιμωρία — είναι το σημείο όπου το self-serve παύει να έχει
 * νόημα: ένα κέντρο αυτού του μεγέθους θέλει συζήτηση και συμβόλαιο, όχι
 * ταμείο. Η πλατφόρμα συνεχίζει να λειτουργεί πλήρως· απλώς δεν
 * δημιουργούνται ΝΕΑ γήπεδα/αθλητές μέχρι να συμφωνηθεί πλάνο.
 */
export const SELF_SERVE_LIMITS = {
  pitches: 12,
  athletes: 500,
} as const;

/** Ζώνες πλατφόρμας — μονάδα μέτρησης: αριθμός γηπέδων. */
export const platformTiers: PricingTier[] = [
  { id: 'starter', label: 'Έως 2 γήπεδα', upTo: 2, monthly: 29 },
  { id: 'growth', label: '3–6 γήπεδα', upTo: 6, monthly: 59 },
  { id: 'scale', label: '7–12 γήπεδα', upTo: SELF_SERVE_LIMITS.pitches, monthly: 99 },
  { id: 'platform_custom', label: 'Πάνω από 12 γήπεδα', upTo: null, monthly: null, custom: true },
];

/**
 * Ζώνες ακαδημίας — μονάδα μέτρησης: ενεργοί αθλητές.
 *
 * Οι αθλητές είναι η σωστή μονάδα εδώ γιατί συνδέονται ΑΜΕΣΑ με τον τζίρο
 * του πελάτη: χρεώνει μηνιαία συνδρομή τον καθένα. Όταν μεγαλώνει ο
 * λογαριασμός μας, έχει ήδη μεγαλώσει ο δικός του.
 */
export const academyTiers: PricingTier[] = [
  { id: 'academy_s', label: 'Έως 40 αθλητές', upTo: 40, monthly: 19 },
  { id: 'academy_m', label: '41–120 αθλητές', upTo: 120, monthly: 49 },
  { id: 'academy_l', label: '121–250 αθλητές', upTo: 250, monthly: 89 },
  { id: 'academy_xl', label: '251–500 αθλητές', upTo: SELF_SERVE_LIMITS.athletes, monthly: 139 },
  { id: 'academy_custom', label: 'Πάνω από 500 αθλητές', upTo: null, monthly: null, custom: true },
];

/** Βρίσκει τη ζώνη στην οποία πέφτει μια ποσότητα. */
export function resolveTier(tiers: PricingTier[], quantity: number): PricingTier {
  return tiers.find((t) => t.upTo === null || quantity <= t.upTo) ?? tiers[tiers.length - 1];
}

/** Πόσες μονάδες απομένουν μέχρι την επόμενη ζώνη· `null` στην τελευταία. */
export function unitsToNextTier(tiers: PricingTier[], quantity: number): number | null {
  const tier = resolveTier(tiers, quantity);
  return tier.upTo === null ? null : tier.upTo - quantity;
}

/** Έχει ξεπεράσει το μέγεθος όπου υπάρχει αυτόματη τιμή; */
export function exceedsSelfServe(usage: Pick<UsageSnapshot, 'pitches' | 'athletes' | 'hasAcademy'>): boolean {
  if (usage.pitches > SELF_SERVE_LIMITS.pitches) return true;
  if (usage.hasAcademy && usage.athletes > SELF_SERVE_LIMITS.athletes) return true;
  return false;
}

export interface UsageSnapshot {
  pitches: number;
  athletes: number;
  /** Αν το venue χρησιμοποιεί καθόλου το module ακαδημίας. */
  hasAcademy: boolean;
}

export interface PriceBreakdown {
  platformTier: PricingTier;
  academyTier: PricingTier | null;
  /** Μηνιαίο σύνολο προ ΦΠΑ, πριν την έκπτωση διάρκειας. */
  monthlyBeforeDiscount: number;
  /** Μηνιαίο με έκπτωση διάρκειας, με ΦΠΑ. */
  monthlyWithVat: number;
  /** Συνολική χρέωση για όλη τη διάρκεια, με ΦΠΑ. */
  totalWithVat: number;
  durationMonths: 1 | 6 | 12;
  discountPercent: number;
  /** Το μέγεθος ξεπερνά το self-serve — η τιμή συμφωνείται. */
  requiresContact: boolean;
}

/**
 * Υπολογίζει την τιμή από το ΠΡΑΓΜΑΤΙΚΟ μέγεθος του πελάτη.
 *
 * Ο πελάτης δεν επιλέγει «πλάνο» — επιλέγει μόνο διάρκεια πληρωμής.
 * Έτσι δεν χρειάζεται ποτέ να «αναβαθμιστεί» χειροκίνητα, και δεν υπάρχει
 * στιγμή όπου κάτι κλειδώνει επειδή ξέχασε να αλλάξει πακέτο.
 */
export function calculateSubscription(
  usage: UsageSnapshot,
  duration: 1 | 6 | 12
): PriceBreakdown {
  const discount =
    duration === 6
      ? pricingConfig.discounts.sixMonths
      : duration === 12
        ? pricingConfig.discounts.twelveMonths
        : 0;

  const platformTier = resolveTier(platformTiers, usage.pitches);
  const academyTier = usage.hasAcademy ? resolveTier(academyTiers, usage.athletes) : null;
  const requiresContact = !!platformTier.custom || !!academyTier?.custom;

  const monthlyBeforeDiscount = requiresContact
    ? 0
    : (platformTier.monthly ?? 0) + (academyTier?.monthly ?? 0);

  const discountedMonthly = monthlyBeforeDiscount * (1 - discount);
  const vat = 1 + pricingConfig.vatRate;

  return {
    requiresContact,
    platformTier,
    academyTier,
    monthlyBeforeDiscount,
    monthlyWithVat: discountedMonthly * vat,
    totalWithVat: discountedMonthly * duration * vat,
    durationMonths: duration,
    discountPercent: Math.round(discount * 100),
  };
}

/* ==================================================================== *
 *  ΑΝΑΒΑΘΜΙΣΗ ΜΕΣΑ ΣΤΗΝ ΠΕΡΙΟΔΟ
 *
 *  Πρόβλημα που λύνει: ένας πελάτης πλήρωνε ετήσια ως Starter (2 γήπεδα,
 *  χωρίς ακαδημία) και την επομένη πρόσθετε 12 γήπεδα και 500 αθλητές.
 *  Έπαιρνε υπηρεσία αξίας €3.116 έχοντας πληρώσει €379 — και η νέα τιμή
 *  ίσχυε μόνο στην επόμενη ανανέωση.
 *
 *  Λύση: κρατάμε στιγμιότυπο του ΤΙ ΠΛΗΡΩΘΗΚΕ και, όταν η χρήση το
 *  ξεπεράσει, ζητάμε τη διαφορά αναλογικά για τις ημέρες που απομένουν.
 *  Η χρέωση είναι ρητή ενέργεια του πελάτη, όχι σιωπηλή έκπληξη.
 * ==================================================================== */

/** Τι πληρώθηκε τη στιγμή της αγοράς. Αποθηκεύεται πάνω στο venue. */
export interface BilledSnapshot {
  platformTierId: string;
  academyTierId: string | null;
  /** Μηνιαία βάση προ ΦΠΑ και προ έκπτωσης διάρκειας. */
  monthlyBase: number;
  durationMonths: 1 | 6 | 12;
  /** Η έκπτωση που ίσχυσε, ώστε η αναβάθμιση να την τιμήσει κι αυτή. */
  discountPercent: number;
  chargedAt: string;
}

export interface UpgradeQuote {
  /** Οφείλεται διαφορά; */
  owed: boolean;
  /** Μηνιαία βάση που πληρώθηκε / που ισχύει τώρα (προ ΦΠΑ). */
  billedMonthlyBase: number;
  currentMonthlyBase: number;
  /** Ποσό προς πληρωμή, με ΦΠΑ, για τις ημέρες που απομένουν. */
  amountWithVat: number;
  daysRemaining: number;
  /** Τι άλλαξε — για να το δείξουμε στον πελάτη. */
  addedPlatform: boolean;
  addedAcademy: boolean;
}

/**
 * Υπολογίζει τη διαφορά που οφείλεται για τις υπόλοιπες ημέρες.
 *
 * Επιστρέφει `owed: false` όταν:
 *  - δεν υπάρχει στιγμιότυπο πληρωμής (δοκιμή, ή συνδρομή πριν τη μετάβαση —
 *    δεν χρεώνουμε αναδρομικά κάποιον που δεν ήξερε τον κανόνα),
 *  - η χρήση δεν ξεπερνά ό,τι πληρώθηκε,
 *  - δεν απομένουν ημέρες.
 */
export function calculateUpgrade(
  usage: UsageSnapshot,
  billed: BilledSnapshot | null | undefined,
  daysRemaining: number
): UpgradeQuote {
  const current = calculateSubscription(usage, 1);
  const currentMonthlyBase = current.monthlyBeforeDiscount;

  const empty: UpgradeQuote = {
    owed: false,
    billedMonthlyBase: billed?.monthlyBase ?? currentMonthlyBase,
    currentMonthlyBase,
    amountWithVat: 0,
    daysRemaining,
    addedPlatform: false,
    addedAcademy: false,
  };

  if (!billed || daysRemaining <= 0 || current.requiresContact) return empty;
  if (currentMonthlyBase <= billed.monthlyBase) return empty;

  const extraBase = currentMonthlyBase - billed.monthlyBase;
  const discountMultiplier = 1 - billed.discountPercent / 100;
  const months = daysRemaining / 30;

  return {
    ...empty,
    owed: true,
    amountWithVat: extraBase * discountMultiplier * months * (1 + pricingConfig.vatRate),
    addedPlatform: current.platformTier.id !== billed.platformTierId,
    addedAcademy: !!current.academyTier && current.academyTier.id !== billed.academyTierId,
  };
}

/**
 * Καλύπτει το πληρωμένο πλάνο μια υποθετική χρήση;
 *
 * Χρησιμοποιείται πριν τη δημιουργία γηπέδου/αθλητή: αν η προσθήκη βγάζει
 * τον πελάτη εκτός της ζώνης που έχει πληρώσει, ζητάμε πρώτα τη διαφορά.
 * Δεν κλείνει τίποτα από όσα ήδη έχει — αφορά μόνο τη ΝΕΑ εγγραφή.
 */
export function isCoveredByBilled(
  usage: UsageSnapshot,
  billed: BilledSnapshot | null | undefined
): boolean {
  // Χωρίς στιγμιότυπο (δοκιμή, ή συνδρομή πριν τη μετάβαση) δεν μπλοκάρουμε.
  if (!billed) return true;

  const platform = resolveTier(platformTiers, usage.pitches);
  if (platform.id !== billed.platformTierId) return false;

  if (!usage.hasAcademy) return true;
  const academy = resolveTier(academyTiers, usage.athletes);
  return academy.id === billed.academyTierId;
}

/** Τι θα κόστιζε να καλυφθεί μια υποθετική χρήση για τις υπόλοιπες ημέρες. */
export function quoteUnlock(
  usage: UsageSnapshot,
  billed: BilledSnapshot | null | undefined,
  daysRemaining: number,
  target: { pitches?: number; athletes?: number }
): UpgradeQuote {
  const hypothetical: UsageSnapshot = {
    pitches: target.pitches ?? usage.pitches,
    athletes: target.athletes ?? usage.athletes,
    hasAcademy: usage.hasAcademy || (target.athletes ?? 0) > 0,
  };
  return calculateUpgrade(hypothetical, billed, daysRemaining);
}

/** Δημιουργεί το στιγμιότυπο που αποθηκεύεται μετά από επιτυχή πληρωμή. */
export function buildBilledSnapshot(
  breakdown: PriceBreakdown,
  chargedAt: string
): BilledSnapshot {
  return {
    platformTierId: breakdown.platformTier.id,
    academyTierId: breakdown.academyTier?.id ?? null,
    monthlyBase: breakdown.monthlyBeforeDiscount,
    durationMonths: breakdown.durationMonths,
    discountPercent: breakdown.discountPercent,
    chargedAt,
  };
}

/**
 * Ετικέτες για αποθήκευση/εμφάνιση. Το παλιό μοντέλο αποθήκευε
 * Basic/Pro/Enterprise, που στην πραγματικότητα ήταν διάρκειες πληρωμής.
 * Τώρα το planType δηλώνει το ΜΕΓΕΘΟΣ του πελάτη.
 */
export function describeBreakdown(b: PriceBreakdown): { planType: string; planName: string } {
  if (b.requiresContact) return { planType: 'Custom', planName: 'Κατόπιν συνεννόησης' };

  const platform = b.platformTier;

  /* `planType` είναι ΕΣΩΤΕΡΙΚΟ: μπαίνει στη βάση και στο admin panel για
     reporting και υποστήριξη. Δεν εμφανίζεται στον πελάτη.

     `planName` είναι ό,τι βλέπει ο πελάτης (π.χ. στο ιστορικό πληρωμών),
     οπότε περιγράφεται με ΜΕΓΕΘΗ — την ίδια γλώσσα με τη δημόσια σελίδα
     τιμών και τη σελίδα συνδρομής. Πριν έγραφε «Growth + Ακαδημία (…)»,
     δηλαδή ξαναέφερνε το εσωτερικό όνομα μπροστά στον πελάτη. */
  const planType = platform.id.charAt(0).toUpperCase() + platform.id.slice(1);
  const planName = b.academyTier
    ? `${platform.label} + ακαδημία ${b.academyTier.label.toLowerCase()}`
    : platform.label;

  return { planType, planName };
}

/** Βοηθήματα που χρησιμοποιούνται ακόμα. Ό,τι αφορούσε το παλιό,
 *  επίπεδο μοντέλο (getPlan, getAllPlans, Stripe Price IDs) αφαιρέθηκε. */
export const pricingUtils = {
  // Calculate total price for duration
  calculateTotalPrice(basePrice: number, duration: 1 | 6 | 12): number {
    let discount = 0;
    if (duration === 6) discount = pricingConfig.discounts.sixMonths;
    if (duration === 12) discount = pricingConfig.discounts.twelveMonths;
    
    const discountedPrice = basePrice * (1 - discount);
    const totalWithoutVAT = discountedPrice * duration;
    return totalWithoutVAT * (1 + pricingConfig.vatRate);
  },

  // Format price for display
  /**
   * Ελληνική μορφοποίηση: κόμμα για δεκαδικά, τελεία για χιλιάδες.
   * Πριν έβγαζε «€1160.64» — αγγλικό πρότυπο σε ελληνικό προϊόν, και
   * ασυνεπές με τις κάρτες αναβάθμισης που ήδη χρησιμοποιούσαν el-GR.
   */
  formatPrice(price: number | null | undefined): string {
    // Οι ζώνες «κατόπιν συνεννόησης» δεν έχουν τιμή. Ένα null δεν πρέπει
    // να ρίχνει ολόκληρη τη σελίδα με TypeError.
    if (price == null || !Number.isFinite(price)) return '—';
    return `€${price.toLocaleString('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  // Apply coupon discount to a total price
  applyCouponDiscount(totalPrice: number, coupon: { discountType: 'percentage' | 'fixed'; discountValue: number }): { discountedPrice: number; discountAmount: number } {
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = totalPrice * (coupon.discountValue / 100);
    } else {
      discountAmount = coupon.discountValue;
    }
    // Ensure minimum charge of €0.50 (Stripe minimum)
    const discountedPrice = Math.max(0.50, totalPrice - discountAmount);
    discountAmount = totalPrice - discountedPrice;
    return { discountedPrice, discountAmount };
  }
};