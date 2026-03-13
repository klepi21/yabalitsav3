const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
];

console.log('Checking .env.local for Firebase variables...');
let allFound = true;
requiredVars.forEach(v => {
    if (envContent.includes(v)) {
        console.log(`✅ Found ${v}`);
    } else {
        console.warn(`❌ Missing ${v}`);
        allFound = false;
    }
});

if (allFound) {
    console.log('\n🎉 All public Firebase environment variables are correctly set in .env.local');
} else {
    console.error('\n⚠️ Some variables are missing. Building the app might fail or use fallbacks.');
}
