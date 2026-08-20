/** Κοινά βοηθήματα για τα QA scripts. */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const ROOT = path.join(__dirname, '..', '..');

/** Όλα τα έγγραφα που φτιάχνουν τα QA scripts φέρουν αυτό το πεδίο,
 *  ώστε ο καθαρισμός να μη μπορεί ποτέ να αγγίξει πραγματικά δεδομένα. */
const QA_MARK = '_qaSeed';

function init() {
  if (admin.apps.length) return admin.firestore();

  let credential;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else {
    const keyFile = fs
      .readdirSync(ROOT)
      .find((f) => f.startsWith('yabalitsa-') && f.includes('firebase-adminsdk') && f.endsWith('.json'));
    if (!keyFile) {
      console.error('✗ Δεν βρέθηκαν διαπιστευτήρια Firebase.');
      console.error('  Ορίστε GOOGLE_APPLICATION_CREDENTIALS ή βάλτε το service account JSON στη ρίζα.');
      process.exit(1);
    }
    credential = admin.credential.cert(require(path.join(ROOT, keyFile)));
  }

  admin.initializeApp({ credential });
  return admin.firestore();
}

/** Βρίσκει το venue από το email του ιδιοκτήτη. */
async function findVenue(db, email) {
  let uid;
  try {
    uid = (await admin.auth().getUserByEmail(email)).uid;
  } catch {
    console.error(`✗ Δεν βρέθηκε χρήστης με email ${email}`);
    process.exit(1);
  }

  const snap = await db.collection('yabalitsa_venues').where('ownerId', '==', uid).get();
  if (snap.empty) {
    console.error(`✗ Ο χρήστης ${email} (${uid}) δεν έχει venue.`);
    process.exit(1);
  }
  return { id: snap.docs[0].id, ref: snap.docs[0].ref, data: snap.docs[0].data(), uid };
}

/* ---------------------------------------------------------------- *
 *  Ζώνες — καθρέφτης του src/lib/pricing.ts.
 *  Κρατήστε τα συγχρονισμένα· εκεί είναι η πηγή αλήθειας.
 * ---------------------------------------------------------------- */
const SELF_SERVE_LIMITS = { pitches: 12, athletes: 500 };

const platformTiers = [
  { id: 'starter', label: 'Έως 2 γήπεδα', upTo: 2, monthly: 29 },
  { id: 'growth', label: '3–6 γήπεδα', upTo: 6, monthly: 59 },
  { id: 'scale', label: '7–12 γήπεδα', upTo: 12, monthly: 99 },
  { id: 'platform_custom', label: 'Πάνω από 12 γήπεδα', upTo: null, monthly: null, custom: true },
];

const academyTiers = [
  { id: 'academy_s', label: 'Έως 40 αθλητές', upTo: 40, monthly: 19 },
  { id: 'academy_m', label: '41–120 αθλητές', upTo: 120, monthly: 49 },
  { id: 'academy_l', label: '121–250 αθλητές', upTo: 250, monthly: 89 },
  { id: 'academy_xl', label: '251–500 αθλητές', upTo: 500, monthly: 139 },
  { id: 'academy_custom', label: 'Πάνω από 500 αθλητές', upTo: null, monthly: null, custom: true },
];

const VAT = 0.24;
const DISCOUNTS = { 1: 0, 6: 0.07, 12: 0.12 };
const TRIAL_DAYS = 30;

const resolveTier = (tiers, q) => tiers.find((t) => t.upTo === null || q <= t.upTo);

function priceFor(usage, duration) {
  const platformTier = resolveTier(platformTiers, usage.pitches);
  const academyTier = usage.hasAcademy ? resolveTier(academyTiers, usage.athletes) : null;
  const requiresContact = !!platformTier.custom || !!(academyTier && academyTier.custom);
  const base = requiresContact ? 0 : (platformTier.monthly || 0) + (academyTier ? academyTier.monthly : 0);
  const discounted = base * (1 - DISCOUNTS[duration]);
  return {
    platformTier,
    academyTier,
    requiresContact,
    monthlyWithVat: discounted * (1 + VAT),
    totalWithVat: discounted * duration * (1 + VAT),
    discountPercent: Math.round(DISCOUNTS[duration] * 100),
  };
}

