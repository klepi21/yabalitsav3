/**
 * Στήνει καταστάσεις στο demo venue για να επικυρωθεί το UI.
 *
 *   node scripts/qa/scenario.js snapshot          # αποθηκεύει την τρέχουσα κατάσταση
 *   node scripts/qa/scenario.js list              # διαθέσιμα σενάρια
 *   node scripts/qa/scenario.js set <σενάριο>     # εφαρμόζει σενάριο
 *   node scripts/qa/scenario.js pitches <n>       # φέρνει τα ενεργά γήπεδα στο n
 *   node scripts/qa/scenario.js athletes <n>      # φέρνει τους αθλητές στο n
 *   node scripts/qa/scenario.js days <n>          # ορίζει daysRemaining
 *   node scripts/qa/scenario.js restore           # επαναφορά + καθαρισμός
 *
 * Ασφάλεια: κάθε έγγραφο που φτιάχνει το script φέρει `_qaSeed: true`.
 * Ο καθαρισμός διαγράφει ΜΟΝΟ τέτοια έγγραφα — ποτέ πραγματικά δεδομένα.
 */
const fs = require('fs');
const path = require('path');
const { admin, init, findVenue, measureUsage, QA_MARK, ROOT } = require('./lib');

const EMAIL = process.env.QA_EMAIL || 'nikoskoukis99@gmail.com';
const SNAP = path.join(ROOT, 'scripts', 'qa', '.snapshot.json');
const FV = admin.firestore.FieldValue;

