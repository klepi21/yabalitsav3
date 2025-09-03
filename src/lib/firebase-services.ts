import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Venue, Pitch, Booking, User, TimeSlot, VenueOwner, BlockedDate, Subscription, Payment } from '../types';

// Firebase data structure interfaces
interface FirebaseVenueData {
  name: string;
  address?: string;
  description?: string;
  city?: string;
  phone?: string;
  email?: string;
  contactDetails?: {
    phone?: string;
    email?: string;
  };
  ownerId: string;
  daysRemaining?: number;
  plan?: 'subscription' | 'pay-per-booking' | 'trial';
  planType?: 'Basic' | 'Pro' | 'Enterprise';
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Venue Services
export const venueService = {
  // Create a new venue
  async create(venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Convert phone/email to contactDetails structure for Firebase
    const firebaseData: any = { ...venueData };
    
    if (venueData.phone !== undefined || venueData.email !== undefined) {
      firebaseData.contactDetails = {
        phone: venueData.phone || '',
        email: venueData.email || '',
      };
      // Remove direct phone/email fields as they're now in contactDetails
      delete firebaseData.phone;
      delete firebaseData.email;
    }
    
    const docRef = await addDoc(collection(db, 'yabalitsa_venues'), {
      ...firebaseData,
      active: firebaseData.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Get all venues
  async getAll(): Promise<Venue[]> {
    const querySnapshot = await getDocs(collection(db, 'yabalitsa_venues'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as FirebaseVenueData;
      return {
        id: doc.id,
        name: data.name,
        address: data.address,
        description: data.description,
        city: data.city,
        // Handle both contactDetails structure and direct phone/email fields
        phone: data.contactDetails?.phone || data.phone || '',
        email: data.contactDetails?.email || data.email || '',
        ownerId: data.ownerId,
        daysRemaining: data.daysRemaining,
        plan: data.plan || 'trial',
        planType: data.planType,
        active: (data as any).active ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Venue;
    });
  },

  // Get venue by ID
  async getById(id: string): Promise<Venue | null> {
    const docRef = doc(db, 'yabalitsa_venues', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as FirebaseVenueData;
      return {
        id: docSnap.id,
        name: data.name,
        address: data.address,
        description: data.description,
        city: data.city,
        // Handle both contactDetails structure and direct phone/email fields
        phone: data.contactDetails?.phone || data.phone || '',
        email: data.contactDetails?.email || data.email || '',
        ownerId: data.ownerId,
        daysRemaining: data.daysRemaining,
        plan: data.plan || 'trial',
        planType: data.planType,
        active: (data as any).active ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Venue;
    }
    return null;
  },

  // Update venue
  async update(id: string, venueData: Partial<Venue>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_venues', id);
    
    // Convert phone/email to contactDetails structure for Firebase
    const firebaseData: any = { ...venueData };
    
    if (venueData.phone !== undefined || venueData.email !== undefined) {
      firebaseData.contactDetails = {
        phone: venueData.phone || '',
        email: venueData.email || '',
      };
      // Remove direct phone/email fields as they're now in contactDetails
      delete firebaseData.phone;
      delete firebaseData.email;
    }
    
    await updateDoc(docRef, {
      ...firebaseData,
      updatedAt: serverTimestamp()
    });
  },

  // Delete venue
  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_venues', id);
    await deleteDoc(docRef);
  }
};

// Pitch Services
export const pitchService = {
  // Create a new pitch
  async create(pitchData: Omit<Pitch, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_pitches'), {
      ...pitchData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Get all pitches
  async getAll(): Promise<Pitch[]> {
    const querySnapshot = await getDocs(collection(db, 'yabalitsa_pitches'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Pitch[];
  },

  // Get pitches by venue
  async getByVenue(venueId: string): Promise<Pitch[]> {
    const q = query(
      collection(db, 'yabalitsa_pitches'),
      where('venueId', '==', venueId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Pitch[];
  },

  // Get pitch by ID
  async getById(id: string): Promise<Pitch | null> {
    const docRef = doc(db, 'yabalitsa_pitches', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Pitch;
    }
    return null;
  },

  // Update pitch
  async update(id: string, pitchData: Partial<Pitch>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_pitches', id);
    await updateDoc(docRef, {
      ...pitchData,
      updatedAt: serverTimestamp()
    });
  },

  // Delete pitch
  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_pitches', id);
    await deleteDoc(docRef);
  }
};

// User Services
export const userService = {
  // Create a new user
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_customers'), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Get all users
  async getAll(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(db, 'yabalitsa_customers'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as User[];
  },

  // Get users by venue (customers associated with this venue's bookings)
  async getByVenue(): Promise<User[]> {
    // For now, return all customers since we don't have venue association in customer documents
    // In a real app, you might want to add venueId to customer documents or query through bookings
    return this.getAll();
  },

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    const docRef = doc(db, 'yabalitsa_customers', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as User;
    }
    return null;
  },

  // Update user
  async update(id: string, userData: Partial<User>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_customers', id);
    await updateDoc(docRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  },

  // Delete user
  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_customers', id);
    await deleteDoc(docRef);
  }
};

// Booking Services
export const bookingService = {
  // Create a new booking
  async create(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_bookings'), {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Get all bookings
  async getAll(): Promise<Booking[]> {
    const querySnapshot = await getDocs(collection(db, 'yabalitsa_bookings'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Booking[];
  },

  // Get bookings by venue
  async getByVenue(venueId: string): Promise<Booking[]> {
    const q = query(
      collection(db, 'yabalitsa_bookings'),
      where('venueId', '==', venueId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Booking[];
  },

  // Get bookings by pitch
  async getByPitch(pitchId: string): Promise<Booking[]> {
    const q = query(
      collection(db, 'yabalitsa_bookings'),
      where('pitchId', '==', pitchId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Booking[];
  },

  // Get booking by ID
  async getById(id: string): Promise<Booking | null> {
    const docRef = doc(db, 'yabalitsa_bookings', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Booking;
    }
    return null;
  },

  // Update booking
  async update(id: string, bookingData: Partial<Booking>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_bookings', id);
    await updateDoc(docRef, {
      ...bookingData,
      updatedAt: serverTimestamp()
    });
  },

  // Delete booking
  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_bookings', id);
    await deleteDoc(docRef);
  }
};

// TimeSlot Services
export const timeSlotService = {
  // Generate time slots for a pitch based on opening hours and slot duration
  async generateSlots(): Promise<void> {
    // This is a placeholder for the slot generation logic
    // In a real implementation, you would:
    // 1. Calculate all possible time slots between startDate and endDate
    // 2. Consider opening hours for each day
    // 3. Create TimeSlot documents in Firestore
    // 4. Handle existing slots and conflicts
    console.log('Generating time slots for pitch');
  },

  // Get available slots for a pitch on a specific date
  async getAvailableSlots(pitchId: string, date: Date): Promise<TimeSlot[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'yabalitsa_timeSlots'),
      where('pitchId', '==', pitchId),
      where('startTime', '>=', startOfDay),
      where('startTime', '<=', endOfDay),
      where('status', '==', 'available')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || new Date()
    })) as TimeSlot[];
  }
};

// Venue Owner Services
export const venueOwnerService = {
  // Create a new venue owner account
  async create(ownerData: Omit<VenueOwner, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // First create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      ownerData.email, 
      ownerData.password
    );
    
    // Then create Firestore document
    const docRef = await addDoc(collection(db, 'yabalitsa_venueOwners'), {
      venueId: ownerData.venueId,
      email: ownerData.email,
      name: ownerData.name,
      phone: ownerData.phone,
      role: ownerData.role,
      permissions: ownerData.permissions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  },

  // Get venue owner by venue ID
  async getByVenueId(venueId: string): Promise<VenueOwner | null> {
    const q = query(
      collection(db, 'yabalitsa_venueOwners'), 
      where('venueId', '==', venueId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as VenueOwner;
    }
    return null;
  },

  // Get venue owner by email
  async getByEmail(email: string): Promise<VenueOwner | null> {
    const q = query(
      collection(db, 'yabalitsa_venueOwners'), 
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as VenueOwner;
    }
    return null;
  },

  // Update venue owner
  async update(id: string, ownerData: Partial<VenueOwner>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_venueOwners', id);
    await updateDoc(docRef, {
      ...ownerData,
      updatedAt: serverTimestamp()
    });
  }
};

// Authentication Services
export const authService = {
  // Sign in venue owner
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Sign out
  async signOut(): Promise<void> {
    await signOut(auth);
  },

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
};

// Blocked Dates Services
export const blockedDateService = {
  // Create a new blocked date
  async create(blockedDateData: Omit<BlockedDate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_blockedDates'), {
      ...blockedDateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Get blocked dates for a pitch
  async getByPitch(pitchId: string): Promise<BlockedDate[]> {
    const q = query(
      collection(db, 'yabalitsa_blockedDates'), 
      where('pitchId', '==', pitchId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as BlockedDate[];
  },

  // Get blocked dates for a venue
  async getByVenue(venueId: string): Promise<BlockedDate[]> {
    const q = query(
      collection(db, 'yabalitsa_blockedDates'), 
      where('venueId', '==', venueId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as BlockedDate[];
  },

  // Update blocked date
  async update(id: string, blockedDateData: Partial<BlockedDate>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_blockedDates', id);
    await updateDoc(docRef, {
      ...blockedDateData,
      updatedAt: serverTimestamp()
    });
  },

  // Delete blocked date
  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_blockedDates', id);
    await deleteDoc(docRef);
  }
};

// Subscription Services
export const subscriptionService = {
  // Create or replace subscription with doc ID equal to venueId
  async set(venueId: string, data: Omit<Subscription, 'id'>): Promise<void> {
    const ref = doc(db, 'yabalitsa_subscriptions', venueId);
    // Remove undefined fields for Firebase
    const cleanData: any = {};
    if (data.stripeCustomerId) cleanData.stripeCustomerId = data.stripeCustomerId;
    cleanData.subscriptionPlan = data.subscriptionPlan;
    cleanData.subscriptionEndDate = data.subscriptionEndDate;
    
    await setDoc(ref, cleanData);
  },

  // Get subscription by venueId (document ID)
  async getByVenueId(venueId: string): Promise<Subscription | null> {
    const ref = doc(db, 'yabalitsa_subscriptions', venueId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return {
      id: snap.id,
      stripeCustomerId: d.stripeCustomerId,
      subscriptionPlan: d.subscriptionPlan,
      subscriptionEndDate: d.subscriptionEndDate
    } as Subscription;
  },

  // Update subscription fields
  async update(venueId: string, data: Partial<Omit<Subscription, 'id'>>): Promise<void> {
    const ref = doc(db, 'yabalitsa_subscriptions', venueId);
    await updateDoc(ref, { ...data });
  },

  // Delete subscription
  async delete(venueId: string): Promise<void> {
    const ref = doc(db, 'yabalitsa_subscriptions', venueId);
    await deleteDoc(ref);
  }
};

// Payment Services
export const paymentService = {
  // Create payment with auto ID
  async create(paymentData: Omit<Payment, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'yabalitsa_payments'), {
      ...paymentData
    });
    return ref.id;
  },

  // Get payments by subscription ID (venueId)
  async getBySubscriptionId(subscriptionId: string): Promise<Payment[]> {
    const q = query(collection(db, 'yabalitsa_payments'), where('subscriptionId', '==', subscriptionId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Payment[];
  },

  // Get payment by ID
  async getById(id: string): Promise<Payment | null> {
    const ref = doc(db, 'yabalitsa_payments', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) } as Payment;
  },

  // Update payment
  async update(id: string, data: Partial<Omit<Payment, 'id'>>): Promise<void> {
    const ref = doc(db, 'yabalitsa_payments', id);
    await updateDoc(ref, { ...data });
  },

  // Delete payment
  async delete(id: string): Promise<void> {
    const ref = doc(db, 'yabalitsa_payments', id);
    await deleteDoc(ref);
  }
  ,
  // Get payment by PaymentIntent ID
  async getByPaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
    const q = query(collection(db, 'yabalitsa_payments'), where('paymentIntentId', '==', paymentIntentId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...(d.data() as any) } as Payment;
  }
};
