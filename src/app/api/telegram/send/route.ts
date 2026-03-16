import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import path from 'path';

if (!getApps().length) {
  initializeApp({
    credential: cert(
      path.join(process.cwd(), process.env.FIREBASE_ADMIN_KEY_PATH || 'yabalitsa-6f5e8-firebase-adminsdk-fbsvc-c8cc60c683.json')
    ),
  });
}

const auth = getAuth();
const db = getFirestore();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
    }

    const { message, category, venueId, rateLimitHours = 1 } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Rate limit per venue based on plan (enterprise=1h, pro=2h, trial=1h)
    const limitMs = Math.max(1, Number(rateLimitHours) || 1) * 60 * 60 * 1000;
    if (venueId) {
      const cutoff = new Date(Date.now() - limitMs);
      const recentMessages = await db.collection('yabalitsa_support_messages')
        .where('venueId', '==', venueId)
        .where('createdAt', '>', cutoff)
        .limit(1)
        .get();

      if (!recentMessages.empty) {
        const hours = Number(rateLimitHours) || 1;
        return NextResponse.json(
          { error: `Μπορείτε να στείλετε 1 μήνυμα ανά ${hours === 1 ? 'ώρα' : `${hours} ώρες`}. Δοκιμάστε αργότερα.` },
          { status: 429 }
        );
      }
    }

    // Get venue info for context
    let venueName = 'Unknown';
    let venueOwnerName = 'Unknown';
    if (venueId) {
      const venueDoc = await db.collection('yabalitsa_venues').doc(venueId).get();
      if (venueDoc.exists) {
        venueName = venueDoc.data()?.name || 'Unknown';
      }
      const ownerQuery = await db.collection('yabalitsa_venueOwners')
        .where('venueId', '==', venueId)
        .limit(1)
        .get();
      if (!ownerQuery.empty) {
        venueOwnerName = ownerQuery.docs[0].data()?.name || decodedToken.email || 'Unknown';
      }
    }

    const categoryEmoji: Record<string, string> = {
      bug: '\u{1F41B}',
      feature: '\u{1F4A1}',
      question: '\u{2753}',
      urgent: '\u{1F6A8}',
      other: '\u{1F4AC}',
    };

    const categoryLabel: Record<string, string> = {
      bug: 'Bug Report',
      feature: 'Feature Request',
      question: 'Question',
      urgent: 'Urgent',
      other: 'Other',
    };

    const emoji = categoryEmoji[category] || '\u{1F4AC}';
    const label = categoryLabel[category] || 'Message';

    const text = [
      `${emoji} *${label}*`,
      '',
      `*Venue:* ${venueName}`,
      `*From:* ${venueOwnerName}`,
      `*Email:* ${decodedToken.email || 'N/A'}`,
      '',
      message.trim(),
      '',
      `_${new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}_`,
    ].join('\n');

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!telegramRes.ok) {
      const err = await telegramRes.json();
      console.error('Telegram API error:', err);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Log message for rate limiting
    await db.collection('yabalitsa_support_messages').add({
      venueId: venueId || null,
      uid: decodedToken.uid,
      category,
      message: message.trim(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telegram send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send' },
      { status: 500 }
    );
  }
}