/** Σενάρια: τι θέλουμε να επικυρώσουμε σε κάθε ένα. */
const SCENARIOS = {
  'trial-fresh':    { desc: 'Νέα δοκιμή 30 ημερών', venue: { plan: 'trial', daysRemaining: 30, active: true } },
  'trial-warning':  { desc: 'Δοκιμή που λήγει σε 5 ημέρες — banner + κίτρινο badge', venue: { plan: 'trial', daysRemaining: 5, active: true } },
  'trial-last-day': { desc: 'Τελευταία ημέρα δοκιμής (ενικός: «1 ημέρα»)', venue: { plan: 'trial', daysRemaining: 1, active: true } },
  'sub-healthy':    { desc: 'Ενεργή συνδρομή, άφθονες ημέρες', venue: { plan: 'subscription', daysRemaining: 200, active: true } },
  'sub-expiring':   { desc: 'Συνδρομή που λήγει σε 3 ημέρες', venue: { plan: 'subscription', daysRemaining: 3, active: true } },
  'expired':        { desc: 'Ληγμένος — force logout στο login', venue: { plan: 'subscription', daysRemaining: 0, active: false } },
  'tier-starter':   { desc: 'Ζώνη starter', pitches: 2 },
  'tier-growth':    { desc: 'Ζώνη growth', pitches: 4 },
  'tier-scale':     { desc: 'Ζώνη scale', pitches: 8 },
  'at-pitch-limit': { desc: '12 γήπεδα — μπλοκάρει η δημιουργία νέου', pitches: 12 },
  'over-pitches':   { desc: '13 γήπεδα — κατόπιν συνεννόησης', pitches: 13 },
  'academy-s':      { desc: 'Ακαδημία έως 40', athletes: 20 },
  'academy-m':      { desc: 'Ακαδημία 41–120', athletes: 80 },
  'academy-l':      { desc: 'Ακαδημία 121–250', athletes: 180 },
  'at-athlete-limit': { desc: '500 αθλητές — μπλοκάρει η δημιουργία', athletes: 500 },
  'over-athletes':  { desc: '501 αθλητές — κατόπιν συνεννόησης', athletes: 501 },
  'upgrade-due':    {
    desc: 'Πλήρωσε ετήσια ως Starter, τώρα χρησιμοποιεί περισσότερα — κάρτα αναβάθμισης',
    venue: {
      plan: 'subscription',
      daysRemaining: 273,
      active: true,
      billing: {
        platformTierId: 'starter',
        academyTierId: null,
        monthlyBase: 29,
        durationMonths: 12,
        discountPercent: 12,
        chargedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  },
  'upgrade-clear':  {
    desc: 'Καθαρίζει το στιγμιότυπο πληρωμής (καμία εκκρεμής αναβάθμιση)',
    clearBilling: true,
  },
};

const OPENING = Object.fromEntries(
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    .map((d) => [d, { isOpen: true, openTime: '09:00', closeTime: '23:00' }])
);

async function ensureAthleteGroup(db, venueId) {
  const groups = await db.collection('yabalitsa_user_groups').where('venueId', '==', venueId).get();
  const existing = groups.docs.find((g) => (g.data().capabilities || []).includes('squad_assignment'));
  if (existing) return existing.id;

  const ref = await db.collection('yabalitsa_user_groups').add({
    venueId,
    name: 'Αθλητής (QA)',
    namePlural: 'Αθλητές (QA)',
    icon: '⚽',
    capabilities: ['squad_assignment'],
    fields: [],
    [QA_MARK]: true,
    createdAt: FV.serverTimestamp(),
    updatedAt: FV.serverTimestamp(),
  });
  console.log('  + δημιουργήθηκε κατηγορία αθλητών (QA)');
  return ref.id;
}

/** Φέρνει ένα πλήθος στο target: προσθέτει QA έγγραφα ή αφαιρεί QA έγγραφα. */
async function setCount({ db, current, target, qaDocs, create, label }) {
  if (current === target) {
    console.log(`  = ${label}: ήδη ${target}`);
    return;
  }
  if (target > current) {
    const need = target - current;
    for (let i = 0; i < need; i += 400) {
      const batch = db.batch();
      for (let j = i; j < Math.min(i + 400, need); j++) batch.set(db.collection(create.col).doc(), create.doc(j));
      await batch.commit();
    }
    console.log(`  + ${label}: ${current} → ${target}  (+${need})`);
    return;
  }

  const remove = current - target;
  if (qaDocs.length < remove) {
    console.error(`  ✗ ${label}: χρειάζεται αφαίρεση ${remove}, αλλά υπάρχουν μόνο ${qaDocs.length} QA έγγραφα.`);
    console.error('    Δεν αγγίζω πραγματικά δεδομένα. Μείωσε τον στόχο ή διάγραψέ τα χειροκίνητα.');
    return;
  }
  for (let i = 0; i < remove; i += 400) {
    const batch = db.batch();
    for (const doc of qaDocs.slice(i, Math.min(i + 400, remove))) batch.delete(doc.ref);
    await batch.commit();
  }
  console.log(`  − ${label}: ${current} → ${target}  (−${remove})`);
}

async function applyPitches(db, venue, target) {
  const usage = await measureUsage(db, venue.id);
  const qaPitches = usage._docs.activePitches.filter((d) => d.data()[QA_MARK]);
  await setCount({
    db, current: usage.pitches, target, qaDocs: qaPitches, label: 'γήπεδα',
    create: {
      col: 'yabalitsa_pitches',
      doc: (i) => ({
        venueId: venue.id,
        name: `Γήπεδο QA ${i + 1}`,
        type: '5x5',
        slotDuration: 60,
        pricePerSlot: 45,
        active: true,
        defaultOpeningHours: OPENING,
        [QA_MARK]: true,
        createdAt: FV.serverTimestamp(),
        updatedAt: FV.serverTimestamp(),
      }),
    },
  });
}

async function applyAthletes(db, venue, target) {
  const groupId = target > 0 ? await ensureAthleteGroup(db, venue.id) : null;
  const usage = await measureUsage(db, venue.id);
  const qaAthletes = usage._docs.athletes.filter((d) => d.data()[QA_MARK]);
  await setCount({
    db, current: usage.athletes, target, qaDocs: qaAthletes, label: 'αθλητές',
    create: {
      col: 'yabalitsa_academy_users',
      doc: (i) => ({
        venueId: venue.id,
        groupId,
        displayName: `Αθλητής QA ${i + 1}`,
        fields: {},
        [QA_MARK]: true,
        createdAt: FV.serverTimestamp(),
        updatedAt: FV.serverTimestamp(),
      }),
    },
  });
}

async function main() {
  const db = init();
  const cmd = process.argv[2];
  const arg = process.argv[3];
  const venue = await findVenue(db, EMAIL);

  if (cmd === 'list') {
    console.log('\nΔιαθέσιμα σενάρια:\n');
    for (const [k, v] of Object.entries(SCENARIOS)) console.log('  ' + k.padEnd(18) + v.desc);
    console.log('');
    return;
  }

  if (cmd === 'snapshot') {
    const usage = await measureUsage(db, venue.id);
    const snap = {
      email: EMAIL,
      venueId: venue.id,
      takenAt: new Date().toISOString(),
      venue: {
        plan: venue.data.plan ?? null,
        planType: venue.data.planType ?? null,
        daysRemaining: venue.data.daysRemaining ?? null,
        active: venue.data.active ?? null,
        billing: venue.data.billing ?? null,
      },
      counts: { pitches: usage.pitches, athletes: usage.athletes },
    };
    fs.writeFileSync(SNAP, JSON.stringify(snap, null, 2));
    console.log('✓ Snapshot αποθηκεύτηκε:', SNAP);
    console.log(JSON.stringify(snap.venue, null, 2));
    console.log('  γήπεδα:', usage.pitches, '· αθλητές:', usage.athletes);
    return;
  }

  if (cmd === 'restore') {
    if (!fs.existsSync(SNAP)) {
      console.error('✗ Δεν υπάρχει snapshot. Τρέξε πρώτα: node scripts/qa/scenario.js snapshot');
      process.exit(1);
    }
    const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));

    // Διαγραφή ΜΟΝΟ των QA εγγράφων.
    let deleted = 0;
    for (const col of ['yabalitsa_pitches', 'yabalitsa_academy_users', 'yabalitsa_user_groups']) {
      const snapDocs = await db.collection(col).where('venueId', '==', venue.id).where(QA_MARK, '==', true).get();
      for (let i = 0; i < snapDocs.size; i += 400) {
        const batch = db.batch();
        for (const doc of snapDocs.docs.slice(i, i + 400)) batch.delete(doc.ref);
        await batch.commit();
      }
      if (snapDocs.size) console.log(`  − ${col}: ${snapDocs.size} QA έγγραφα`);
      deleted += snapDocs.size;
    }

    /* Τα null σημαίνουν «δεν υπήρχε το πεδίο». Πρέπει να ΔΙΑΓΡΑΦΟΥΝ, όχι
       να αγνοηθούν — αλλιώς ό,τι πρόσθεσε ένα σενάριο (π.χ. billing)
       επιβιώνει της επαναφοράς. */
    const restore = {};
    for (const [k, v] of Object.entries(snap.venue)) {
      restore[k] = v === null ? FV.delete() : v;
    }
    restore.updatedAt = FV.serverTimestamp();
    await venue.ref.update(restore);

    console.log(`\n✓ Επαναφορά ολοκληρώθηκε (${deleted} QA έγγραφα διαγράφηκαν).`);
    console.log('  venue:', JSON.stringify(snap.venue));
    return;
  }

  // Οι εντολές που γράφουν απαιτούν snapshot — αλλιώς δεν υπάρχει γυρισμός.
  if (!fs.existsSync(SNAP)) {
    console.error('✗ Πάρε πρώτα snapshot: node scripts/qa/scenario.js snapshot');
    process.exit(1);
  }

  if (cmd === 'pitches')  { await applyPitches(db, venue, Number(arg)); }
  else if (cmd === 'athletes') { await applyAthletes(db, venue, Number(arg)); }
  else if (cmd === 'days') {
    await venue.ref.update({ daysRemaining: Number(arg), updatedAt: FV.serverTimestamp() });
    console.log(`  ✓ daysRemaining = ${arg}`);
  }
  else if (cmd === 'set') {
    const sc = SCENARIOS[arg];
    if (!sc) {
      console.error(`✗ Άγνωστο σενάριο «${arg}». Δες: node scripts/qa/scenario.js list`);
      process.exit(1);
    }
    console.log(`\n▸ ${arg} — ${sc.desc}\n`);
    if (sc.clearBilling) {
      await venue.ref.update({ billing: FV.delete(), updatedAt: FV.serverTimestamp() });
      console.log('  ✓ αφαιρέθηκε το στιγμιότυπο πληρωμής');
    }
    if (sc.venue) {
      await venue.ref.update({ ...sc.venue, updatedAt: FV.serverTimestamp() });
      console.log('  ✓ venue:', JSON.stringify(sc.venue));
    }
    if (sc.pitches !== undefined) await applyPitches(db, venue, sc.pitches);
    if (sc.athletes !== undefined) await applyAthletes(db, venue, sc.athletes);
  }
  else {
    console.error('✗ Άγνωστη εντολή. Δες το σχόλιο στην κορυφή του αρχείου.');
    process.exit(1);
  }

  console.log('\n→ Τώρα τρέξε: node scripts/qa/inspect.js\n');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
