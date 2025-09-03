import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI",
  authDomain: "yabalitsa-6f5e8.firebaseapp.com",
  projectId: "yabalitsa-6f5e8",
  storageBucket: "yabalitsa-6f5e8.firebasestorage.app",
  messagingSenderId: "84906829213",
  appId: "1:84906829213:web:fd6f9a0dac07d2ac907b74",
  measurementId: "G-GWX4K2ZM6J"
};

// reCAPTCHA site key for Phone Authentication
export const RECAPTCHA_SITE_KEY = "6Le9Dr0rAAAAAFbKbdjPkPz8aTj2A6QSF4Dbf1CZ";

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
