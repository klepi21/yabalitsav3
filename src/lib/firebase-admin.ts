// Re-export from api-auth to ensure single Firebase Admin initialization
import { db, auth } from './api-auth';

export function getAdminDb() {
  return db;
}

export function getAdminAuth() {
  return auth;
}
