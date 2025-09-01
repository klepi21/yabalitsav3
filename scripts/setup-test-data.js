const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

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

async function setupTestData() {
  try {
    console.log('🚀 Setting up test data...');

    // 1. Create a test venue
    console.log('📍 Creating test venue...');
    
    // Check if venue already exists
    const { getDocs, query, where } = require('firebase/firestore');
    const existingVenueQuery = query(
      collection(db, 'yabalitsa_venues'),
      where('name', '==', 'Test Football Arena')
    );
    const existingVenueSnapshot = await getDocs(existingVenueQuery);
    
    let venueId;
    if (!existingVenueSnapshot.empty) {
      console.log(`ℹ️ Test venue already exists`);
      const existingVenue = existingVenueSnapshot.docs[0];
      venueId = existingVenue.id;
      console.log(`✅ Using existing venue with ID: ${venueId}`);
    } else {
      const venueData = {
        name: "Test Football Arena",
        address: "123 Test Street, Athens, Greece",
        contactDetails: {
          email: "test@footballarena.com",
          phone: "+30 210 123 4567"
        },
        notes: "Test venue for development and testing purposes",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const venueRef = await addDoc(collection(db, 'yabalitsa_venues'), venueData);
      venueId = venueRef.id;
      console.log(`✅ Venue created with ID: ${venueId}`);
    }

    // 2. Create a test venue owner account
    console.log('👤 Creating test venue owner...');
    const ownerEmail = "owner@testvenue.com";
    const ownerPassword = "test123456";

    let firebaseUserId;
    try {
      // Try to create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, ownerEmail, ownerPassword);
      firebaseUserId = userCredential.user.uid;
      console.log(`✅ Firebase Auth user created with ID: ${firebaseUserId}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`ℹ️ User ${ownerEmail} already exists in Firebase Auth`);
        // We'll continue with creating the venue owner document
        firebaseUserId = 'existing-user';
      } else {
        throw error;
      }
    }

    // Check if venue owner document already exists
    const existingOwnerQuery = query(
      collection(db, 'yabalitsa_venueOwners'),
      where('email', '==', ownerEmail)
    );
    const existingOwnerSnapshot = await getDocs(existingOwnerQuery);
    
    if (!existingOwnerSnapshot.empty) {
      console.log(`ℹ️ Venue owner document for ${ownerEmail} already exists`);
      const existingOwner = existingOwnerSnapshot.docs[0];
      console.log(`✅ Using existing venue owner with ID: ${existingOwner.id}`);
      console.log(`🏟️ Venue ID: ${existingOwner.data().venueId}`);
    } else {
      // Create venue owner document
      const ownerData = {
        venueId: venueId,
        email: ownerEmail,
        name: "Test Venue Owner",
        phone: "+30 697 123 4567",
        role: "owner",
        permissions: ["manage_venue", "manage_pitches", "manage_bookings", "manage_customers"],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ownerRef = await addDoc(collection(db, 'yabalitsa_venueOwners'), ownerData);
      console.log(`✅ Venue owner document created with ID: ${ownerRef.id}`);
    }

    // 3. Create a test pitch
    console.log('⚽ Creating test pitch...');
    
    // Check if pitch already exists for this venue
    const existingPitchQuery = query(
      collection(db, 'yabalitsa_pitches'),
      where('venueId', '==', venueId)
    );
    const existingPitchSnapshot = await getDocs(existingPitchQuery);
    
    if (!existingPitchSnapshot.empty) {
      console.log(`ℹ️ Test pitch already exists for this venue`);
      const existingPitch = existingPitchSnapshot.docs[0];
      console.log(`✅ Using existing pitch with ID: ${existingPitch.id}`);
    } else {
      const pitchData = {
        venueId: venueId,
        name: "Main Pitch",
        type: "5x5",
        defaultOpeningHours: {
          monday: { open: "09:00", close: "22:00", isOpen: true },
          tuesday: { open: "09:00", close: "22:00", isOpen: true },
          wednesday: { open: "09:00", close: "22:00", isOpen: true },
          thursday: { open: "09:00", close: "22:00", isOpen: true },
          friday: { open: "09:00", close: "22:00", isOpen: true },
          saturday: { open: "09:00", close: "22:00", isOpen: true },
          sunday: { open: "09:00", close: "22:00", isOpen: true }
        },
        slotDuration: 60,
        pricePerSlot: 25.00,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const pitchRef = await addDoc(collection(db, 'yabalitsa_pitches'), pitchData);
      console.log(`✅ Pitch created with ID: ${pitchRef.id}`);
    }

    // 4. Create a test customer
    console.log('👥 Creating test customer...');
    
    let customerId;
    // Check if customer already exists
    const existingCustomerQuery = query(
      collection(db, 'yabalitsa_customers'),
      where('email', '==', 'john@test.com')
    );
    const existingCustomerSnapshot = await getDocs(existingCustomerQuery);
    
    if (!existingCustomerSnapshot.empty) {
      console.log(`ℹ️ Test customer already exists`);
      const existingCustomer = existingCustomerSnapshot.docs[0];
      customerId = existingCustomer.id;
      console.log(`✅ Using existing customer with ID: ${customerId}`);
    } else {
      const customerData = {
        name: "John Test Customer",
        email: "john@test.com",
        phone: "+30 698 123 4567",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const customerRef = await addDoc(collection(db, 'yabalitsa_customers'), customerData);
      customerId = customerRef.id;
      console.log(`✅ Customer created with ID: ${customerId}`);
    }

    // 5. Create test bookings
    console.log('📅 Creating test bookings...');
    
    // Get the pitch ID
    const pitchQuery = query(
      collection(db, 'yabalitsa_pitches'),
      where('venueId', '==', venueId)
    );
    const pitchSnapshot = await getDocs(pitchQuery);
    let pitchId;
    
    if (!pitchSnapshot.empty) {
      pitchId = pitchSnapshot.docs[0].id;
      
      // Create some test bookings for the next few days
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      
      const testBookings = [
        {
          venueId: venueId,
          pitchId: pitchId,
          customerId: customerId,
          customerName: "John Test Customer",
          customerEmail: "john@test.com",
          customerPhone: "+30 698 123 4567",
          startTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM tomorrow
          endTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000),   // 11:00 AM tomorrow
          totalPrice: 25.00,
          status: "pending",
          notes: "Test booking for tomorrow",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          venueId: venueId,
          pitchId: pitchId,
          customerId: customerId,
          customerName: "John Test Customer",
          customerEmail: "john@test.com",
          customerPhone: "+30 698 123 4567",
          startTime: new Date(dayAfterTomorrow.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM day after tomorrow
          endTime: new Date(dayAfterTomorrow.getTime() + 15 * 60 * 60 * 1000),   // 3:00 PM day after tomorrow
          totalPrice: 25.00,
          status: "confirmed",
          notes: "Test booking for day after tomorrow",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          venueId: venueId,
          pitchId: pitchId,
          customerId: customerId,
          customerName: "John Test Customer",
          customerEmail: "john@test.com",
          customerPhone: "+30 698 123 4567",
          startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000), // 4:00 PM today
          endTime: new Date(today.getTime() + 17 * 60 * 60 * 1000),   // 5:00 PM today
          totalPrice: 25.00,
          status: "confirmed",
          notes: "Test booking for today",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          venueId: venueId,
          pitchId: pitchId,
          customerId: customerId,
          customerName: "Maria Test Customer",
          customerEmail: "maria@test.com",
          customerPhone: "+30 698 987 6543",
          startTime: new Date(tomorrow.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM tomorrow
          endTime: new Date(tomorrow.getTime() + 19 * 60 * 60 * 1000),   // 7:00 PM tomorrow
          totalPrice: 30.00,
          status: "pending",
          notes: "New pending booking",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      ];

      for (const bookingData of testBookings) {
        const bookingRef = await addDoc(collection(db, 'yabalitsa_bookings'), bookingData);
        console.log(`✅ Test booking created with ID: ${bookingRef.id}`);
      }
    }

    console.log('\n🎉 Test data setup complete!');
    console.log('\n📋 Test Credentials:');
    console.log('----------------------------------------');
    console.log(`🌐 Venue Login URL: http://localhost:3000/venue-login`);
    console.log(`📧 Email: ${ownerEmail}`);
    console.log(`🔑 Password: ${ownerPassword}`);
    console.log(`🏟️ Venue ID: ${venueId}`);
    console.log('----------------------------------------');
    console.log('\n🚀 You can now:');
    console.log('1. Go to http://localhost:3000/venue-login');
    console.log('2. Login with the credentials above');
    console.log('3. Access your venue dashboard');
    console.log('4. Manage pitches, bookings, and customers');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }
}

// Run the setup
setupTestData();
