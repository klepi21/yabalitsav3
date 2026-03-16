/**
 * Seed script for Tournament data
 * Run with: npx tsx scripts/seed-tournaments.ts <email> <password>
 *
 * Or via seed-all.ts:
 *   npx tsx scripts/seed-all.ts <email> <password> --only tournaments
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
  Timestamp,
} from 'firebase/firestore';

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

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error('❌ Usage: npx tsx scripts/seed-tournaments.ts <email> <password>');
  console.error('   Example: npx tsx scripts/seed-tournaments.ts admin@venue.gr mypassword');
  process.exit(1);
}

let VENUE_ID = '';

const COL = {
  tournaments: 'yabalitsa_tournaments',
  teams: 'yabalitsa_tournament_teams',
  players: 'yabalitsa_tournament_players',
  matches: 'yabalitsa_tournament_matches',
  pitches: 'yabalitsa_pitches',
};

// ── Helpers ──────────────────────────────────────────────
async function clearCollection(colName: string, field = 'venueId') {
  const q = query(collection(db, colName), where(field, '==', VENUE_ID));
  const snap = await getDocs(q);
  if (snap.size === 0) return;
  console.log(`  🗑️  Deleting ${snap.size} docs from ${colName}...`);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, colName, d.id));
  }
}

function randomPhone() {
  return `69${Math.floor(10000000 + Math.random() * 90000000)}`;
}

// ── Seed Data ────────────────────────────────────────────

const TEAM_NAMES = [
  'Olympus FC',
  'Αετοί Αθηνών',
  'Spartans',
  'Thunderbolts',
  'Phoenix FC',
  'Κεραυνός',
  'Titans United',
  'Ατρόμητοι',
];

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

const POSITIONS: ('GK' | 'DEF' | 'MID' | 'FWD')[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];

// ══════════════════════════════════════════════════════════
// Seed Tournament
// ══════════════════════════════════════════════════════════
export async function seedTournaments(venueId?: string) {
  if (venueId) VENUE_ID = venueId;

  console.log('\n🏆 Seeding Tournaments...');

  // Clear existing tournament data
  await clearCollection(COL.matches);
  await clearCollection(COL.players);
  await clearCollection(COL.teams);
  await clearCollection(COL.tournaments);

  // Find a pitch for the tournament (optional)
  let pitchId: string | null = null;
  const pitchQuery = query(collection(db, COL.pitches), where('venueId', '==', VENUE_ID));
  const pitchSnap = await getDocs(pitchQuery);
  if (!pitchSnap.empty) {
    pitchId = pitchSnap.docs[0].id;
    console.log(`  📍 Using pitch: ${pitchSnap.docs[0].data().name} (${pitchId})`);
  }

  // ─── 1. Create Tournament ─────────────────────────
  console.log('\n  📋 Creating tournament...');
  const tournamentRef = await addDoc(collection(db, COL.tournaments), {
    venueId: VENUE_ID,
    name: 'Ανοιξιάτικο Πρωτάθλημα 2026',
    description: 'Το μεγάλο ανοιξιάτικο πρωτάθλημα 5x5 με 8 ομάδες. Διπλοί αγώνες, κύπελλο και χρηματικό έπαθλο!',
    type: 'league',
    pitchType: '5x5',
    pitchId: pitchId,
    status: 'active',
    startDate: Timestamp.fromDate(new Date('2026-03-16')),
    endDate: Timestamp.fromDate(new Date('2026-06-15')),
    maxTeams: 8,
    matchDuration: 60,
    legs: 1,
    rules: 'Κανονισμοί FIFA 5x5. Κίτρινη: 2λ αποβολή. Κόκκινη: αποβολή μέχρι τέλος αγώνα + 1 αγωνιστική τιμωρία.',
    prizeDescription: 'Κύπελλο + 500€ στον πρωταθλητή, 200€ στον δεύτερο',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const tournamentId = tournamentRef.id;
  console.log(`  ✅ Tournament → ${tournamentId}`);

  // ─── 2. Create 8 Teams ────────────────────────────
  console.log('\n  👥 Creating teams...');
  const teamIds: string[] = [];
  for (let i = 0; i < TEAM_NAMES.length; i++) {
    const played = Math.floor(Math.random() * 5) + 2;
    const won = Math.floor(Math.random() * (played + 1));
    const remaining = played - won;
    const drawn = Math.floor(Math.random() * (remaining + 1));
    const lost = remaining - drawn;
    const goalsFor = won * 3 + drawn + Math.floor(Math.random() * 4);
    const goalsAgainst = lost * 2 + drawn + Math.floor(Math.random() * 3);
    const points = won * 3 + drawn;

    const teamRef = await addDoc(collection(db, COL.teams), {
      tournamentId,
      venueId: VENUE_ID,
      name: TEAM_NAMES[i],
      captainName: PLAYER_NAMES[i][0],
      captainPhone: randomPhone(),
      captainEmail: `captain${i + 1}@example.com`,
      status: 'confirmed',
      stats: { played, won, drawn, lost, goalsFor, goalsAgainst, points },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    teamIds.push(teamRef.id);
    console.log(`    ⚽ ${TEAM_NAMES[i]} (${points}pts) → ${teamRef.id}`);
  }

  // ─── 3. Create Players (7 per team) ───────────────
  console.log('\n  🏃 Creating players...');
  const playerIdsByTeam: string[][] = [];
  let totalPlayers = 0;

  for (let t = 0; t < TEAM_NAMES.length; t++) {
    const teamPlayerIds: string[] = [];
    for (let p = 0; p < PLAYER_NAMES[t].length; p++) {
      const goals = Math.floor(Math.random() * 6);
      const assists = Math.floor(Math.random() * 4);
      const yellowCards = Math.floor(Math.random() * 3);
      const redCards = Math.random() > 0.85 ? 1 : 0;

      const playerRef = await addDoc(collection(db, COL.players), {
        teamId: teamIds[t],
        tournamentId,
        venueId: VENUE_ID,
        name: PLAYER_NAMES[t][p],
        phone: randomPhone(),
        shirtNumber: p === 0 ? 1 : (p + 1) * 2 + Math.floor(Math.random() * 3),
        position: POSITIONS[p],
        isCaptain: p === 0,
        stats: { goals, assists, yellowCards, redCards },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      teamPlayerIds.push(playerRef.id);
      totalPlayers++;
    }
    playerIdsByTeam.push(teamPlayerIds);
  }
  console.log(`    ✅ Created ${totalPlayers} players`);

  // ─── 4. Generate League Fixtures (round-robin) ────
  console.log('\n  📅 Generating fixtures...');
  const teams = [...Array(8).keys()];
  const matchDocs: string[] = [];
  let roundNum = 1;
  const n = teams.length;
  const teamsCopy = [...teams];

  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = teamsCopy[i];
      const awayIdx = teamsCopy[n - 1 - i];

      const matchDate = new Date('2026-03-16');
      matchDate.setDate(matchDate.getDate() + r * 5 + i);
      const hour = 18 + (i % 3) * 2;

      const isCompleted = r < 3;
      const homeScore = isCompleted ? Math.floor(Math.random() * 5) : undefined;
      const awayScore = isCompleted ? Math.floor(Math.random() * 4) : undefined;

      // Build events for completed matches
      const events: { minute: number; type: string; playerId: string; teamId: string; assistPlayerId?: string }[] = [];
      if (isCompleted && homeScore !== undefined && awayScore !== undefined) {
        for (let g = 0; g < homeScore; g++) {
          const scorerIdx = Math.floor(Math.random() * 7);
          const assistIdx = (scorerIdx + 1 + Math.floor(Math.random() * 5)) % 7;
          events.push({
            minute: Math.floor(Math.random() * 60) + 1,
            type: 'goal',
            playerId: playerIdsByTeam[homeIdx][scorerIdx],
            teamId: teamIds[homeIdx],
            ...(Math.random() > 0.3 ? { assistPlayerId: playerIdsByTeam[homeIdx][assistIdx] } : {}),
          });
        }
        for (let g = 0; g < awayScore; g++) {
          const scorerIdx = Math.floor(Math.random() * 7);
          const assistIdx = (scorerIdx + 1 + Math.floor(Math.random() * 5)) % 7;
          events.push({
            minute: Math.floor(Math.random() * 60) + 1,
            type: 'goal',
            playerId: playerIdsByTeam[awayIdx][scorerIdx],
            teamId: teamIds[awayIdx],
            ...(Math.random() > 0.3 ? { assistPlayerId: playerIdsByTeam[awayIdx][assistIdx] } : {}),
          });
        }
        if (Math.random() > 0.5) {
          events.push({
            minute: Math.floor(Math.random() * 60) + 1,
            type: 'yellow_card',
            playerId: playerIdsByTeam[homeIdx][Math.floor(Math.random() * 7)],
            teamId: teamIds[homeIdx],
          });
        }
        if (Math.random() > 0.6) {
          events.push({
            minute: Math.floor(Math.random() * 60) + 1,
            type: 'yellow_card',
            playerId: playerIdsByTeam[awayIdx][Math.floor(Math.random() * 7)],
            teamId: teamIds[awayIdx],
          });
        }
      }

      const matchRef = await addDoc(collection(db, COL.matches), {
        tournamentId,
        venueId: VENUE_ID,
        pitchId: pitchId,
        round: roundNum,
        roundLabel: `Αγωνιστική ${roundNum}`,
        homeTeamId: teamIds[homeIdx],
        awayTeamId: teamIds[awayIdx],
        scheduledDate: Timestamp.fromDate(matchDate),
        scheduledTime: `${hour}:00`,
        status: isCompleted ? 'completed' : 'scheduled',
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        events,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      matchDocs.push(matchRef.id);
    }
    roundNum++;

    // Rotate (keep first fixed)
    const last = teamsCopy.pop()!;
    teamsCopy.splice(1, 0, last);
  }

  const completedMatches = matchDocs.length - (n - 1 - 3) * (n / 2);
  console.log(`    ✅ Created ${matchDocs.length} matches (${completedMatches} completed, ${matchDocs.length - completedMatches} scheduled)`);

  console.log('\n' + '─'.repeat(50));
  console.log('🏆 Tournament seed complete!');
  console.log(`  - 1 tournament: "Ανοιξιάτικο Πρωτάθλημα 2026"`);
  console.log(`  - ${teamIds.length} teams`);
  console.log(`  - ${totalPlayers} players`);
  console.log(`  - ${matchDocs.length} matches`);
  console.log(`\n  Tournament ID: ${tournamentId}`);

  return { tournamentId, teamIds, matchDocs };
}

// ══════════════════════════════════════════════════════════
// MAIN (standalone mode)
// ══════════════════════════════════════════════════════════
async function main() {
  console.log('🌱 Tournament Seed Script');
  console.log('═'.repeat(50));
  console.log(`Email: ${EMAIL}`);

  console.log('\n🔐 Signing in...');
  await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  console.log('  ✅ Authenticated');

  // Look up venueId
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
  VENUE_ID = ownerSnap.docs[0].data().venueId;
  console.log(`  ✅ Found venue: ${VENUE_ID}`);

  await seedTournaments();

  console.log('\nRefresh your app to see the data.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
