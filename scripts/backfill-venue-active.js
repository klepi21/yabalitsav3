const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI",
  authDomain: "yabalitsa-6f5e8.firebaseapp.com",
  projectId: "yabalitsa-6f5e8",
  storageBucket: "yabalitsa-6f5e8.firebasestorage.app",
  messagingSenderId: "84906829213",
  appId: "1:84906829213:web:fd6f9a0dac07d2ac907b74"
};

async function backfillActiveField() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('🚀 Backfilling active field on yabalitsa_venues...');

  const venuesCol = collection(db, 'yabalitsa_venues');
  const snapshot = await getDocs(venuesCol);

  let total = 0;
  let updated = 0;

  for (const venueDoc of snapshot.docs) {
    total += 1;
    const data = venueDoc.data();
    if (data.active === undefined) {
      await updateDoc(doc(db, 'yabalitsa_venues', venueDoc.id), { active: true });
      updated += 1;
      console.log(`✅ Set active=true for venue ${venueDoc.id}`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Processed: ${total}`);
  console.log(`🛠️  Updated:  ${updated}`);
  console.log(`✔️  Unchanged: ${total - updated}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Backfill complete.');
}

backfillActiveField().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});


