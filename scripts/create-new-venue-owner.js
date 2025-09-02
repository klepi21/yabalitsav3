const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc, 
  collection,
  addDoc,
  serverTimestamp 
} = require('firebase/firestore');

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI",
  authDomain: "yabalitsa-6f5e8.firebaseapp.com",
  projectId: "yabalitsa-6f5e8",
  storageBucket: "yabalitsa-6f5e8.firebasestorage.app",
  messagingSenderId: "84906829213",
  appId: "1:84906829213:web:fd6f9a0dac07d2ac907b74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Venue owner details - Customize these
const venueOwnerData = {
  email: "newvenue@example.com",
  password: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
  phone: "+306912345678"
};

// Venue details - Customize these
const venueData = {
  name: "New Football Arena",
  address: "123 Sports Street, Athens 12345",
  description: "Modern football facility with multiple pitches",
  contactDetails: {
    phone: "+306912345678",
    email: "newvenue@example.com",
    website: "https://newvenue.com"
  },
  location: {
    latitude: 37.9838,
    longitude: 23.7275
  },
  amenities: ["Parking", "Showers", "Changing Rooms", "Cafe"],
  isActive: true
};

// Pitch details - Customize these
const pitchData = {
  name: "Main 5x5",
  type: "5x5",
  description: "Professional 5x5 football pitch",
  pricePerSlot: 50,
  slotDuration: 60,
  isActive: true,
  defaultOpeningHours: {
    monday: { isOpen: true, open: "09:00", close: "23:00" },
    tuesday: { isOpen: true, open: "09:00", close: "23:00" },
    wednesday: { isOpen: true, open: "09:00", close: "23:00" },
    thursday: { isOpen: true, open: "09:00", close: "23:00" },
    friday: { isOpen: true, open: "09:00", close: "23:00" },
    saturday: { isOpen: true, open: "09:00", close: "23:00" },
    sunday: { isOpen: true, open: "09:00", close: "23:00" }
  }
};

async function createVenueOwner() {
  try {
    console.log('🚀 Starting venue owner creation...');
    
    // Step 1: Create user account (or sign in if it already exists)
    console.log('📝 Creating user account...');
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        venueOwnerData.email, 
        venueOwnerData.password
      );
      user = userCredential.user;
      console.log('✅ User account created:', user.uid);
    } catch (err) {
      if (err && err.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Email already in use, signing in instead...');
        const signInCred = await signInWithEmailAndPassword(auth, venueOwnerData.email, venueOwnerData.password);
        user = signInCred.user;
        console.log('✅ Signed in as existing user:', user.uid);
      } else {
        throw err;
      }
    }
    
    // Step 2: Create venue owner profile
    console.log('👤 Creating venue owner profile...');
    const venueOwnerProfile = {
      uid: user.uid,
      email: venueOwnerData.email,
      firstName: venueOwnerData.firstName,
      lastName: venueOwnerData.lastName,
      phone: venueOwnerData.phone,
      role: 'venue_owner',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'yabalitsa_venueOwners', user.uid), venueOwnerProfile, { merge: true });
    console.log('✅ Venue owner profile created');
    
    // Step 3: Create venue
    console.log('🏟️ Creating venue...');
    const venueWithOwner = {
      ...venueData,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const venueRef = await addDoc(collection(db, 'yabalitsa_venues'), venueWithOwner);
    console.log('✅ Venue created:', venueRef.id);
    
    // Link venueId to venue owner profile
    await setDoc(doc(db, 'yabalitsa_venueOwners', user.uid), { venueId: venueRef.id, updatedAt: serverTimestamp() }, { merge: true });
    
    // Step 4: Create pitch
    console.log('⚽ Creating pitch...');
    const pitchWithVenue = {
      ...pitchData,
      venueId: venueRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const pitchRef = await addDoc(collection(db, 'yabalitsa_pitches'), pitchWithVenue);
    console.log('✅ Pitch created:', pitchRef.id);
    
    // Step 5: Update venue with pitch reference
    await setDoc(doc(db, 'yabalitsa_venues', venueRef.id), {
      ...venueWithOwner,
      pitchIds: [pitchRef.id]
    }, { merge: true });
    
    console.log('\n🎉 SUCCESS! Venue owner creation completed!');
    console.log('\n📋 CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${venueOwnerData.email}`);
    console.log(`🔑 Password: ${venueOwnerData.password}`);
    console.log(`🆔 User ID: ${user.uid}`);
    console.log(`🏟️ Venue ID: ${venueRef.id}`);
    console.log(`⚽ Pitch ID: ${pitchRef.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔗 Login URL: http://localhost:3000/venue-login');
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    
  } catch (error) {
    console.error('❌ Error creating venue owner:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('\n💡 Solution: Change the email in venueOwnerData.email');
    } else if (error.code === 'auth/invalid-api-key') {
      console.log('\n💡 Solution: Update firebaseConfig with your actual Firebase config');
    } else if (error.code === 'permission-denied') {
      console.log('\n💡 Solution: Check Firebase security rules and collection names');
    }
    
    console.log('\n🔧 Debug info:');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
  }
}

// Run the script
createVenueOwner();
