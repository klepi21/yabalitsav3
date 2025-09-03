const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkAllCollections() {
  try {
    console.log('📋 Checking all collections...\n');

    const collections = [
      'yabalitsa_venues',
      'yabalitsa_subscriptions', 
      'yabalitsa_payments',
      'yabalitsa_venueOwners',
      'yabalitsa_pitches',
      'yabalitsa_bookings',
      'yabalitsa_customers'
    ];

    for (const collectionName of collections) {
      console.log(`🔍 Checking ${collectionName}:`);
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        console.log(`   Documents: ${querySnapshot.size}`);
        
        if (querySnapshot.size > 0 && (collectionName === 'yabalitsa_subscriptions' || collectionName === 'yabalitsa_payments')) {
          querySnapshot.forEach(doc => {
            console.log(`   ${doc.id}:`, JSON.stringify(doc.data(), null, 4));
          });
        }
      } catch (error) {
        console.log(`   Error accessing ${collectionName}:`, error.message);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllCollections();