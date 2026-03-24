/**
 * IDOR Vulnerability Test
 *
 * Proves that an authenticated user can access ANY venue's data
 * by simply changing the venueId in the request body.
 *
 * Usage:
 *   1. Login to the app in your browser
 *   2. Open DevTools → Console → run:
 *      copy(await firebase.auth().currentUser.getIdToken())
 *   3. Paste the token below
 *   4. Run: npx tsx scripts/test-idor.ts
 *
 * Or use the browser console method below.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// PASTE YOUR TOKEN HERE (get it from browser DevTools)
const AUTH_TOKEN = process.argv[2] || '';

if (!AUTH_TOKEN) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  IDOR Vulnerability Test                                 ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  To test, you need a Firebase auth token.                ║
║                                                          ║
║  Option 1: Browser Console                               ║
║  1. Login to your app                                    ║
║  2. Open DevTools → Console                              ║
║  3. Run:                                                 ║
║     const { getAuth } = await import('firebase/auth');   ║
║     const token = await getAuth().currentUser             ║
║       .getIdToken();                                     ║
║     console.log(token);                                  ║
║  4. Copy the token                                       ║
║  5. Run: npx tsx scripts/test-idor.ts <TOKEN>            ║
║                                                          ║
║  Option 2: Paste in browser console directly:            ║
║  (see below)                                             ║
╚══════════════════════════════════════════════════════════╝
  `);

  console.log(`\nOR paste this in your browser console to test directly:\n`);
  console.log(`
// === IDOR TEST — paste in browser console ===
(async () => {
  const { getAuth } = await import('/node_modules/firebase/auth/dist/esm/index.esm.js');
  const auth = getAuth();
  const token = await auth.currentUser.getIdToken();

  // Your venue ID (should work)
  const myVenueId = 'YOUR_VENUE_ID'; // replace this

  // A different venue ID (should NOT work, but it does)
  const otherVenueId = 'SOME_OTHER_VENUE_ID'; // replace this

  const endpoints = [
    '/api/customers/get-by-venue',
    '/api/bookings/get-by-venue',
    '/api/pitches/get-by-venue',
    '/api/dashboard/get-data',
  ];

  for (const endpoint of endpoints) {
    // Test with OTHER venue's ID
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ venueId: otherVenueId }),
    });
    const data = await res.json();
    console.log(endpoint, res.status, data.success ? '⚠️ VULNERABLE - got data!' : '✅ Blocked');
  }
})();
  `);
  process.exit(0);
}

// If token provided, run the test
const ENDPOINTS = [
  { path: '/api/customers/get-by-venue', name: 'Customers' },
  { path: '/api/bookings/get-by-venue', name: 'Bookings' },
  { path: '/api/bookings/get-data', name: 'BookingData' },
  { path: '/api/pitches/get-by-venue', name: 'Pitches' },
  { path: '/api/dashboard/get-data', name: 'Dashboard' },
  { path: '/api/reports/get-by-venue', name: 'Reports' },
  { path: '/api/settings/get-data', name: 'Settings' },
  { path: '/api/telegram/send', name: 'Telegram' },
];

// We'll try a fake venueId that doesn't belong to our user
const FAKE_VENUE_ID = 'test-idor-fake-venue-id-12345';

async function testEndpoint(endpoint: { path: string; name: string }, venueId: string) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ venueId }),
    });

    const data = await res.json();
    return { status: res.status, success: data.success, dataKeys: Object.keys(data) };
  } catch (e) {
    return { status: 0, error: (e as Error).message };
  }
}

async function main() {
  console.log('\n🔍 IDOR Vulnerability Test');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Testing with fake venueId: ${FAKE_VENUE_ID}`);
  console.log('='.repeat(60));

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint, FAKE_VENUE_ID);

    if (result.status === 403 || result.status === 401 || result.status === 404) {
      console.log(`✅ ${endpoint.name.padEnd(12)} → ${result.status} BLOCKED (secure)`);
    } else if (result.status === 200) {
      console.log(`⚠️  ${endpoint.name.padEnd(12)} → ${result.status} ACCESSIBLE (VULNERABLE!)`);
    } else {
      console.log(`❓ ${endpoint.name.padEnd(12)} → ${result.status} ${JSON.stringify(result)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('If any endpoint shows ⚠️ VULNERABLE, it means an authenticated');
  console.log('user can access ANY venue data by changing the venueId.');
  console.log('='.repeat(60) + '\n');
}

main();
