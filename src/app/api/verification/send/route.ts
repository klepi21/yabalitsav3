import { NextResponse } from 'next/server';
import { storeVerificationCode } from '@/lib/verification-storage';
import { sendEmail, emailTemplates } from '@/lib/email-service';

// Rate limit: max 3 sends per email per 10 minutes
const sendLimitMap = new Map<string, { count: number; resetAt: number }>();
const SEND_LIMIT_MAX = 3;
const SEND_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isSendLimited(email: string): boolean {
  const now = Date.now();
  const entry = sendLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    sendLimitMap.set(email, { count: 1, resetAt: now + SEND_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > SEND_LIMIT_MAX;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName } = body as { email?: string; firstName?: string };
    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

    // Rate limit per email
    if (isSendLimited(email)) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
    }

    const code = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store verification code (Firestore in production, memory in development)
    await storeVerificationCode(email, code, expiresAt);

    const template = emailTemplates.verification(firstName || '', code);
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (!result.success) {
      throw new Error(`Email sending failed: ${result.error}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('verification/send error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


