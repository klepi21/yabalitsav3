const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

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

async function getLatestPayment() {
  try {
    console.log('🔍 Getting latest payment...');

    const paymentsRef = collection(db, 'yabalitsa_payments');
    const q = query(paymentsRef, orderBy('paymentDate', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      console.log('📊 Latest payment:');
      console.log(`Payment ID: ${doc.id}`);
      console.log(`Subscription ID (Venue): ${data.subscriptionId}`);
      console.log(`Amount: €${data.amount}`);
      console.log(`Status: ${data.status}`);
      console.log(`Date: ${data.paymentDate}`);
      
      return {
        paymentId: doc.id,
        venueId: data.subscriptionId,
        amount: data.amount,
        status: data.status
      };
    } else {
      console.log('❌ No payments found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getLatestPayment();