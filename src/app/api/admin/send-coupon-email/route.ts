import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isAuthError } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email-service';

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL || 'nikoskoukis99@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    if (authResult.decodedToken.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { recipientEmail, recipientName, subject, body } = await request.json();

    if (!recipientEmail || !subject || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #18181b, #27272a); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #10b981; font-size: 22px; font-weight: 800; margin: 0 0 4px;">⚽ Yabalitsa</h1>
          <p style="color: #71717a; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Ειδική Προσφορά</p>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          ${recipientName ? `<p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Αγαπητέ/ή <strong>${recipientName}</strong>,</p>` : ''}
          <div style="color: #374151; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${body}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Yabalitsa — Διαχείριση Αθλητικών Κέντρων & Ακαδημιών
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Coupon email error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
