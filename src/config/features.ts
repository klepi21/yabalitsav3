// ============================================
// FEATURE FLAGS
// ============================================
// Η πλατφόρμα προσφέρεται προς το παρόν ΜΟΝΟ ως δωρεάν σύστημα κρατήσεων
// γηπέδου. Ακαδημία, τουρνουά, συνδρομές και AI βοηθός είναι κρυμμένα,
// όχι διαγραμμένα: ο κώδικας και τα δεδομένα μένουν ανέγγιχτα, και αρκεί
// να γυρίσει ένα flag σε `true` για να επιστρέψει μια λειτουργία.
//
// Κάθε κρυμμένη λειτουργία φεύγει από ΟΛΑ τα σημεία: sidebar, dashboard,
// ρυθμίσεις, αναφορές, landing page, και οι διαδρομές της κάνουν redirect
// (βλ. `src/proxy.ts`).
// ============================================

export const FEATURES = {
  /** Ακαδημία: χρήστες, τμήματα, προπονήσεις, πληρωμές, ιατρικά, αξιολογήσεις, προπονητές. */
  academy: false,
  /** Τουρνουά. */
  tournaments: false,
  /** Πακέτα, τιμές, ημέρες δοκιμής/συνδρομής, πληρωμές Stripe, λήξη λογαριασμού.
   *  Προσοχή: η αφαίρεση ημερών γινόταν από Cloud Function, που αφαιρέθηκε για
   *  να τρέχει το project στο δωρεάν πλάνο Spark (βλ. git history: functions/). */
  billing: false,
  /** AI βοηθός μέσα στη διαχείριση (η γνώση του καλύπτει και τις κρυμμένες λειτουργίες). */
  aiChat: false,
  /** Δημόσια αναζήτηση σε όλα τα γήπεδα (/fse). Η σελίδα κράτησης κάθε γηπέδου μένει. */
  publicSearch: false,
} as const;

/** Διαδρομές που κάνουν redirect όσο η αντίστοιχη λειτουργία είναι κρυμμένη. */
export const HIDDEN_ROUTES: Array<{ prefix: string; enabled: boolean; redirectTo: string }> = [
  { prefix: '/management/academy', enabled: FEATURES.academy, redirectTo: '/management/dashboard' },
  { prefix: '/management/settings/coaches', enabled: FEATURES.academy, redirectTo: '/management/settings' },
  { prefix: '/coach', enabled: FEATURES.academy, redirectTo: '/management/dashboard' },
  { prefix: '/management/tournaments', enabled: FEATURES.tournaments, redirectTo: '/management/dashboard' },
  { prefix: '/management/settings/renewal', enabled: FEATURES.billing, redirectTo: '/management/settings' },
  { prefix: '/payment', enabled: FEATURES.billing, redirectTo: '/management/dashboard' },
  { prefix: '/fse', enabled: FEATURES.publicSearch, redirectTo: '/' },
  { prefix: '/marketing', enabled: false, redirectTo: '/' },
  { prefix: '/venues', enabled: false, redirectTo: '/' },
];

export function hiddenRouteRedirect(pathname: string): string | null {
  const hit = HIDDEN_ROUTES.find(
    (r) => !r.enabled && (pathname === r.prefix || pathname.startsWith(r.prefix + '/')),
  );
  return hit ? hit.redirectTo : null;
}
