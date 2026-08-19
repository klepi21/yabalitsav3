/**
 * Ξαναϋπολογίζει το `planType` κάθε venue από το ΠΡΑΓΜΑΤΙΚΟ του μέγεθος.
 *
 * Γιατί χρειάζεται: το παλιό `planType` ('Basic' | 'Pro' | 'Enterprise')
 * δήλωνε στην ουσία διάρκεια προπληρωμής, όχι μέγεθος. Στο νέο μοντέλο
 * δηλώνει ζώνη μεγέθους ('Starter' | 'Growth' | 'Scale'). Οι υπάρχουσες
 * εγγραφές θα εμφάνιζαν άκυρες ετικέτες στις ρυθμίσεις, στο top bar και
 * στο admin panel.
 *
 * Χρήση:
 *   node scripts/migrate-pricing-model.js            # dry run — δεν γράφει
 *   node scripts/migrate-pricing-model.js --apply    # εκτελεί τις αλλαγές
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');

/* Κρατήστε το συγχρονισμένο με το src/lib/pricing.ts — είναι η πηγή αλήθειας.
   Το script είναι απλό Node, οπότε δεν μπορεί να κάνει import το TypeScript. */
const PLATFORM_TIERS = [
  { id: 'starter', upTo: 2 },
  { id: 'growth', upTo: 6 },
  { id: 'scale', upTo: null },
];

const resolveTier = (q) => PLATFORM_TIERS.find((t) => t.upTo === null || q <= t.upTo);
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function loadCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return admin.credential.applicationDefault();

  const root = path.join(__dirname, '..');
  const keyFile = fs
    .readdirSync(root)
    .find((f) => f.startsWith('yabalitsa-') && f.includes('firebase-adminsdk') && f.endsWith('.json'));

  if (!keyFile) {
    console.error('✗ Δεν βρέθηκαν διαπιστευτήρια.');
    console.error('  Ορίστε GOOGLE_APPLICATION_CREDENTIALS ή βάλτε το service account JSON στη ρίζα.');
    process.exit(1);
  }
  return admin.credential.cert(require(path.join(root, keyFile)));
}

/** Ομαδοποιεί έγγραφα ανά venueId με μία σάρωση, αντί για query ανά venue. */
function groupByVenue(docs, filter = () => true) {
  const map = {};
  for (const d of docs) {
    const data = d.data();
    if (!filter(data)) continue;
    const v = data.venueId;
    if (!v) continue;
    (map[v] = map[v] || []).push(d);
  }
  return map;
}

async function main() {
  admin.initializeApp({ credential: loadCredentials() });
  const db = admin.firestore();

  console.log(
    APPLY
      ? '⚙  ΕΚΤΕΛΕΣΗ — θα γίνουν εγγραφές\n'
      : '👀 DRY RUN — καμία εγγραφή. Πρόσθεσε --apply για να εκτελεστεί.\n'
  );

  const [venues, pitches, groups, users] = await Promise.all([
    db.collection('yabalitsa_venues').get(),
    db.collection('yabalitsa_pitches').get(),
    db.collection('yabalitsa_user_groups').get(),
    db.collection('yabalitsa_academy_users').get(),
  ]);

  if (venues.empty) {
    console.log('Δεν βρέθηκαν venues.');
    return;
  }

  const pitchesBy = groupByVenue(pitches.docs, (d) => d.active !== false);
  const groupsBy = groupByVenue(groups.docs);
  const usersBy = groupByVenue(users.docs);

  const changes = [];

  for (const venue of venues.docs) {
    const id = venue.id;
    const data = venue.data();

    const pitchCount = (pitchesBy[id] || []).length;

    // Ίδιος ορισμός «αθλητή» με την εφαρμογή: χρήστες σε κατηγορία με
    // δυνατότητα squad_assignment (όχι γονείς, όχι προπονητές).
    const athleteGroupIds = new Set(
      (groupsBy[id] || [])
        .filter((g) => (g.data().capabilities || []).includes('squad_assignment'))
        .map((g) => g.id)
    );
    const athletes = (usersBy[id] || []).filter((u) => athleteGroupIds.has(u.data().groupId)).length;

    const nextPlanType = title(resolveTier(pitchCount).id);

    if (data.planType !== nextPlanType) {
      changes.push({ ref: venue.ref, id, name: data.name, from: data.planType || '—', to: nextPlanType, pitchCount, athletes });
    }
  }

  console.log(`Σύνολο venues:  ${venues.size}`);
  console.log(`Χωρίς αλλαγή:   ${venues.size - changes.length}`);
  console.log(`Προς ενημέρωση: ${changes.length}\n`);

  if (changes.length === 0) {
    console.log('✓ Όλα τα planType είναι ήδη σωστά. Καμία ενέργεια.');
    return;
  }

  console.log('  venue'.padEnd(32) + 'γήπ.  αθλ.   από          →  σε');
  for (const c of changes) {
    console.log(
      '  ' +
        String(c.name || c.id).slice(0, 28).padEnd(30) +
        String(c.pitchCount).padStart(4) +
        String(c.athletes).padStart(6) +
        '   ' +
        String(c.from).padEnd(13) +
        '→  ' +
        c.to
    );
  }

  if (!APPLY) {
    console.log('\n👀 Dry run — δεν γράφτηκε τίποτα.');
    console.log('   Εκτέλεσε ξανά με --apply για να εφαρμοστούν.');
    return;
  }

  // Το Firestore δέχεται έως 500 εγγραφές ανά batch.
  let written = 0;
  for (let i = 0; i < changes.length; i += 450) {
    const batch = db.batch();
    for (const c of changes.slice(i, i + 450)) {
      batch.update(c.ref, {
        planType: c.to,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      written++;
    }
    await batch.commit();
    console.log(`  … ${written}/${changes.length}`);
  }

  console.log(`\n✓ Ενημερώθηκαν ${written} venues.`);
}

main().catch((err) => {
  console.error('✗ Απέτυχε:', err.message);
  process.exit(1);
});
