import { auth } from '@/lib/firebase';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Ένα σημείο για κάθε authenticated κλήση προς τα /api routes.
 *
 * Το token μπαίνει εδώ αντί σε κάθε σελίδα ξεχωριστά — πριν κάθε component
 * καλούσε μόνο του getIdToken() και έστηνε τα headers στο χέρι.
 */
export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Δεν υπάρχει ενεργή σύνδεση', 401);

  const token = await user.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = 'Το αίτημα απέτυχε';
    try {
      message = (await res.json())?.error ?? message;
    } catch {
      /* το σώμα δεν ήταν JSON */
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

/**
 * Κλειδί cache για το SWR. Είναι πίνακας ώστε δύο σελίδες που ζητούν
 * τα ίδια δεδομένα να μοιράζονται εγγραφή — και να μη γίνει διπλό fetch.
 */
export type CacheKey = readonly [path: string, body: Record<string, unknown>] | null;

export const swrFetcher = ([path, body]: NonNullable<CacheKey>) => apiPost(path, body);
