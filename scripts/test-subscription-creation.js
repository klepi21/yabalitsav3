const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function checkSubscription() {
  try {
    console.log('🔍 Checking if subscription was created...');

    const venueId = '83wc95y5tcifsdJp3RK6';
    
    // Check subscription document
    const subscriptionRef = doc(db, 'yabalitsa_subscriptions', venueId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (subscriptionSnap.exists()) {
      console.log('✅ Subscription found in yabalitsa_subscriptions:');
      console.log(JSON.stringify(subscriptionSnap.data(), null, 2));
    } else {
      console.log('❌ No subscription found in yabalitsa_subscriptions');
    }

    // Check payments
    const { collection, getDocs, query, where } = require('firebase/firestore');
    const paymentsRef = collection(db, 'yabalitsa_payments');
    const q = query(paymentsRef, where('subscriptionId', '==', venueId));
    const paymentSnapshot = await getDocs(q);

    console.log(`\n💳 Found ${paymentSnapshot.size} payments for venue ${venueId}:`);
    paymentSnapshot.forEach(doc => {
      console.log(`Payment ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSubscription();