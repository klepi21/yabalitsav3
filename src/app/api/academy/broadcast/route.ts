import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipients, subject, message, venueName } = body as {
      recipients: { email: string; name: string }[];
      subject: string;
      message: string;
      venueName: string;
    };

    if (!recipients?.length || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0a7e4a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Yabalitsa</h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">${venueName || 'Ακαδημία'}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">${subject}</h2>
            <div style="color: #475569; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0;">${venueName || 'Η Ακαδημία σας'}</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Αυτό το email στάλθηκε μέσω Yabalitsa</p>
          </div>
        </div>
      </div>
    `;

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await sendEmail({ to: recipient.email, subject, html });
        sent++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: recipients.length });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}
