import { NextResponse } from 'next/server';
import { consumeVerificationCode } from '@/lib/verification-storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body as { email?: string; code?: string };
    if (!email || !code) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

    const result = await consumeVerificationCode(email, code);
    if (!result.ok) {
      const status = result.error === 'too_many_attempts' ? 429 : 400;
      return NextResponse.json(
        { error: result.error, ...(result.attemptsRemaining !== undefined && { attemptsRemaining: result.attemptsRemaining }) },
        { status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('verification/verify error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
