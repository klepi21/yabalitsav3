const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, query, where, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI",
  authDomain: "yabalitsa-6f5e8.firebaseapp.com",
  projectId: "yabalitsa-6f5e8",
  storageBucket: "yabalitsa-6f5e8.firebasestorage.app",
  messagingSenderId: "84906829213",
  appId: "1:84906829213:web:fd6f9a0dac07d2ac907b74",
  measurementId: "G-GWX4K2ZM6J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fixVenueOwnerId() {
  try {
    console.log('🔧 Fixing venue ownerId...');

    // Sign in to get the actual Firebase Auth UID
    const userCredential = await signInWithEmailAndPassword(auth, 'owner@testvenue.com', 'test123456');
    const firebaseUid = userCredential.user.uid;
    console.log('✅ Firebase Auth UID:', firebaseUid);

    // Find the test venue
    const venuesRef = collection(db, 'yabalitsa_venues');
    const q = query(venuesRef, where('name', '==', 'Test Football Arena'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ Test venue not found');
      return;
    }

    const venueDoc = querySnapshot.docs[0];
    const venueId = venueDoc.id;
    console.log('📍 Found venue ID:', venueId);

    // Update venue with correct ownerId
    await updateDoc(doc(db, 'yabalitsa_venues', venueId), {
      ownerId: firebaseUid
    });

    console.log('✅ Updated venue ownerId to:', firebaseUid);
    console.log('🎉 Ready to test payment API!');
    
    console.log('\n📋 Test Data:');
    console.log('----------------------------------------');
    console.log(`🆔 User UID: ${firebaseUid}`);
    console.log(`🏟️ Venue ID: ${venueId}`);
    console.log('📧 Email: owner@testvenue.com');
    console.log('🔑 Password: test123456');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixVenueOwnerId();