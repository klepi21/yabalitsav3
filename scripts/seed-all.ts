/**
 * Comprehensive Seed Script — all yabalitsa_ collections EXCEPT venues & venueOwners
 *
 * Usage:
 *   npx tsx scripts/seed-all.ts <email> <password>
 *   npx tsx scripts/seed-all.ts <email> <password> --only pitches,customers
 *
 * Available modules: pitches, customers, bookings, blockedDates, academy, tournaments
 * ("academy" seeds user_groups, squads, and academy_users together)
 *
 * The venueId is automatically resolved from the venueOwner document matching the email.
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
  Timestamp,
} from 'firebase/firestore';

// ── Firebase config ──────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyC7PBURPBpNcygoD2hBjOn7tfOcMlAWcBI',
  authDomain: 'yabalitsa-6f5e8.firebaseapp.com',
  projectId: 'yabalitsa-6f5e8',
  storageBucket: 'yabalitsa-6f5e8.firebasestorage.app',
  messagingSenderId: '84906829213',
  appId: '1:84906829213:web:fd6f9a0dac07d2ac907b74',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── CLI args ─────────────────────────────────────────────
const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error('❌ Usage: npx tsx scripts/seed-all.ts <email> <password> [--only modules]');
  console.error('   Example: npx tsx scripts/seed-all.ts admin@academy.gr mypassword');
  console.error('   Modules: pitches, customers, bookings, blockedDates, academy');
  process.exit(1);
}

let VENUE_ID = '';

const onlyIdx = process.argv.indexOf('--only');
const onlyModules = onlyIdx !== -1 ? process.argv[onlyIdx + 1]?.split(',') : null;

function shouldSeed(module: string) {
  return !onlyModules || onlyModules.includes(module);
}

// ── Collection names ─────────────────────────────────────
const COL = {
  pitches: 'yabalitsa_pitches',
  customers: 'yabalitsa_customers',
  bookings: 'yabalitsa_bookings',
  blockedDates: 'yabalitsa_blockedDates',
  timeSlots: 'yabalitsa_timeSlots',
  groups: 'yabalitsa_user_groups',
  users: 'yabalitsa_academy_users',
  squads: 'yabalitsa_squads',
};

// ── Helpers ──────────────────────────────────────────────
async function clearCollection(colName: string) {
  const q = query(collection(db, colName), where('venueId', '==', VENUE_ID));
  const snap = await getDocs(q);
  if (snap.size === 0) return;
  console.log(`  🗑️  Deleting ${snap.size} docs from ${colName}...`);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, colName, d.id));
  }
}

function futureDate(daysFromNow: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return Timestamp.fromDate(d);
}

function pastDate(daysAgo: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

function todayAt(hour: number, minute = 0): Timestamp {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return Timestamp.fromDate(d);
}

function dateAt(daysOffset: number, hour: number, minute = 0): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return Timestamp.fromDate(d);
}

// ══════════════════════════════════════════════════════════
// 1. PITCHES
// ══════════════════════════════════════════════════════════
async function seedPitches() {
  console.log('\n⚽ Seeding Pitches...');
  await clearCollection(COL.pitches);

  const defaultHours = (isOpen: boolean) => ({
    isOpen,
    slots: isOpen
      ? [{ start: '09:00', end: '14:00' }, { start: '17:00', end: '23:00' }]
      : [],
  });

  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const weekend = ['saturday', 'sunday'];

  const makeHours = () => {
    const hours: Record<string, { isOpen: boolean; slots: { start: string; end: string }[] }> = {};
    for (const day of weekdays) hours[day] = defaultHours(true);
    for (const day of weekend) hours[day] = { isOpen: true, slots: [{ start: '08:00', end: '23:00' }] };
    return hours;
  };

  const pitches = [
    { name: 'Γήπεδο Α', type: '5x5', slotDuration: 60, pricePerSlot: 80 },
    { name: 'Γήπεδο Β', type: '5x5', slotDuration: 60, pricePerSlot: 80 },
    { name: 'Γήπεδο Κεντρικό', type: '7x7', slotDuration: 90, pricePerSlot: 120 },
    { name: 'Γήπεδο Ακαδημίας', type: '8x8', slotDuration: 90, pricePerSlot: 100 },
  ];

  const pitchIds: Record<string, string> = {};
  for (const p of pitches) {
    const ref = await addDoc(collection(db, COL.pitches), {
      ...p,
      venueId: VENUE_ID,
      defaultOpeningHours: makeHours(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    pitchIds[p.name] = ref.id;
    console.log(`  ✅ ${p.name} (${p.type}) → ${ref.id}`);
  }
  return pitchIds;
}

// ══════════════════════════════════════════════════════════
// 2. CUSTOMERS
// ══════════════════════════════════════════════════════════
async function seedCustomers() {
  console.log('\n👤 Seeding Customers...');
  await clearCollection(COL.customers);

  const customers = [
    { name: 'Γιώργος Παπαδόπουλος', email: 'giorgos.p@gmail.com', phone: '6971001001' },
    { name: 'Νίκος Αθανασίου', email: 'nikos.a@gmail.com', phone: '6971001002' },
    { name: 'Δημήτρης Καραγιάννης', email: 'dimitris.k@yahoo.gr', phone: '6971001003' },
    { name: 'Κώστας Μαυρίδης', email: 'kostas.m@hotmail.com', phone: '6971001004' },
    { name: 'Αλέξανδρος Νικολάου', email: 'alex.n@gmail.com', phone: '6971001005' },
    { name: 'Σταύρος Βασιλείου', email: 'stavros.v@gmail.com', phone: '6971001006' },
    { name: 'Θανάσης Ιωάννου', email: 'thanasis.i@outlook.com', phone: '6971001007' },
    { name: 'Μιχάλης Χρήστου', email: 'michalis.x@gmail.com', phone: '6971001008' },
    { name: 'Παναγιώτης Λάμπρου', email: 'panos.l@yahoo.gr', phone: '6971001009' },
    { name: 'Βασίλης Δημητρίου', email: 'vasilis.d@gmail.com', phone: '6971001010' },
    { name: 'Αντώνης Γεωργίου', email: 'antonis.g@gmail.com', phone: '6971001011' },
    { name: 'Χρήστος Κωνσταντίνου', email: 'christos.k@hotmail.com', phone: '6971001012' },
    { name: 'Μάριος Σωτηρίου', email: 'marios.s@gmail.com', phone: '6971001013' },
    { name: 'Ηλίας Παπαγεωργίου', email: 'ilias.p@gmail.com', phone: '6971001014' },
    { name: 'Λευτέρης Αντωνίου', email: 'lefteris.a@yahoo.gr', phone: '6971001015' },
  ];

  const customerIds: Record<string, string> = {};
  for (const c of customers) {
    const ref = await addDoc(collection(db, COL.customers), {
      ...c,
      venueIds: [VENUE_ID],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    customerIds[c.name] = ref.id;
    console.log(`  ✅ ${c.name} → ${ref.id}`);
  }
  return customerIds;
}

// ══════════════════════════════════════════════════════════
// 3. BOOKINGS
// ══════════════════════════════════════════════════════════
async function seedBookings(pitchIds: Record<string, string>, customerIds: Record<string, string>) {
  console.log('\n📅 Seeding Bookings...');
  await clearCollection(COL.bookings);

  const pitchNames = Object.keys(pitchIds);
  const customerNames = Object.keys(customerIds);

  // Helper to get customer data
  const customerData = [
    { name: 'Γιώργος Παπαδόπουλος', email: 'giorgos.p@gmail.com', phone: '6971001001' },
    { name: 'Νίκος Αθανασίου', email: 'nikos.a@gmail.com', phone: '6971001002' },
    { name: 'Δημήτρης Καραγιάννης', email: 'dimitris.k@yahoo.gr', phone: '6971001003' },
    { name: 'Κώστας Μαυρίδης', email: 'kostas.m@hotmail.com', phone: '6971001004' },
    { name: 'Αλέξανδρος Νικολάου', email: 'alex.n@gmail.com', phone: '6971001005' },
    { name: 'Σταύρος Βασιλείου', email: 'stavros.v@gmail.com', phone: '6971001006' },
    { name: 'Θανάσης Ιωάννου', email: 'thanasis.i@outlook.com', phone: '6971001007' },
    { name: 'Μιχάλης Χρήστου', email: 'michalis.x@gmail.com', phone: '6971001008' },
    { name: 'Παναγιώτης Λάμπρου', email: 'panos.l@yahoo.gr', phone: '6971001009' },
    { name: 'Βασίλης Δημητρίου', email: 'vasilis.d@gmail.com', phone: '6971001010' },
    { name: 'Αντώνης Γεωργίου', email: 'antonis.g@gmail.com', phone: '6971001011' },
    { name: 'Χρήστος Κωνσταντίνου', email: 'christos.k@hotmail.com', phone: '6971001012' },
    { name: 'Μάριος Σωτηρίου', email: 'marios.s@gmail.com', phone: '6971001013' },
    { name: 'Ηλίας Παπαγεωργίου', email: 'ilias.p@gmail.com', phone: '6971001014' },
    { name: 'Λευτέρης Αντωνίου', email: 'lefteris.a@yahoo.gr', phone: '6971001015' },
  ];

  const bookings: {
    pitchName: string;
    customerIdx: number;
    dayOffset: number;
    hour: number;
    duration: number;
    price: number;
    status: string;
    notes?: string;
  }[] = [
    // Past bookings (completed)
    { pitchName: pitchNames[0], customerIdx: 0, dayOffset: -7, hour: 18, duration: 60, price: 80, status: 'completed' },
    { pitchName: pitchNames[0], customerIdx: 1, dayOffset: -7, hour: 19, duration: 60, price: 80, status: 'completed' },
    { pitchName: pitchNames[1], customerIdx: 2, dayOffset: -6, hour: 20, duration: 60, price: 80, status: 'completed' },
    { pitchName: pitchNames[2], customerIdx: 3, dayOffset: -5, hour: 17, duration: 90, price: 120, status: 'completed' },
    { pitchName: pitchNames[0], customerIdx: 4, dayOffset: -4, hour: 21, duration: 60, price: 80, status: 'completed' },
    { pitchName: pitchNames[1], customerIdx: 5, dayOffset: -3, hour: 18, duration: 60, price: 80, status: 'completed' },
    { pitchName: pitchNames[2], customerIdx: 6, dayOffset: -3, hour: 19, duration: 90, price: 120, status: 'completed' },
    { pitchName: pitchNames[3], customerIdx: 7, dayOffset: -2, hour: 10, duration: 90, price: 100, status: 'completed' },
    { pitchName: pitchNames[0], customerIdx: 8, dayOffset: -1, hour: 20, duration: 60, price: 80, status: 'completed' },
    { pitchName: pitchNames[1], customerIdx: 9, dayOffset: -1, hour: 21, duration: 60, price: 80, status: 'completed' },
    // Cancelled
    { pitchName: pitchNames[0], customerIdx: 10, dayOffset: -2, hour: 18, duration: 60, price: 80, status: 'cancelled', notes: 'Ακυρώθηκε λόγω βροχής' },
    { pitchName: pitchNames[2], customerIdx: 11, dayOffset: -1, hour: 17, duration: 90, price: 120, status: 'cancelled' },
    // Today's bookings
    { pitchName: pitchNames[0], customerIdx: 0, dayOffset: 0, hour: 18, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[0], customerIdx: 2, dayOffset: 0, hour: 19, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[1], customerIdx: 4, dayOffset: 0, hour: 20, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[2], customerIdx: 6, dayOffset: 0, hour: 17, duration: 90, price: 120, status: 'confirmed' },
    { pitchName: pitchNames[3], customerIdx: 8, dayOffset: 0, hour: 9, duration: 90, price: 100, status: 'confirmed', notes: 'Προπόνηση ακαδημίας' },
    // Future bookings
    { pitchName: pitchNames[0], customerIdx: 1, dayOffset: 1, hour: 18, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[0], customerIdx: 3, dayOffset: 1, hour: 19, duration: 60, price: 80, status: 'pending' },
    { pitchName: pitchNames[1], customerIdx: 5, dayOffset: 1, hour: 20, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[2], customerIdx: 7, dayOffset: 2, hour: 17, duration: 90, price: 120, status: 'confirmed' },
    { pitchName: pitchNames[0], customerIdx: 9, dayOffset: 2, hour: 21, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[1], customerIdx: 11, dayOffset: 3, hour: 18, duration: 60, price: 80, status: 'pending' },
    { pitchName: pitchNames[3], customerIdx: 12, dayOffset: 3, hour: 10, duration: 90, price: 100, status: 'confirmed', notes: 'Τουρνουά Σαββατοκύριακου' },
    { pitchName: pitchNames[0], customerIdx: 13, dayOffset: 4, hour: 19, duration: 60, price: 80, status: 'confirmed' },
    { pitchName: pitchNames[2], customerIdx: 14, dayOffset: 5, hour: 20, duration: 90, price: 120, status: 'pending' },
    // Recurring-style weekly bookings (same customers, same time next week)
    { pitchName: pitchNames[0], customerIdx: 0, dayOffset: 7, hour: 18, duration: 60, price: 80, status: 'confirmed', notes: 'Εβδομαδιαία κράτηση' },
    { pitchName: pitchNames[1], customerIdx: 5, dayOffset: 8, hour: 20, duration: 60, price: 80, status: 'confirmed', notes: 'Εβδομαδιαία κράτηση' },
    { pitchName: pitchNames[2], customerIdx: 7, dayOffset: 9, hour: 17, duration: 90, price: 120, status: 'confirmed', notes: 'Εβδομαδιαία κράτηση' },
  ];

  let count = 0;
  for (const b of bookings) {
    const cust = customerData[b.customerIdx];
    const pitchId = pitchIds[b.pitchName];
    const ref = await addDoc(collection(db, COL.bookings), {
      slotId: '',
      pitchId,
      venueId: VENUE_ID,
      userId: customerIds[customerNames[b.customerIdx]],
      userName: cust.name,
      userEmail: cust.email,
      userPhone: cust.phone,
      startTime: dateAt(b.dayOffset, b.hour),
      endTime: dateAt(b.dayOffset, b.hour + (b.duration / 60)),
      price: b.price,
      status: b.status,
      ...(b.notes ? { notes: b.notes } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    count++;
  }
  console.log(`  ✅ Created ${count} bookings (past, today, future)`);
}

// ══════════════════════════════════════════════════════════
// 4. BLOCKED DATES
// ══════════════════════════════════════════════════════════
async function seedBlockedDates(pitchIds: Record<string, string>) {
  console.log('\n🚫 Seeding Blocked Dates...');
  await clearCollection(COL.blockedDates);

  const pitchNames = Object.keys(pitchIds);

  const blocked = [
    {
      pitchId: pitchIds[pitchNames[0]],
      startDate: futureDate(10),
      endDate: futureDate(10),
      reason: 'Συντήρηση χλοοτάπητα',
      isFullDay: true,
    },
    {
      pitchId: pitchIds[pitchNames[1]],
      startDate: futureDate(14),
      endDate: futureDate(15),
      reason: 'Ιδιωτικό τουρνουά',
      isFullDay: true,
    },
    {
      pitchId: pitchIds[pitchNames[2]],
      startDate: dateAt(7, 9),
      endDate: dateAt(7, 14),
      reason: 'Ακαδημίες πρωινό πρόγραμμα',
      isFullDay: false,
    },
    {
      pitchId: pitchIds[pitchNames[3]],
      startDate: futureDate(20),
      endDate: futureDate(22),
      reason: 'Εργασίες φωτισμού',
      isFullDay: true,
    },
  ];

  for (const b of blocked) {
    await addDoc(collection(db, COL.blockedDates), {
      ...b,
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  console.log(`  ✅ Created ${blocked.length} blocked dates`);
}

// ══════════════════════════════════════════════════════════
// 6. ACADEMY (User Groups + Squads + Academy Users)
// ══════════════════════════════════════════════════════════
async function seedAcademy() {
  console.log('\n🎓 Seeding Academy...');

  // --- User Groups ---
  console.log('  📋 User Groups...');
  await clearCollection(COL.groups);

  const groups = [
    {
      name: 'Αθλητής', namePlural: 'Αθλητές', icon: '⚽', color: 'green',
      isDefault: true, order: 1, capabilities: ['squad_assignment', 'parent_linking'],
      fields: [
        { key: 'birth_year', label: 'Έτος Γέννησης', type: 'number', required: true, placeholder: 'π.χ. 2012' },
        { key: 'medical_cert_expiry', label: 'Λήξη Ιατρικού Πιστοποιητικού', type: 'date', required: false },
      ],
    },
    {
      name: 'Γονέας', namePlural: 'Γονείς', icon: '👨‍👩‍👧', color: 'amber',
      isDefault: true, order: 2, capabilities: [],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'goneas@email.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
        { key: 'address', label: 'Διεύθυνση', type: 'textarea', required: true, placeholder: 'Πλήρης διεύθυνση' },
      ],
    },
    {
      name: 'Προπονητής', namePlural: 'Προπονητές', icon: '🏆', color: 'blue',
      isDefault: true, order: 3, capabilities: ['coach_squads'],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'coach@academy.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
        { key: 'specialization', label: 'Ειδικότητα', type: 'select', required: true, options: ['Αρχηγός Προπονητής', 'Βοηθός Προπονητής', 'Προπονητής Τερματοφύλακα', 'Γυμναστής', 'Τεχνικός Προπονητής', 'Προπονητής Ακαδημιών'] },
        { key: 'license', label: 'Δίπλωμα', type: 'select', required: true, options: ['Χωρίς Δίπλωμα', 'Εθνικό D', 'Εθνικό C', 'UEFA C', 'UEFA B', 'UEFA A', 'UEFA Pro'] },
      ],
    },
    {
      name: 'Διαχειριστής', namePlural: 'Διαχειριστές', icon: '👤', color: 'purple',
      isDefault: true, order: 4, capabilities: [],
      fields: [
        { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'admin@academy.gr' },
        { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
      ],
    },
    {
      name: 'Φυσιοθεραπευτής', namePlural: 'Φυσιοθεραπευτές', icon: '🩺', color: 'teal',
      isDefault: false, order: 5, capabilities: [],
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
    const ref = await addDoc(collection(db, COL.groups), {
      ...g,
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    groupIds[g.name] = ref.id;
    console.log(`    ${g.icon} ${g.name} → ${ref.id}`);
  }

  // --- Squads ---
  console.log('  ⚽ Squads...');
  await clearCollection(COL.squads);

  const squads = [
    { name: 'Αετοί U10', ageGroup: 'U10' },
    { name: 'Λιοντάρια U12', ageGroup: 'U12' },
    { name: 'Τίγρεις U14', ageGroup: 'U14' },
    { name: 'Πάνθηρες U16', ageGroup: 'U16' },
    { name: 'Ακαδημία Juniors', ageGroup: 'U8' },
  ];

  const squadIds: Record<string, string> = {};
  for (const s of squads) {
    const ref = await addDoc(collection(db, COL.squads), {
      ...s,
      coachIds: [],
      venueId: VENUE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    squadIds[s.name] = ref.id;
    console.log(`    🏟️ ${s.name} (${s.ageGroup}) → ${ref.id}`);
  }

  // --- Academy Users ---
  console.log('  👥 Academy Users...');
  await clearCollection(COL.users);
  const userIds: Record<string, string> = {};

  // Coaches
  const coaches = [
    { displayName: 'Νίκος Παπαδόπουλος', fields: { email: 'nikos.p@academy.gr', phone: '6971234567', specialization: 'Αρχηγός Προπονητής', license: 'UEFA A' } },
    { displayName: 'Γιάννης Αντωνίου', fields: { email: 'giannis.a@academy.gr', phone: '6972345678', specialization: 'Βοηθός Προπονητής', license: 'UEFA B' } },
    { displayName: 'Μαρία Κωνσταντίνου', fields: { email: 'maria.k@academy.gr', phone: '6973456789', specialization: 'Προπονητής Τερματοφύλακα', license: 'UEFA C' } },
    { displayName: 'Δημήτρης Βασιλείου', fields: { email: 'dimitris.v@academy.gr', phone: '6974567890', specialization: 'Γυμναστής', license: 'Εθνικό C' } },
  ];

  for (const c of coaches) {
    const ref = await addDoc(collection(db, COL.users), {
      ...c, groupId: groupIds['Προπονητής'], venueId: VENUE_ID,
      assigned_squads: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    userIds[c.displayName] = ref.id;
    console.log(`    🏆 ${c.displayName} → ${ref.id}`);
  }

  // Coach → Squad assignments
  const coachAssignments = [
    { coach: 'Νίκος Παπαδόπουλος', squads: ['Λιοντάρια U12', 'Τίγρεις U14'] },
    { coach: 'Γιάννης Αντωνίου', squads: ['Αετοί U10', 'Ακαδημία Juniors'] },
    { coach: 'Μαρία Κωνσταντίνου', squads: ['Πάνθηρες U16'] },
    { coach: 'Δημήτρης Βασιλείου', squads: ['Λιοντάρια U12', 'Πάνθηρες U16'] },
  ];

  for (const a of coachAssignments) {
    const coachId = userIds[a.coach];
    for (const sName of a.squads) {
      await updateDoc(doc(db, COL.squads, squadIds[sName]), { coachIds: arrayUnion(coachId) });
      await updateDoc(doc(db, COL.users, coachId), { assigned_squads: arrayUnion(squadIds[sName]) });
    }
  }
  console.log('    ✅ Coach-squad assignments done');

  // Parents
  const parents = [
    { displayName: 'Ελένη Γεωργίου', fields: { email: 'eleni.g@gmail.com', phone: '6981112233', address: 'Λεωφ. Αλεξάνδρας 45, Αθήνα 11473' } },
    { displayName: 'Κώστας Δημητρίου', fields: { email: 'kostas.d@gmail.com', phone: '6982223344', address: 'Ηρώων Πολυτεχνείου 12, Πειραιάς 18536' } },
    { displayName: 'Σοφία Νικολάου', fields: { email: 'sofia.n@yahoo.gr', phone: '6983334455', address: 'Εθνικής Αντιστάσεως 78, Θεσσαλονίκη 54621' } },
    { displayName: 'Αλέξανδρος Ιωάννου', fields: { email: 'alex.i@hotmail.com', phone: '6984445566', address: 'Κηφισίας 102, Μαρούσι 15125' } },
    { displayName: 'Μαρίνα Χρήστου', fields: { email: 'marina.x@gmail.com', phone: '6985556677', address: 'Βασ. Σοφίας 23, Αθήνα 10674' } },
    { displayName: 'Παναγιώτης Λάμπρου', fields: { email: 'panos.l@gmail.com', phone: '6986667788', address: 'Ερμού 56, Γλυφάδα 16675' } },
  ];

  for (const p of parents) {
    const ref = await addDoc(collection(db, COL.users), {
      ...p, groupId: groupIds['Γονέας'], venueId: VENUE_ID,
      linked_athletes: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    userIds[p.displayName] = ref.id;
    console.log(`    👨‍👩‍👧 ${p.displayName} → ${ref.id}`);
  }

  // Athletes
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
    const ref = await addDoc(collection(db, COL.users), {
      displayName: a.displayName, groupId: groupIds['Αθλητής'], venueId: VENUE_ID,
      fields: a.fields, squad_id: squadIds[a.squad], parent_uid: parentId,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    userIds[a.displayName] = ref.id;
    console.log(`    ⚽ ${a.displayName} (${a.squad})`);
    if (parentId) {
      await updateDoc(doc(db, COL.users, parentId), { linked_athletes: arrayUnion(ref.id) });
    }
  }
  console.log('    ✅ Parent-athlete links done');

  // Admins
  const ref1 = await addDoc(collection(db, COL.users), {
    displayName: 'Αντώνης Μακρής', groupId: groupIds['Διαχειριστής'], venueId: VENUE_ID,
    fields: { email: 'admin@academy.gr', phone: '6991234567' },
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  console.log(`    👤 Αντώνης Μακρής → ${ref1.id}`);

  // Physiotherapist
  const ref2 = await addDoc(collection(db, COL.users), {
    displayName: 'Ανδρέας Τσιμπίδης', groupId: groupIds['Φυσιοθεραπευτής'], venueId: VENUE_ID,
    fields: { email: 'andreas.t@physio.gr', phone: '6996789012', specialty: 'Αθλητική Φυσιοθεραπεία', amka: '12345678901' },
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  console.log(`    🩺 Ανδρέας Τσιμπίδης → ${ref2.id}`);
}

// ══════════════════════════════════════════════════════════
// 7. TOURNAMENTS
// ══════════════════════════════════════════════════════════
async function seedTournamentsModule() {
  console.log('\n🏆 Seeding Tournaments...');

  const TCOL = {
    tournaments: 'yabalitsa_tournaments',
    teams: 'yabalitsa_tournament_teams',
    players: 'yabalitsa_tournament_players',
    matches: 'yabalitsa_tournament_matches',
  };

  for (const colName of [TCOL.matches, TCOL.players, TCOL.teams, TCOL.tournaments]) {
    const q = query(collection(db, colName), where('venueId', '==', VENUE_ID));
    const snap = await getDocs(q);
    if (snap.size > 0) {
      console.log(`  🗑️  Deleting ${snap.size} docs from ${colName}...`);
      for (const d of snap.docs) await deleteDoc(doc(db, colName, d.id));
    }
  }

  let pitchId: string | null = null;
  const pitchQuery = query(collection(db, COL.pitches), where('venueId', '==', VENUE_ID));
  const pitchSnap = await getDocs(pitchQuery);
  if (!pitchSnap.empty) {
    pitchId = pitchSnap.docs[0].id;
    console.log(`  📍 Using pitch: ${pitchSnap.docs[0].data().name}`);
  }

  const TEAM_NAMES = ['Olympus FC', 'Αετοί Αθηνών', 'Spartans', 'Thunderbolts', 'Phoenix FC', 'Κεραυνός', 'Titans United', 'Ατρόμητοι'];
  const PLAYER_NAMES = [
    ['Γιάννης Παπαδόπουλος', 'Νίκος Αλεξίου', 'Κώστας Μαρίνος', 'Δημήτρης Κωνσταντίνου', 'Αλέξης Νικολάου', 'Μάριος Γεωργίου', 'Στέφανος Αντωνίου'],
    ['Ανδρέας Βασιλείου', 'Παναγιώτης Χρήστου', 'Θοδωρής Δημητρίου', 'Λευτέρης Ιωάννου', 'Σπύρος Πέτρου', 'Μανώλης Σταματίου', 'Γρηγόρης Αθανασίου'],
    ['Βαγγέλης Καραγιάννης', 'Χρήστος Μπακογιάννης', 'Αντώνης Λαμπρόπουλος', 'Πέτρος Σωτηρίου', 'Μιχάλης Αναγνώστου', 'Γιώργος Τριανταφύλλου', 'Τάσος Παπανικολάου'],
    ['Κυριάκος Μητσοτάκης', 'Αχιλλέας Τσιμπίδης', 'Φίλιππος Μαντζούκας', 'Ευθύμης Κοντοπίδης', 'Πάνος Ρεμούνδος', 'Σάκης Αρβανίτης', 'Νεκτάριος Φωτίου'],
    ['Ηλίας Σταυρόπουλος', 'Δημοσθένης Κούρτης', 'Αριστείδης Μαυρίδης', 'Κωνσταντίνος Μπέκος', 'Θανάσης Πολίτης', 'Βασίλης Κουτσούρας', 'Λάζαρος Χατζηγεωργίου'],
    ['Ορέστης Δράκος', 'Αλέκος Ζαφειρίου', 'Στάθης Παπαθανασίου', 'Χάρης Μακρής', 'Γεράσιμος Καρατζάς', 'Δαμιανός Τζέλλας', 'Φώτης Αγγελόπουλος'],
    ['Κλεάνθης Ράπτης', 'Αιμίλιος Κρητικός', 'Πρόδρομος Γαλάνης', 'Σωκράτης Λιάκος', 'Ανέστης Μπουρνάζος', 'Ξενοφών Μανωλάκος', 'Θεόφιλος Σιδέρης'],
    ['Αγαμέμνων Τσακίρης', 'Αργύρης Ντόβας', 'Πολυχρόνης Φραγκούλης', 'Ευκλείδης Μπαλτάς', 'Χαρίλαος Ρούσσος', 'Τηλέμαχος Κανελλόπουλος', 'Μενέλαος Σκουλάς'],
  ];
  const POSITIONS: string[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];

  const tournamentRef = await addDoc(collection(db, TCOL.tournaments), {
    venueId: VENUE_ID, name: 'Ανοιξιάτικο Πρωτάθλημα 2026',
    description: 'Το μεγάλο ανοιξιάτικο πρωτάθλημα 5x5 με 8 ομάδες.',
    type: 'league', pitchType: '5x5', pitchId, status: 'active',
    startDate: Timestamp.fromDate(new Date('2026-03-16')),
    endDate: Timestamp.fromDate(new Date('2026-06-15')),
    maxTeams: 8, matchDuration: 60, legs: 1,
    rules: 'Κανονισμοί FIFA 5x5.',
    prizeDescription: 'Κύπελλο + 500€ στον πρωταθλητή',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  const tournamentId = tournamentRef.id;
  console.log(`  ✅ Tournament → ${tournamentId}`);

  const teamIds: string[] = [];
  for (let i = 0; i < TEAM_NAMES.length; i++) {
    const played = Math.floor(Math.random() * 5) + 2;
    const won = Math.floor(Math.random() * (played + 1));
    const remaining = played - won;
    const drawn = Math.floor(Math.random() * (remaining + 1));
    const lost = remaining - drawn;
    const points = won * 3 + drawn;

    const teamRef = await addDoc(collection(db, TCOL.teams), {
      tournamentId, venueId: VENUE_ID, name: TEAM_NAMES[i],
      captainName: PLAYER_NAMES[i][0], captainPhone: `69${Math.floor(10000000 + Math.random() * 90000000)}`,
      captainEmail: `captain${i + 1}@example.com`, status: 'confirmed',
      stats: { played, won, drawn, lost, goalsFor: won * 3 + drawn + Math.floor(Math.random() * 4), goalsAgainst: lost * 2 + drawn + Math.floor(Math.random() * 3), points },
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    teamIds.push(teamRef.id);
    console.log(`    ⚽ ${TEAM_NAMES[i]} (${points}pts)`);
  }

  const playerIdsByTeam: string[][] = [];
  let totalPlayers = 0;
  for (let t = 0; t < 8; t++) {
    const ids: string[] = [];
    for (let p = 0; p < 7; p++) {
      const ref = await addDoc(collection(db, TCOL.players), {
        teamId: teamIds[t], tournamentId, venueId: VENUE_ID,
        name: PLAYER_NAMES[t][p], phone: `69${Math.floor(10000000 + Math.random() * 90000000)}`,
        shirtNumber: p === 0 ? 1 : (p + 1) * 2 + Math.floor(Math.random() * 3),
        position: POSITIONS[p], isCaptain: p === 0,
        stats: { goals: Math.floor(Math.random() * 6), assists: Math.floor(Math.random() * 4), yellowCards: Math.floor(Math.random() * 3), redCards: Math.random() > 0.85 ? 1 : 0 },
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      ids.push(ref.id);
      totalPlayers++;
    }
    playerIdsByTeam.push(ids);
  }
  console.log(`  ✅ Created ${totalPlayers} players`);

  const teamsCopy = [...Array(8).keys()];
  let matchCount = 0;
  let roundNum = 1;
  for (let r = 0; r < 7; r++) {
    for (let i = 0; i < 4; i++) {
      const homeIdx = teamsCopy[i];
      const awayIdx = teamsCopy[7 - i];
      const matchDate = new Date('2026-03-16');
      matchDate.setDate(matchDate.getDate() + r * 5 + i);
      const hour = 18 + (i % 3) * 2;
      const isCompleted = r < 3;
      const homeScore = isCompleted ? Math.floor(Math.random() * 5) : null;
      const awayScore = isCompleted ? Math.floor(Math.random() * 4) : null;

      const events: { minute: number; type: string; playerId: string; teamId: string }[] = [];
      if (isCompleted && homeScore !== null && awayScore !== null) {
        for (let g = 0; g < homeScore; g++) {
          events.push({ minute: Math.floor(Math.random() * 60) + 1, type: 'goal', playerId: playerIdsByTeam[homeIdx][Math.floor(Math.random() * 7)], teamId: teamIds[homeIdx] });
        }
        for (let g = 0; g < awayScore; g++) {
          events.push({ minute: Math.floor(Math.random() * 60) + 1, type: 'goal', playerId: playerIdsByTeam[awayIdx][Math.floor(Math.random() * 7)], teamId: teamIds[awayIdx] });
        }
      }

      await addDoc(collection(db, TCOL.matches), {
        tournamentId, venueId: VENUE_ID, pitchId, round: roundNum,
        roundLabel: `Αγωνιστική ${roundNum}`,
        homeTeamId: teamIds[homeIdx], awayTeamId: teamIds[awayIdx],
        scheduledDate: Timestamp.fromDate(matchDate), scheduledTime: `${hour}:00`,
        status: isCompleted ? 'completed' : 'scheduled',
        homeScore, awayScore, events,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      matchCount++;
    }
    roundNum++;
    const last = teamsCopy.pop()!;
    teamsCopy.splice(1, 0, last);
  }
  console.log(`  ✅ Created ${matchCount} matches (12 completed, 16 scheduled)`);
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
async function main() {
  console.log('🌱 Yabalitsa Full Seed Script');
  console.log('═'.repeat(50));
  console.log(`Email:    ${EMAIL}`);
  if (onlyModules) console.log(`Modules:  ${onlyModules.join(', ')}`);

  console.log('\n🔐 Signing in...');
  await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  console.log('  ✅ Authenticated');

  // Look up venueId from venueOwner document
  console.log('\n🔍 Looking up venue...');
  const ownerQuery = query(
    collection(db, 'yabalitsa_venueOwners'),
    where('email', '==', EMAIL),
  );
  const ownerSnap = await getDocs(ownerQuery);
  if (ownerSnap.empty) {
    console.error(`❌ No venueOwner found for email: ${EMAIL}`);
    process.exit(1);
  }
  const ownerData = ownerSnap.docs[0].data();
  VENUE_ID = ownerData.venueId;
  console.log(`  ✅ Found venue: ${VENUE_ID}`);

  let pitchIds: Record<string, string> = {};
  let customerIds: Record<string, string> = {};

  if (shouldSeed('pitches')) {
    pitchIds = await seedPitches();
  }

  if (shouldSeed('customers')) {
    customerIds = await seedCustomers();
  }

  if (shouldSeed('bookings')) {
    if (Object.keys(pitchIds).length === 0 || Object.keys(customerIds).length === 0) {
      console.log('\n⚠️  Bookings require pitches and customers. Seeding them first...');
      if (Object.keys(pitchIds).length === 0) pitchIds = await seedPitches();
      if (Object.keys(customerIds).length === 0) customerIds = await seedCustomers();
    }
    await seedBookings(pitchIds, customerIds);
  }

  if (shouldSeed('blockedDates')) {
    if (Object.keys(pitchIds).length === 0) {
      console.log('\n⚠️  Blocked dates require pitches. Seeding them first...');
      pitchIds = await seedPitches();
    }
    await seedBlockedDates(pitchIds);
  }

  if (shouldSeed('academy')) {
    await seedAcademy();
  }

  if (shouldSeed('tournaments')) {
    await seedTournamentsModule();
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Seed complete!');
  console.log('\nRefresh your app to see the data.');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
