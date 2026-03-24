import { NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email-service';

// Simple in-memory rate limit: max 5 emails per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      pitchName,
      venueName,
      venuePhone,
      venueEmail,
      venueAddress,
      date,
      time,
      price
    } = body as {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      pitchName: string;
      venueName: string;
      venuePhone?: string;
      venueEmail?: string;
      venueAddress?: string;
      date: string;
      time: string;
      price: number;
    };

    if (!firstName || !lastName || !email || !phone || !pitchName || !venueName || !date || !time || !price) {
      return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    // Send confirmation email
    const template = emailTemplates.bookingConfirmation({
      firstName,
      lastName,
      email,
      phone,
      pitchName,
      venueName,
      venuePhone,
      venueEmail,
      venueAddress,
      date,
      time,
      price
    });

    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (!result.success) {
      console.error('Failed to send confirmation email:', result.error);
      // Don't fail the booking if email fails
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('booking/finalize error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
