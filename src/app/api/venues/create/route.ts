import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/api-auth';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, emailTemplates } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const body = await request.json();

    const {
      venueName,
      venueAddress,
      venueCity,
      venueEmail,
      venuePhone,
      venueAfm,
      venueDoy,
      ownerName,
      ownerEmail,
      ownerPhone,
      plan = 'trial',
    } = body;

    // Validate required fields
    if (!venueName || !venueAddress || !venueCity || !venueAfm || !ownerName || !ownerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create venue document
    const venueDocRef = await db.collection('yabalitsa_venues').add({
      name: venueName,
      address: venueAddress,
      city: venueCity,
      contactDetails: {
        email: venueEmail || '',
        phone: venuePhone || '',
      },
      ownerId: uid,
      plan: plan,
      active: true,
      bookingsEnabled: true,
      tax: {
        afm: venueAfm,
        doy: venueDoy || '',
      },
      coupons: [],
      daysRemaining: 15,
      lastDecrementAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create venue owner profile
    await db.collection('yabalitsa_venueOwners').add({
      venueId: venueDocRef.id,
      email: ownerEmail,
      name: ownerName,
      phone: ownerPhone || '',
      role: 'admin',
      permissions: ['manage:all'],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send Telegram notification (non-blocking, skip in development)
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && process.env.NODE_ENV !== 'development') {
      const text = [
        `\u{1F389} *Νέα Εγγραφή Venue!*`,
        '',
        `\u{1F3DF} *Venue:* ${venueName}`,
        `\u{1F4CD} *Πόλη:* ${venueCity}`,
        `\u{1F464} *Ιδιοκτήτης:* ${ownerName}`,
        `\u{1F4E7} *Email:* ${ownerEmail}`,
        `\u{1F4DE} *Τηλέφωνο:* ${ownerPhone || 'N/A'}`,
        `\u{1F4CB} *ΑΦΜ:* ${venueAfm}`,
        '',
        `_${new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}_`,
      ].join('\n');

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
      }).catch((err) => console.warn('Telegram notification failed:', err));
    }

    // Send Welcome Email (non-blocking)
    const welcomeEmail = emailTemplates.welcome(ownerName);
    sendEmail({
      to: ownerEmail,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html
    }).catch((err) => console.warn('Welcome email failed:', err));

    return NextResponse.json(
      {
        success: true,
        venueId: venueDocRef.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create venue' },
      { status: 500 }
    );
  }
}
