import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyVenueAccess, isAuthError } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const body = await request.json();
    const {
      parentEmail, athleteName, squadName,
      periodLabel, ratings, skills, notes, coachName, venueName, avgRating, venueId,
    } = body;

    if (!parentEmail || !athleteName || !periodLabel || !venueId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const accessError = await verifyVenueAccess(venueId, authResult.decodedToken);
    if (accessError) return accessError;

    // Build ratings HTML table
    const ratingsRows = (skills as { key: string; label: string }[])
      .map((skill) => {
        const rating = (ratings as Record<string, number>)[skill.key] || 0;
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        return `
          <tr>
            <td style="padding: 10px 16px; font-weight: 600; color: #374151; border-bottom: 1px solid #f1f5f9;">${skill.label}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #f59e0b; font-size: 18px; letter-spacing: 2px;">${stars}</span>
            </td>
            <td style="padding: 10px 16px; text-align: center; font-weight: 700; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${rating}/5</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 16px; padding: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 32px; text-align: center;">
            <h1 style="color: #10b981; font-size: 24px; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.5px;">⚽ PLAYER PASSPORT</h1>
            <p style="color: #71717a; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Κάρτα Προόδου Αθλητή</p>
          </div>

          <!-- Player Info -->
          <div style="padding: 24px 32px; background: #fafafa; border-bottom: 1px solid #e5e7eb;">
            <table style="width: 100%;">
              <tr>
                <td style="vertical-align: top;">
                  <h2 style="color: #18181b; font-size: 22px; font-weight: 800; margin: 0 0 4px 0; text-transform: uppercase;">${athleteName}</h2>
                  <p style="color: #71717a; font-size: 14px; margin: 0;">${squadName || ''}</p>
                </td>
                <td style="text-align: right; vertical-align: top;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 12px 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 800; color: #92400e;">${avgRating}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">/ 5.0</div>
                  </div>
                </td>
              </tr>
            </table>
            <div style="margin-top: 12px; display: flex; gap: 16px;">
              <span style="color: #6b7280; font-size: 13px;">📅 <strong>${periodLabel}</strong></span>
              <span style="color: #6b7280; font-size: 13px; margin-left: 16px;">🏋️ <strong>${coachName || ''}</strong></span>
            </div>
          </div>

          <!-- Ratings -->
          <div style="padding: 24px 32px;">
            <h3 style="color: #374151; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Αξιολόγηση Δεξιοτήτων</h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Δεξιότητα</th>
                  <th style="padding: 10px 16px; text-align: center; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Βαθμολογία</th>
                  <th style="padding: 10px 16px; text-align: center; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Βαθμός</th>
                </tr>
              </thead>
              <tbody>
                ${ratingsRows}
              </tbody>
            </table>
          </div>

          ${notes ? `
          <!-- Coach Notes -->
          <div style="padding: 0 32px 24px;">
            <h3 style="color: #374151; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">Σχόλια Προπονητή</h3>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
              <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.6;">${notes}</p>
            </div>
          </div>
          ` : ''}

          <!-- Footer -->
          <div style="padding: 20px 32px; background: #fafafa; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0;">
              ${venueName || 'Η Ακαδημία σας'}
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
              Αυτό το email στάλθηκε μέσω Yabalitsa • ${new Date().toLocaleDateString('el-GR')}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.log('[Evaluation Email] No RESEND_API_KEY, logging to console');
      console.log(`To: ${parentEmail}, Subject: Player Passport - ${athleteName}`);
      return NextResponse.json({ success: true, provider: 'console' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Yabalitsa <no-reply@yabalitsa.com>',
        to: [parentEmail],
        subject: `⚽ Player Passport - ${athleteName} (${periodLabel})`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, provider: 'resend' });
  } catch (error) {
    console.error('Send evaluation error:', error);
    return NextResponse.json({ error: 'Failed to send evaluation' }, { status: 500 });
  }
}
