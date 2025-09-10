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
        const data = doc.data() as any;
        return {
          code: data.code,
          expiresAt: data.expiresAt,
          attempts: data.attempts || 0
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
