/**
 * Διαγράφει εγκαταλελειμμένες προσπάθειες πληρωμής (`status: 'pending'`).
 *
 * Κάθε άνοιγμα ταμείου δημιουργεί εγγραφή pending. Όσες δεν ολοκληρώθηκαν
 * μένουν για πάντα και γεμίζουν τη συλλογή με θόρυβο.
 *
 * Το ίδιο κάνει αυτόματα και το Cloud Function `cleanupStalePayments`
 * (καθημερινά 03:30). Αυτό εδώ είναι για εφάπαξ καθάρισμα.
 *
 *   node scripts/cleanup-stale-payments.js               # dry run
 *   node scripts/cleanup-stale-payments.js --apply       # διαγράφει
 *   node scripts/cleanup-stale-payments.js --apply --hours 1
 */
const { init } = require('./qa/lib');

const APPLY = process.argv.includes('--apply');
const hoursIdx = process.argv.indexOf('--hours');
const HOURS = hoursIdx > -1 ? Number(process.argv[hoursIdx + 1]) : 24;

(async () => {
  const db = init();
  const cutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

  console.log(
    APPLY ? '⚙  ΕΚΤΕΛΕΣΗ — θα διαγραφούν εγγραφές\n' : '👀 DRY RUN — καμία διαγραφή. Πρόσθεσε --apply.\n'
  );
  console.log(`Όριο: pending παλαιότερες από ${HOURS} ώρες (πριν ${cutoff})\n`);

  const snapshot = await db.collection('yabalitsa_payments').where('status', '==', 'pending').get();

  const stale = snapshot.docs.filter((d) => {
    const c = d.data().createdAt;
    return typeof c === 'string' && c < cutoff;
  });

  console.log(`pending συνολικά: ${snapshot.size}`);
  console.log(`προς διαγραφή:    ${stale.length}\n`);

  if (stale.length === 0) {
    console.log('✓ Καμία εκκρεμής προσπάθεια προς καθαρισμό.');
    return;
  }

  for (const d of stale) {
    const p = d.data();
    console.log(
      `  ${String(p.createdAt).slice(0, 10)}  €${String(p.amount).padStart(9)}  ` +
        `${String(p.planName || '—').padEnd(12)} venue=${p.venueId}`
    );
  }

  if (!APPLY) {
    console.log('\n👀 Dry run — δεν διαγράφηκε τίποτα.');
    return;
  }

  let deleted = 0;
  for (let i = 0; i < stale.length; i += 450) {
    const batch = db.batch();
    for (const d of stale.slice(i, i + 450)) {
      batch.delete(d.ref);
      deleted++;
    }
    await batch.commit();
  }
  console.log(`\n✓ Διαγράφηκαν ${deleted} εκκρεμείς εγγραφές.`);
})()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('✗', e.message);
    process.exit(1);
  });
