import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// In-memory storage for development fallback
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

export async function storeVerificationCode(email: string, code: string, expiresAt: number) {
  const db = getAdminDb();
  
  if (db) {
    // Production: Use Firestore
    try {
      await db.collection('email_verifications').doc(email).set({
        code,
        email,
        expiresAt,
        createdAt: Date.now(),
        attempts: 0,
      });
      return;
    } catch (error) {
      console.error('Failed to store in Firestore, falling back to memory:', error);
    }
  }
  
  // Development fallback: Use in-memory storage
  verificationCodes.set(email, {
    code,
    expiresAt,
    attempts: 0
  });
}

export async function getVerificationCode(email: string) {
  const db = getAdminDb();
  
  if (db) {
    // Production: Use Firestore
    try {
      const doc = await db.collection('email_verifications').doc(email).get();
      if (doc.exists) {
        const data = doc.data() as Record<string, unknown>;
        return {
          code: data.code as string,
          expiresAt: data.expiresAt as number,
          attempts: (data.attempts as number) || 0
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get from Firestore, falling back to memory:', error);
    }
  }
  
  // Development fallback: Use in-memory storage
  return verificationCodes.get(email) || null;
}

export async function deleteVerificationCode(email: string) {
  const db = getAdminDb();
  
  if (db) {
    // Production: Use Firestore
    try {
      await db.collection('email_verifications').doc(email).delete();
      return;
    } catch (error) {
      console.error('Failed to delete from Firestore, falling back to memory:', error);
    }
  }
  
  // Development fallback: Use in-memory storage
  verificationCodes.delete(email);
}

export async function incrementAttempts(email: string) {
  const db = getAdminDb();
  
  if (db) {
    // Production: Use Firestore
    try {
      await db.collection('email_verifications').doc(email).update({
        attempts: FieldValue.increment(1),
        lastAttemptAt: Date.now()
      });
      return;
    } catch (error) {
      console.error('Failed to increment attempts in Firestore, falling back to memory:', error);
    }
  }
  
  // Development fallback: Use in-memory storage
  const stored = verificationCodes.get(email);
  if (stored) {
    stored.attempts += 1;
  }
}

export const MAX_VERIFICATION_ATTEMPTS = 5;

export type VerificationError = 'not_found' | 'too_many_attempts' | 'expired' | 'invalid_code';

/**
 * Ελέγχει τον κωδικό και, αν είναι σωστός, τον «καταναλώνει» (διαγράφεται).
 * Κοινή λογική για την επαλήθευση της εγγραφής και για τη δημόσια κράτηση,
 * ώστε ο server να μην εμπιστεύεται ποτέ ένα «επαληθεύτηκε» από τον client.
 */
export async function consumeVerificationCode(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: VerificationError; attemptsRemaining?: number }> {
  const stored = await getVerificationCode(email);
  if (!stored) return { ok: false, error: 'not_found' };

  if (stored.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await deleteVerificationCode(email);
    return { ok: false, error: 'too_many_attempts' };
  }

  if (Date.now() > stored.expiresAt) {
    await deleteVerificationCode(email);
    return { ok: false, error: 'expired' };
  }

  if (String(stored.code) !== String(code)) {
    await incrementAttempts(email);
    return { ok: false, error: 'invalid_code', attemptsRemaining: MAX_VERIFICATION_ATTEMPTS - stored.attempts - 1 };
  }

  await deleteVerificationCode(email);
  return { ok: true };
}
