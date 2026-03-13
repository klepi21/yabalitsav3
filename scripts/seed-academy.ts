/**
 * Seed script for Academy data
 * Run with: npx tsx scripts/seed-academy.ts <venueId> <email> <password>
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI",
  authDomain: "yabalitsa-6f5e8.firebaseapp.com",
  projectId: "yabalitsa-6f5e8",
  storageBucket: "yabalitsa-6f5e8.firebasestorage.app",
  messagingSenderId: "84906829213",
  appId: "1:84906829213:web:fd6f9a0dac07d2ac907b74",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const VENUE_ID = process.argv[2];
const EMAIL = process.argv[3];
const PASSWORD = process.argv[4];

if (!VENUE_ID || !EMAIL || !PASSWORD) {
  console.error('❌ Usage: npx tsx scripts/seed-academy.ts <venueId> <email> <password>');
  console.error('   Example: npx tsx scripts/seed-academy.ts Fetx6lJMG7T5yqieEQQu admin@academy.gr mypassword');
  process.exit(1);
}
const GROUPS_COL = 'yabalitsa_user_groups';
const USERS_COL = 'yabalitsa_academy_users';
const SQUADS_COL = 'yabalitsa_squads';

// ============================================
// Helper
// ============================================
async function clearCollection(colName: string) {
  const q = query(collection(db, colName), where('venueId', '==', VENUE_ID));
  const snap = await getDocs(q);
  console.log(`  Deleting ${snap.size} docs from ${colName}...`);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, colName, d.id));
  }
}

// ============================================
// 1. Seed User Groups
// ============================================
async function seedGroups() {
  console.log('\n📋 Seeding User Groups...');
  await clearCollection(GROUPS_COL);

  const groups = [
    {
      name: 'Αθλητής',
      namePlural: 'Αθλητές',
      icon: '⚽',
      color: 'green',
      isDefault: true,
      order: 1,
      capabilities: ['squad_assignment', 'parent_linking'],
      fields: [
        { key: 'birth_year', label: 'Έτος Γέννησης', type: 'number', required: true, placeholder: 'π.χ. 2012' },
        { key: 'medical_cert_expiry', label: 'Λήξη Ιατρικού Πιστοποιητικού', type: 'date', required: false },
      ],
    },
    {
      name: 'Γονέας',
      namePlural: 'Γονείς',
      icon: '👨‍👩‍👧',
      color: 'amber',
      isDefault: true,
      order: 2,
      capabilities: [],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'goneas@email.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
        { key: 'address', label: 'Διεύθυνση', type: 'textarea', required: true, placeholder: 'Πλήρης διεύθυνση' },
      ],
    },
    {
      name: 'Προπονητής',
      namePlural: 'Προπονητές',
      icon: '🏆',
      color: 'blue',
      isDefault: true,
      order: 3,
      capabilities: ['coach_squads'],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'coach@academy.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
        { key: 'specialization', label: 'Ειδικότητα', type: 'select', required: true, options: ['Αρχηγός Προπονητής', 'Βοηθός Προπονητής', 'Προπονητής Τερματοφύλακα', 'Γυμναστής', 'Τεχνικός Προπονητής', 'Προπονητής Ακαδημιών'] },
        { key: 'license', label: 'Δίπλωμα', type: 'select', required: true, options: ['Χωρίς Δίπλωμα', 'Εθνικό D', 'Εθνικό C', 'UEFA C', 'UEFA B', 'UEFA A', 'UEFA Pro'] },
      ],
    },
    {
      name: 'Διαχειριστής',
      namePlural: 'Διαχειριστές',
      icon: '👤',
      color: 'purple',
      isDefault: true,
      order: 4,
      capabilities: [],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'admin@academy.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
      ],
    },
    {
      name: 'Φυσιοθεραπευτής',
      namePlural: 'Φυσιοθεραπευτές',
      icon: '🩺',
      color: 'teal',
      isDefault: false,
      order: 5,
      capabilities: [],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'physio@academy.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
        { key: 'specialty', label: 'Εξειδίκευση', type: 'select', required: true, options: ['Αθλητική Φυσιοθεραπεία', 'Ορθοπεδική', 'Αποκατάσταση Τραυματισμών', 'Γενική Φυσιοθεραπεία'] },
        { key: 'amka', label: 'ΑΜΚΑ', type: 'text', required: false, placeholder: 'Αριθμός ΑΜΚΑ' },
      ],
    },
  ];

  const groupIds: Record<string, string> = {};
  for (const g of groups) {
    const ref = await addDoc(collection(db, GROUPS_COL), {
      ...g,
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    groupIds[g.name] = ref.id;
    console.log(`  ✅ ${g.icon} ${g.name} → ${ref.id}`);
  }
  return groupIds;
}

// ============================================
// 2. Seed Squads
// ============================================
async function seedSquads() {
  console.log('\n⚽ Seeding Squads...');
  await clearCollection(SQUADS_COL);

  const squads = [
    { name: 'Αετοί U10', ageGroup: 'U10', coachIds: [] },
    { name: 'Λιοντάρια U12', ageGroup: 'U12', coachIds: [] },
    { name: 'Τίγρεις U14', ageGroup: 'U14', coachIds: [] },
    { name: 'Πάνθηρες U16', ageGroup: 'U16', coachIds: [] },
    { name: 'Ακαδημία Juniors', ageGroup: 'U8', coachIds: [] },
  ];

  const squadIds: Record<string, string> = {};
  for (const s of squads) {
    const ref = await addDoc(collection(db, SQUADS_COL), {
      ...s,
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    squadIds[s.name] = ref.id;
    console.log(`  ✅ ${s.name} (${s.ageGroup}) → ${ref.id}`);
  }
  return squadIds;
}

// ============================================
// 3. Seed Users
// ============================================
async function seedUsers(groupIds: Record<string, string>, squadIds: Record<string, string>) {
  console.log('\n👥 Seeding Users...');
  await clearCollection(USERS_COL);

  const userIds: Record<string, string> = {};

  // --- Coaches ---
  const coaches = [
    { displayName: 'Νίκος Παπαδόπουλος', fields: { email: 'nikos.p@academy.gr', phone: '6971234567', specialization: 'Αρχηγός Προπονητής', license: 'UEFA A' } },
    { displayName: 'Γιάννης Αντωνίου', fields: { email: 'giannis.a@academy.gr', phone: '6972345678', specialization: 'Βοηθός Προπονητής', license: 'UEFA B' } },
    { displayName: 'Μαρία Κωνσταντίνου', fields: { email: 'maria.k@academy.gr', phone: '6973456789', specialization: 'Προπονητής Τερματοφύλακα', license: 'UEFA C' } },
    { displayName: 'Δημήτρης Βασιλείου', fields: { email: 'dimitris.v@academy.gr', phone: '6974567890', specialization: 'Γυμναστής', license: 'Εθνικό C' } },
  ];

  for (const c of coaches) {
    const ref = await addDoc(collection(db, USERS_COL), {
      ...c,
      groupId: groupIds['Προπονητής'],
      venueId: VENUE_ID,
      assigned_squads: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    userIds[c.displayName] = ref.id;
    console.log(`  🏆 ${c.displayName} → ${ref.id}`);
  }

  // Assign coaches to squads
  const coachAssignments = [
    { coach: 'Νίκος Παπαδόπουλος', squads: ['Λιοντάρια U12', 'Τίγρεις U14'] },
    { coach: 'Γιάννης Αντωνίου', squads: ['Αετοί U10', 'Ακαδημία Juniors'] },
    { coach: 'Μαρία Κωνσταντίνου', squads: ['Πάνθηρες U16'] },
    { coach: 'Δημήτρης Βασιλείου', squads: ['Λιοντάρια U12', 'Πάνθηρες U16'] },
  ];

  for (const assignment of coachAssignments) {
    const coachId = userIds[assignment.coach];
    for (const squadName of assignment.squads) {
      const squadId = squadIds[squadName];
      await updateDoc(doc(db, SQUADS_COL, squadId), { coachIds: arrayUnion(coachId) });
      await updateDoc(doc(db, USERS_COL, coachId), { assigned_squads: arrayUnion(squadId) });
    }
  }
  console.log('  ✅ Coach-squad assignments done');

  // --- Parents ---
  const parents = [
    { displayName: 'Ελένη Γεωργίου', fields: { email: 'eleni.g@gmail.com', phone: '6981112233', address: 'Λεωφ. Αλεξάνδρας 45, Αθήνα 11473' } },
    { displayName: 'Κώστας Δημητρίου', fields: { email: 'kostas.d@gmail.com', phone: '6982223344', address: 'Ηρώων Πολυτεχνείου 12, Πειραιάς 18536' } },
    { displayName: 'Σοφία Νικολάου', fields: { email: 'sofia.n@yahoo.gr', phone: '6983334455', address: 'Εθνικής Αντιστάσεως 78, Θεσσαλονίκη 54621' } },
    { displayName: 'Αλέξανδρος Ιωάννου', fields: { email: 'alex.i@hotmail.com', phone: '6984445566', address: 'Κηφισίας 102, Μαρούσι 15125' } },
    { displayName: 'Μαρίνα Χρήστου', fields: { email: 'marina.x@gmail.com', phone: '6985556677', address: 'Βασ. Σοφίας 23, Αθήνα 10674' } },
    { displayName: 'Παναγιώτης Λάμπρου', fields: { email: 'panos.l@gmail.com', phone: '6986667788', address: 'Ερμού 56, Γλυφάδα 16675' } },
  ];

  for (const p of parents) {
    const ref = await addDoc(collection(db, USERS_COL), {
      ...p,
      groupId: groupIds['Γονέας'],
      venueId: VENUE_ID,
      linked_athletes: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    userIds[p.displayName] = ref.id;
    console.log(`  👨‍👩‍👧 ${p.displayName} → ${ref.id}`);
  }

  // --- Athletes ---
  const athletes = [
    { displayName: 'Στέφανος Γεωργίου', fields: { birth_year: 2014 }, squad: 'Αετοί U10', parent: 'Ελένη Γεωργίου' },
    { displayName: 'Αλίκη Γεωργίου', fields: { birth_year: 2012 }, squad: 'Λιοντάρια U12', parent: 'Ελένη Γεωργίου' },
    { displayName: 'Μιχάλης Δημητρίου', fields: { birth_year: 2012 }, squad: 'Λιοντάρια U12', parent: 'Κώστας Δημητρίου' },
    { displayName: 'Θάνος Δημητρίου', fields: { birth_year: 2010 }, squad: 'Τίγρεις U14', parent: 'Κώστας Δημητρίου' },
    { displayName: 'Χριστίνα Νικολάου', fields: { birth_year: 2010 }, squad: 'Τίγρεις U14', parent: 'Σοφία Νικολάου' },
    { displayName: 'Γιώργος Ιωάννου', fields: { birth_year: 2008 }, squad: 'Πάνθηρες U16', parent: 'Αλέξανδρος Ιωάννου' },
    { displayName: 'Κατερίνα Ιωάννου', fields: { birth_year: 2016 }, squad: 'Ακαδημία Juniors', parent: 'Αλέξανδρος Ιωάννου' },
    { displayName: 'Νικόλας Χρήστου', fields: { birth_year: 2014 }, squad: 'Αετοί U10', parent: 'Μαρίνα Χρήστου' },
    { displayName: 'Ελισάβετ Χρήστου', fields: { birth_year: 2012 }, squad: 'Λιοντάρια U12', parent: 'Μαρίνα Χρήστου' },
    { displayName: 'Παύλος Λάμπρου', fields: { birth_year: 2008 }, squad: 'Πάνθηρες U16', parent: 'Παναγιώτης Λάμπρου' },
    { displayName: 'Αντώνης Λάμπρου', fields: { birth_year: 2010 }, squad: 'Τίγρεις U14', parent: 'Παναγιώτης Λάμπρου' },
    { displayName: 'Δημήτρης Μαυρίδης', fields: { birth_year: 2016 }, squad: 'Ακαδημία Juniors', parent: null },
    { displayName: 'Αγγελική Σωτηρίου', fields: { birth_year: 2014 }, squad: 'Αετοί U10', parent: null },
    { displayName: 'Λεωνίδας Καραγιάννης', fields: { birth_year: 2012 }, squad: 'Λιοντάρια U12', parent: null },
    { displayName: 'Ιωάννα Παπαγεωργίου', fields: { birth_year: 2008 }, squad: 'Πάνθηρες U16', parent: null },
  ];

  for (const a of athletes) {
    const parentId = a.parent ? userIds[a.parent] : '';
    const ref = await addDoc(collection(db, USERS_COL), {
      displayName: a.displayName,
      groupId: groupIds['Αθλητής'],
      venueId: VENUE_ID,
      fields: a.fields,
      squad_id: squadIds[a.squad],
      parent_uid: parentId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    userIds[a.displayName] = ref.id;
    console.log(`  ⚽ ${a.displayName} (${a.squad}) → ${ref.id}`);

    // Link to parent
    if (parentId) {
      await updateDoc(doc(db, USERS_COL, parentId), {
        linked_athletes: arrayUnion(ref.id),
      });
    }
  }
  console.log('  ✅ Parent-athlete links done');

  // --- Admins ---
  const admins = [
    { displayName: 'Αντώνης Μακρής', fields: { email: 'admin@academy.gr', phone: '6991234567' } },
  ];

  for (const a of admins) {
    const ref = await addDoc(collection(db, USERS_COL), {
      ...a,
      groupId: groupIds['Διαχειριστής'],
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`  👤 ${a.displayName} → ${ref.id}`);
  }

  // --- Physiotherapist (custom group) ---
  const physios = [
    { displayName: 'Ανδρέας Τσιμπίδης', fields: { email: 'andreas.t@physio.gr', phone: '6996789012', specialty: 'Αθλητική Φυσιοθεραπεία', amka: '12345678901' } },
  ];

  for (const p of physios) {
    const ref = await addDoc(collection(db, USERS_COL), {
      ...p,
      groupId: groupIds['Φυσιοθεραπευτής'],
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`  🩺 ${p.displayName} → ${ref.id}`);
  }

  return userIds;
}

// ============================================
// Main
// ============================================
async function main() {
  console.log('🌱 Academy Seed Script');
  console.log('='.repeat(50));
  console.log(`Venue ID: ${VENUE_ID}`);
  console.log(`Email: ${EMAIL}`);

  // Authenticate first
  console.log('\n🔐 Signing in...');
  await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  console.log('  ✅ Authenticated successfully');

  const groupIds = await seedGroups();
  const squadIds = await seedSquads();
  await seedUsers(groupIds, squadIds);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed complete!');
  console.log(`  - ${Object.keys(groupIds).length} user groups`);
  console.log(`  - ${Object.keys(squadIds).length} squads`);
  console.log('  - 15 athletes, 6 parents, 4 coaches, 1 admin, 1 physio');
  console.log('\nRefresh your app to see the data.');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
