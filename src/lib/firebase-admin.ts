import type { ServiceAccount } from 'firebase-admin';
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

function initializeAdmin(): admin.app.App | null {
  if (app) return app;
  try {
    if (admin.apps.length > 0) {
      app = admin.app();
      return app;
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT not set. Admin features disabled.');
      return null;
    }

    const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount;
    app = admin.initializeApp({
      credential: admin.credential.cert(json),
    });
    return app;
  } catch (err) {
    console.error('[firebase-admin] Failed to initialize:', err);
    return null;
  }
}

export function getAdminDb(): admin.firestore.Firestore | null {
  const a = initializeAdmin();
  return a ? admin.firestore(a) : null;
}

export function getAdminApp(): admin.app.App | null {
  return initializeAdmin();
}


