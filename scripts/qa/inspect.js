/**
 * Διαβάζει την κατάσταση του demo venue και τυπώνει ΤΙ ΠΡΕΠΕΙ ΝΑ ΔΕΙΧΝΕΙ
 * κάθε οθόνη. Είναι το συμβόλαιο επικύρωσης: συγκρίνεις με το UI.
 *
 *   node scripts/qa/inspect.js [email]
 */
const {
  init, findVenue, measureUsage, priceFor, resolveTier,
  platformTiers, academyTiers, SELF_SERVE_LIMITS, TRIAL_DAYS, VAT, eur, upgradeOwed, unlockCost,
} = require('./lib');

const EMAIL = process.argv[2] || 'nikoskoukis99@gmail.com';
const h = (t) => console.log('\n\x1b[1m' + t + '\x1b[0m\n' + '─'.repeat(t.length));
const kv = (k, v) => console.log('  ' + String(k).padEnd(34) + v);
const expect = (screen, what) => console.log('  \x1b[36m▸\x1b[0m ' + screen.padEnd(32) + what);

(async () => {
  const db = init();
  const venue = await findVenue(db, EMAIL);
  const d = venue.data;
  const usage = await measureUsage(db, venue.id);

  const days = d.daysRemaining ?? 0;
  const isTrial = d.plan === 'trial';
  const isSub = d.plan === 'subscription';
  const active = d.active !== false;

  h('VENUE');
  kv('email', EMAIL);
  kv('venueId', venue.id);
  kv('όνομα', d.name || '—');
  kv('plan', d.plan || '—');
  kv('planType (αποθηκευμένο)', d.planType || '—');
  kv('active', active ? 'ναι' : 'ΟΧΙ (κλειδωμένος)');
  kv('daysRemaining', days);

  h('ΜΕΓΕΘΟΣ (όπως το μετρά η εφαρμογή)');
  kv('ενεργά γήπεδα', `${usage.pitches}   (σύνολο εγγράφων: ${usage._docs.pitches.size})`);
  kv('αθλητές', `${usage.athletes}   (σύνολο χρηστών ακαδημίας: ${usage._docs.users.size})`);
  kv('κατηγορίες με squad_assignment', usage._docs.athleteGroupIds.size);
  kv('hasAcademy', usage.hasAcademy ? 'ναι' : 'όχι');

  const pTier = resolveTier(platformTiers, usage.pitches);
  const aTier = usage.hasAcademy ? resolveTier(academyTiers, usage.athletes) : null;
  const q = priceFor(usage, 1);

  h('ΖΩΝΕΣ & ΤΙΜΗ');
  kv('ζώνη πλατφόρμας', `${pTier.label}  [${pTier.id}]`);
  kv('ζώνη ακαδημίας', aTier ? `${aTier.label}  [${aTier.id}]` : '— (δεν χρεώνεται)');
  kv('κατόπιν συνεννόησης;', q.requiresContact ? 'ΝΑΙ' : 'όχι');
  if (!q.requiresContact) {
    // Ρητή ανάλυση: από πού βγαίνει το ποσό.
    const pm = pTier.monthly || 0;
    const am = aTier ? aTier.monthly : 0;
    console.log('');
    kv('  πλατφόρμα', `€${pm}`);
    if (aTier) kv('  ακαδημία', `+€${am}`);
    kv('  άθροισμα προ ΦΠΑ', `€${pm + am}`);
    console.log('');
    for (const dur of [1, 6, 12]) {
      const p = priceFor(usage, dur);
      const mult = (1 - p.discountPercent / 100).toFixed(2);
      kv(
        `${dur} ${dur === 1 ? 'μήνας' : 'μήνες'}`,
        `${pm + am} × ${mult} × 1,24 = ${eur(p.monthlyWithVat)}/μήνα` +
          `   →  σύνολο ${eur(p.totalWithVat)}`
      );
    }
  }

  const atPitch = usage.pitches >= SELF_SERVE_LIMITS.pitches;
  const atAthlete = usage.hasAcademy && usage.athletes >= SELF_SERVE_LIMITS.athletes;

  h('ΟΡΙΑ SELF-SERVE');
  kv('όριο γηπέδων', `${usage.pitches} / ${SELF_SERVE_LIMITS.pitches}` + (atPitch ? '   ⟵ ΣΤΟ ΟΡΙΟ' : ''));
  kv('όριο αθλητών', `${usage.athletes} / ${SELF_SERVE_LIMITS.athletes}` + (atAthlete ? '   ⟵ ΣΤΟ ΟΡΙΟ' : ''));

  const billed = d.billing || null;
  const up = upgradeOwed(usage, billed, days);


  h('ΑΝΑΒΑΘΜΙΣΗ ΕΝΤΟΣ ΠΕΡΙΟΔΟΥ');
  if (!billed) {
    kv('στιγμιότυπο πληρωμής', '— (δοκιμή ή συνδρομή πριν τη μετάβαση)');
    console.log('  Χωρίς στιγμιότυπο δεν χρεώνεται αναδρομικά τίποτα.');
    console.log('  Γράφεται στην επόμενη πληρωμή.');
  } else {
    kv('πληρωμένη ζώνη', `${billed.platformTierId}${billed.academyTierId ? ' + ' + billed.academyTierId : ''}`);
    kv('πληρωμένη βάση / τρέχουσα', `€${up.billedBase} → €${up.currentBase} (προ ΦΠΑ, ανά μήνα)`);
    kv('οφείλεται διαφορά;', up.owed ? `ΝΑΙ — ${eur(up.amountWithVat)} για ${days} ημέρες` : 'όχι');

    const nextP = unlockCost(usage, billed, days, { pitches: usage.pitches + 1 });
    const nextA = unlockCost(usage, billed, days, { athletes: usage.athletes + 1 });
    kv('προσθήκη γηπέδου', nextP.owed ? `ΚΛΕΙΔΩΜΕΝΗ — ${eur(nextP.amountWithVat)}` : 'ελεύθερη');
    kv('προσθήκη αθλητή', nextA.owed ? `ΚΛΕΙΔΩΜΕΝΗ — ${eur(nextA.amountWithVat)}` : 'ελεύθερη');
  }

  /* ---------------------------------------------------------------- */
  h('ΤΙ ΠΡΕΠΕΙ ΝΑ ΔΕΙΧΝΕΙ ΤΟ UI');

  const expiring = days <= 7 && days > 0;

  const tierLabel = pTier.id.charAt(0).toUpperCase() + pTier.id.slice(1);

  expect('Top bar (chip πλάνου)',
    !active ? 'δεν φτάνει εκεί — γίνεται logout'
      : expiring ? `«Ανανέωση σε ${days} ημ.» σε πορτοκαλί`
      : isTrial ? `«Δοκιμή • ${days} ημ.»`
      : `«Συνδρομή • ${days} ημ.»`);

  expect('Κάρτα αναβάθμισης',
    up.owed
      ? `ΟΡΑΤΗ σε dashboard + συνδρομή: «Εκκρεμεί αναβάθμιση» + κουμπί «Αναβάθμιση — ${eur(up.amountWithVat)}»`
      : 'ΚΡΥΦΗ');

  expect('Dashboard banner',
    !active ? '—'
      : expiring
        ? `ΟΡΑΤΟ: «${isTrial ? 'Η δωρεάν δοκιμή σας λήγει' : 'Η συνδρομή σας λήγει'} σε ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}»`
          + ` + κουμπί «${isTrial ? 'Επιλογή πλάνου' : 'Ανανέωση'}»`
        : 'ΚΡΥΦΟ (εμφανίζεται μόνο στις τελευταίες 7 ημέρες)');

  const billedMonthly = billed
    ? billed.monthlyBase * (1 - billed.discountPercent / 100) * (1 + VAT)
    : priceFor(usage, 1).monthlyWithVat;

  expect('Ρυθμίσεις (κάρτα πλάνου)',
    isSub
      ? `headline «${eur(billedMonthly)} / μήνα» + «${usage.pitches} γήπεδα · ${usage.athletes} αθλητές · ζώνη ${pTier.label.toLowerCase()}»`
      : 'headline «Δωρεάν δοκιμή»');

  expect('Ρυθμίσεις (badge πλάνου)',
    isSub ? `«Συνδρομή • ${days} ημέρες»` + (days <= 7 ? ' με κίτρινη κουκκίδα' : ' με πράσινη')
      : isTrial ? `«Δωρεάν δοκιμή • ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}»` + (days <= 7 ? ' με κίτρινη κουκκίδα' : '')
      : '«Χωρίς πλάνο»');

  expect('Ρυθμίσεις (Telegram)',
    !active ? '— (δεν φτάνει εκεί)'
      : (isTrial && days > 0) || isSub ? 'ΟΡΑΤΗ η φόρμα υποστήριξης'
      : 'ΚΡΥΦΗ');

  if (!active || days <= 0) {
    const reason = days <= 0 && isSub ? 'expired' : days <= 0 && isTrial ? 'trial_expired' : 'inactive';
    const msg = {
      expired: 'Η συνδρομή σας έληξε. Ανανεώστε την για να συνεχίσετε.',
      trial_expired: 'Η δωρεάν δοκιμή σας έληξε. Επιλέξτε πλάνο για να συνεχίσετε.',
      inactive: 'Ο λογαριασμός σας δεν είναι ενεργός. Επικοινωνήστε μαζί μας.',
    }[reason];
    expect('Login μετά το logout', `?error=${reason} → «${msg}»`);
  }

  expect('Συνδρομή — μέγεθος',
    `«${usage.pitches} ${usage.pitches === 1 ? 'γήπεδο' : 'γήπεδα'}» / ` +
    (usage.hasAcademy ? `«${usage.athletes} ${usage.athletes === 1 ? 'αθλητής' : 'αθλητές'}»` : '«Δεν χρησιμοποιείται — δεν χρεώνεται»'));

  if (isSub && d.planType && d.planType !== tierLabel) {
    console.log('');
    console.log(`  \x1b[90m(αποθηκευμένο planType: «${d.planType}» — καταγραφή αγοράς.`);
    console.log('   Δεν εμφανίζεται πλέον στο UI· όλες οι οθόνες δείχνουν την');
    console.log('   τρέχουσα ζώνη, ώστε να μη διαφωνούν μεταξύ τους.)\x1b[0m');
  }

  const pHead = pTier.upTo === null ? null : pTier.upTo - usage.pitches;
  const aHead = aTier && aTier.upTo !== null ? aTier.upTo - usage.athletes : null;
  expect('Συνδρομή — περιθώριο',
    q.requiresContact ? '—'
      : `γήπεδα: ${pHead === null ? '—' : pHead > 0 ? `«Περιθώριο για ${pHead} ακόμα»` : '«Στο όριο της ζώνης»'}` +
        (aTier ? `  ·  αθλητές: ${aHead === null ? '—' : aHead > 0 ? `«Περιθώριο για ${aHead} ακόμα»` : '«Στο όριο της ζώνης»'}` : ''));

  expect('Συνδρομή — αγορά',
    q.requiresContact
      ? 'ΚΙΤΡΙΝΟ πλαίσιο «Κατόπιν συνεννόησης» + κουμπί Επικοινωνία (ΧΩΡΙΣ επιλογή διάρκειας/ταμείο)'
      : `3 επιλογές διάρκειας + κουμπί «Πληρωμή ${eur(priceFor(usage, 12).totalWithVat)}» (προεπιλογή: ετήσια)`);

  const nextPitch = unlockCost(usage, billed, days, { pitches: usage.pitches + 1 });
  const nextAthlete = unlockCost(usage, billed, days, { athletes: usage.athletes + 1 });

  expect('Νέο γήπεδο',
    atPitch ? 'ΜΠΛΟΚ (κίτρινο): «Ξεπεράσατε το αυτόματο πλάνο»'
      : nextPitch.owed
        ? `ΜΠΛΟΚ (λευκό): «Προσθήκη γηπέδου» + κουμπί «Πληρωμή ${eur(nextPitch.amountWithVat)} και προσθήκη»`
        : 'κανονική φόρμα');

  expect('Νέος χρήστης ακαδημίας',
    atAthlete ? 'ΜΠΛΟΚ (κίτρινο): «Ξεπεράσατε το αυτόματο πλάνο»'
      : nextAthlete.owed
        ? `ΜΠΛΟΚ (λευκό): «Προσθήκη αθλητή» + κουμπί «Πληρωμή ${eur(nextAthlete.amountWithVat)} και προσθήκη»`
        : 'κανονική φόρμα');

  expect('Checkout (API)',
    q.requiresContact ? '409 + μήνυμα επικοινωνίας' : 'δημιουργεί PaymentIntent');

  h('ΣΗΜΕΙΩΣΕΙΣ');
  console.log(`  Νέες εγγραφές παίρνουν daysRemaining = ${TRIAL_DAYS}.`);
  if (d.planType && !['Starter', 'Growth', 'Scale', 'Custom', 'Trial'].includes(d.planType)) {
    console.log(`  \x1b[33m⚠ Το planType «${d.planType}» είναι παλιό. Τρέξε: node scripts/migrate-pricing-model.js --apply\x1b[0m`);
  }
  console.log('');
  process.exit(0);
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
