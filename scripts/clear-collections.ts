/**
 * Clear all Firestore collections with prefix "yabalitsa_"
 *
 * Usage: npx tsx scripts/clear-collections.ts
 *
 * Add --dry-run to preview without deleting:
 *   npx tsx scripts/clear-collections.ts --dry-run
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const app = initializeApp({
  credential: cert(
    path.join(process.cwd(), process.env.FIREBASE_ADMIN_KEY_PATH!)
  ),
});

const db = getFirestore(app);
const dryRun = process.argv.includes('--dry-run');

const BATCH_SIZE = 500;

async function deleteCollection(collectionPath: string): Promise<number> {
  const collectionRef = db.collection(collectionPath);
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));

    if (!dryRun) {
      await batch.commit();
    }
    totalDeleted += snapshot.size;

    if (snapshot.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}

async function main() {
  console.log(dryRun ? '\n🔍 DRY RUN — no data will be deleted\n' : '\n🗑️  Clearing yabalitsa_ collections...\n');

  // List all collections
  const collections = await db.listCollections();
  const yabalitsaCollections = collections
    .filter((col) => col.id.startsWith('yabalitsa_'))
    .map((col) => col.id)
    .sort();

  if (yabalitsaCollections.length === 0) {
    console.log('No collections with prefix "yabalitsa_" found.');
    process.exit(0);
  }

  console.log(`Found ${yabalitsaCollections.length} collections:\n`);

  let grandTotal = 0;

  for (const name of yabalitsaCollections) {
    const count = await deleteCollection(name);
    grandTotal += count;
    const action = dryRun ? 'would delete' : 'deleted';
    console.log(`  ${dryRun ? '📋' : '✅'} ${name} — ${action} ${count} docs`);
  }

  console.log(`\n${dryRun ? 'Total to delete' : 'Total deleted'}: ${grandTotal} documents across ${yabalitsaCollections.length} collections.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
