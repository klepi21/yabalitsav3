'use client';

import { SWRConfig } from 'swr';
import { swrFetcher, ApiError } from '@/lib/api-client';

/**
 * Κεντρική ρύθμιση cache.
 *
 * Πριν: κάθε πλοήγηση ξαναέφερνε τα πάντα από το μηδέν, και δύο σελίδες
 * που ήθελαν τα ίδια δεδομένα έκαναν δύο ξεχωριστά requests.
 *
 * Τώρα: stale-while-revalidate — η σελίδα ζωγραφίζεται ΑΜΕΣΩΣ από την cache
 * και το φρέσκο έρχεται από πίσω. Τα ταυτόχρονα requests για το ίδιο κλειδί
 * γίνονται ένα.
 */
export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        // Ίδιο κλειδί μέσα σε 5s => ένα request.
        dedupingInterval: 5000,
        // Επαναφορά στο tab: μόνο αν τα δεδομένα είναι παλιότερα από 30s.
        revalidateOnFocus: true,
        focusThrottleInterval: 30_000,
        revalidateOnReconnect: true,
        // Κρατάμε τα προηγούμενα δεδομένα ενώ αλλάζει το κλειδί (π.χ. σελίδα
        // στο pagination) ώστε να μη «τρεμοπαίζει» η λίστα.
        keepPreviousData: true,
        shouldRetryOnError: (err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500),
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
