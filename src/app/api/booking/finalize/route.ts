import { NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
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
