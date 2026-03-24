import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';
import { verifyAuth, verifyVenueAccess, isAuthError } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const body = await request.json();
    const {
      captainEmail, captainName, teamName,
      opponentName, matchDate, matchTime,
      tournamentName, venueName, type, venueId,
    } = body;

    if (!captainEmail || !teamName || !venueId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const accessError = await verifyVenueAccess(venueId, authResult.decodedToken);
    if (accessError) return accessError;

    let subject = '';
    let html = '';

    const headerStyle = `background: linear-gradient(135deg, #18181b, #27272a); padding: 32px; text-align: center;`;
    const containerStyle = `font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;`;
    const cardStyle = `background: white; border-radius: 16px; padding: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;`;

    if (type === 'next_match') {
      subject = `⚽ Επόμενος Αγώνας: ${teamName} vs ${opponentName}`;
      html = `
        <div style="${containerStyle}">
          <div style="${cardStyle}">
            <div style="${headerStyle}">
              <h1 style="color: #10b981; font-size: 20px; font-weight: 800; margin: 0;">⚽ ${tournamentName}</h1>
              <p style="color: #71717a; font-size: 12px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 2px;">Ειδοποίηση Αγώνα</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #1e293b; font-size: 15px; margin: 0 0 20px;">
                Αγαπητέ/ή <strong>${captainName || 'Αρχηγέ'}</strong>,
              </p>
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">Επόμενος Αγώνας</p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
                  <div style="text-align: center;">
                    <p style="font-size: 18px; font-weight: 800; color: #18181b; margin: 0;">${teamName}</p>
                  </div>
                  <div style="background: #18181b; color: white; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 800;">VS</div>
                  <div style="text-align: center;">
                    <p style="font-size: 18px; font-weight: 800; color: #18181b; margin: 0;">${opponentName}</p>
                  </div>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #374151; font-size: 14px; font-weight: 700; margin: 0;">
                    📅 ${matchDate}${matchTime ? ` &nbsp;⏰ ${matchTime}` : ''}
                  </p>
                </div>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin: 0;">
                Παρακαλούμε βεβαιωθείτε ότι η ομάδα σας θα είναι έτοιμη. Καλή επιτυχία!
              </p>
            </div>
            <div style="padding: 16px 32px; background: #fafafa; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">${venueName || ''} — Yabalitsa</p>
            </div>
          </div>
        </div>
      `;
    } else if (type === 'result') {
      const { homeScore, awayScore, homeTeam, awayTeam } = body;
      const won = (homeTeam === teamName && homeScore > awayScore) || (awayTeam === teamName && awayScore > homeScore);
      const drew = homeScore === awayScore;
      subject = `⚽ Αποτέλεσμα: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`;
      html = `
        <div style="${containerStyle}">
          <div style="${cardStyle}">
            <div style="${headerStyle}">
              <h1 style="color: #10b981; font-size: 20px; font-weight: 800; margin: 0;">⚽ ${tournamentName}</h1>
              <p style="color: #71717a; font-size: 12px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 2px;">Αποτέλεσμα Αγώνα</p>
            </div>
            <div style="padding: 32px;">
              <div style="background: ${won ? '#f0fdf4' : drew ? '#fffbeb' : '#fef2f2'}; border: 1px solid ${won ? '#bbf7d0' : drew ? '#fde68a' : '#fecaca'}; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="font-size: 12px; font-weight: 800; color: ${won ? '#166534' : drew ? '#92400e' : '#991b1b'}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">
                  ${won ? 'ΝΙΚΗ!' : drew ? 'ΙΣΟΠΑΛΙΑ' : 'ΗΤΤΑ'}
                </p>
                <p style="font-size: 16px; font-weight: 700; color: #374151; margin: 0 0 8px;">${homeTeam} vs ${awayTeam}</p>
                <p style="font-size: 36px; font-weight: 800; color: #18181b; margin: 0;">${homeScore} - ${awayScore}</p>
              </div>
            </div>
            <div style="padding: 16px 32px; background: #fafafa; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">${venueName || ''} — Yabalitsa</p>
            </div>
          </div>
        </div>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const result = await sendEmail({ to: captainEmail, subject, html });
    return NextResponse.json({ success: result.success, provider: result.provider });
  } catch (error) {
    console.error('Tournament notify error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
