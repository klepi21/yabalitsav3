import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yabalitsa-6f5e8.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yabalitsa-6f5e8",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yabalitsa-6f5e8.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "84906829213",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:84906829213:web:fd6f9a0dac07d2ac907b74",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-GWX4K2ZM6J"
};

// reCAPTCHA site key for Phone Authentication
export const RECAPTCHA_SITE_KEY = "6LeXybwrAAAAAN8bzcWCj6CSDIYoiMfMYDInehJ2";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize analytics only in browser environment
export const analytics = typeof window !== 'undefined' && isSupported() 
  ? getAnalytics(app) 
  : null;

export default app;
