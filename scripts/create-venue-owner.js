const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, addDoc } = require('firebase/firestore');

// Firebase configuration - using the actual config from the project
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
const auth = getAuth(app);
const db = getFirestore(app);

async function createVenueOwnerAndVenue() {
  try {
    // Venue owner details - modify these as needed
    const venueOwnerData = {
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
      phone: '+306912345678'
    };

    // Venue details - modify these as needed
    const venueData = {
      name: 'Example Football Pitch',
      address: '123 Example Street, Athens, Greece',
      phone: '+306912345678',
      email: 'info@examplepitch.com',
      description: 'A professional football pitch for rent',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating venue owner account...');
    
    // Create the user account
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      venueOwnerData.email, 
      venueOwnerData.password
    );
    
    const user = userCredential.user;
    console.log('✅ Venue owner account created with UID:', user.uid);

    // Create venue owner document
    const venueOwnerDoc = {
      id: user.uid,
      email: venueOwnerData.email,
      name: venueOwnerData.name,
      phone: venueOwnerData.phone,
      role: 'venue_owner',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'venueOwners', user.uid), venueOwnerDoc);
    console.log('✅ Venue owner document created');

    // Create venue document
    const venueDoc = {
      ...venueData,
      ownerId: user.uid,
      ownerEmail: venueOwnerData.email
    };

    const venueRef = await addDoc(collection(db, 'venues'), venueDoc);
    console.log('✅ Venue document created with ID:', venueRef.id);

    // Update venue owner with venue ID
    await setDoc(doc(db, 'venueOwners', user.uid), {
      ...venueOwnerDoc,
      venueId: venueRef.id
    }, { merge: true });
    console.log('✅ Venue owner updated with venue ID');

    console.log('\n🎉 Success! Venue owner and venue created successfully.');
    console.log('\n📋 Summary:');
    console.log('Venue Owner UID:', user.uid);
    console.log('Venue ID:', venueRef.id);
    console.log('Email:', venueOwnerData.email);
    console.log('Password:', venueOwnerData.password);
    console.log('\n⚠️  Remember to change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating venue owner and venue:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('This email is already registered. Please use a different email.');
    } else if (error.code === 'auth/weak-password') {
      console.log('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('Invalid email format. Please check the email address.');
    }
  }
}

// Run the function
createVenueOwnerAndVenue();
