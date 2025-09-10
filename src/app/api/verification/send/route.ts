import { NextResponse } from 'next/server';
import { storeVerificationCode } from '@/lib/verification-storage';
import { sendEmail, emailTemplates } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName } = body as { email?: string; firstName?: string };
    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

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


