import { NextResponse } from 'next/server';
import { getVerificationCode, deleteVerificationCode, incrementAttempts } from '@/lib/verification-storage';

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body as { email?: string; code?: string };
    if (!email || !code) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

    const stored = await getVerificationCode(email);
    if (!stored) return NextResponse.json({ error: 'not_found' }, { status: 400 });

    // Check if locked out due to too many attempts
    if (stored.attempts >= MAX_ATTEMPTS) {
      await deleteVerificationCode(email);
      return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }

    if (Date.now() > stored.expiresAt) {
      await deleteVerificationCode(email);
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    if (String(stored.code) !== String(code)) {
      await incrementAttempts(email);
      const remaining = MAX_ATTEMPTS - stored.attempts - 1;
      return NextResponse.json(
        { error: 'invalid_code', attemptsRemaining: remaining },
        { status: 400 }
      );
    }

    await deleteVerificationCode(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('verification/verify error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