/**
 * Μετράει το μέγεθος με τον ΙΔΙΟ ορισμό που χρησιμοποιεί η εφαρμογή
 * (βλ. src/lib/venue-usage.ts): αθλητής = όποιος έχει ίχνος διαχείρισης
 * ως αθλητής — τμήμα, πληρωμή ή αξιολόγηση. Όχι η κατηγορία, που την
 * ελέγχει ο πελάτης.
 */
async function measureUsage(db, venueId) {
  const [pitches, groups, users, payments, evals] = await Promise.all([
    db.collection('yabalitsa_pitches').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_user_groups').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_academy_users').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_academy_payments').where('venueId', '==', venueId).get(),
    db.collection('yabalitsa_player_evaluations').where('venueId', '==', venueId).get(),
  ]);

  const activePitches = pitches.docs.filter((d) => d.data().active !== false);

  const paidUserIds = new Set(payments.docs.map((d) => d.data().userId).filter(Boolean));
  const evaluatedUserIds = new Set(
    evals.docs.map((d) => d.data().userId || d.data().athleteId).filter(Boolean)
  );

  const athletes = users.docs.filter((d) => {
    const u = d.data();
    const inSquad = !!(u.squad_id || (Array.isArray(u.squad_ids) && u.squad_ids.length > 0));
    return inSquad || paidUserIds.has(d.id) || evaluatedUserIds.has(d.id);
  });

  const athleteGroupIds = new Set(
    groups.docs.filter((g) => (g.data().capabilities || []).includes('squad_assignment')).map((g) => g.id)
  );

  return {
    pitches: activePitches.length,
    athletes: athletes.length,
    hasAcademy: users.size > 0 || groups.size > 0,
    _docs: { pitches, groups, users, activePitches, athletes, athleteGroupIds },
  };
}

/** Αναλογική διαφορά όταν η χρήση ξεπέρασε ό,τι πληρώθηκε. */
function upgradeOwed(usage, billed, daysRemaining) {
  const cur = priceFor(usage, 1);
  const currentBase = cur.requiresContact
    ? 0
    : (cur.platformTier.monthly || 0) + (cur.academyTier ? cur.academyTier.monthly : 0);
  if (!billed || daysRemaining <= 0 || cur.requiresContact || currentBase <= billed.monthlyBase) {
    return { owed: false, amountWithVat: 0, billedBase: billed ? billed.monthlyBase : currentBase, currentBase };
  }
  const extra = currentBase - billed.monthlyBase;
  const amount = extra * (1 - billed.discountPercent / 100) * (daysRemaining / 30) * (1 + VAT);
  return { owed: true, amountWithVat: amount, billedBase: billed.monthlyBase, currentBase };
}

/** Καλύπτει το πληρωμένο πλάνο μια υποθετική χρήση; */
function coveredByBilled(usage, billed) {
  if (!billed) return true;
  if (resolveTier(platformTiers, usage.pitches).id !== billed.platformTierId) return false;
  if (!usage.hasAcademy) return true;
  return resolveTier(academyTiers, usage.athletes).id === billed.academyTierId;
}

/** Τι κοστίζει να ξεκλειδώσει η επόμενη εγγραφή. */
function unlockCost(usage, billed, days, target) {
  const hyp = {
    pitches: target.pitches ?? usage.pitches,
    athletes: target.athletes ?? usage.athletes,
    hasAcademy: usage.hasAcademy || (target.athletes ?? 0) > 0,
  };
  return upgradeOwed(hyp, billed, days);
}

const eur = (n) =>
  '€' + n.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

module.exports = {
  admin, init, findVenue, measureUsage, priceFor, resolveTier,
  platformTiers, academyTiers, SELF_SERVE_LIMITS, TRIAL_DAYS, VAT, DISCOUNTS,
  QA_MARK, eur, ROOT, upgradeOwed, coveredByBilled, unlockCost,
};
