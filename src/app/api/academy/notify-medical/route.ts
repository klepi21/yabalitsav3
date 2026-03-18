import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientEmail, recipientName, athleteName, expiryDate, status, venueName } = body;

    if (!recipientEmail || !athleteName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedDate = expiryDate
      ? new Date(expiryDate).toLocaleDateString('el-GR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    const isExpired = status === 'expired' || status === 'missing';
    const statusText = isExpired
      ? (formattedDate ? `έληξε στις ${formattedDate}` : 'δεν έχει καταχωρηθεί')
      : `λήγει στις ${formattedDate}`;

    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0a7e4a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Yabalitsa</h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">Ιατρικό Πιστοποιητικό</p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="color: #1e293b; font-size: 16px; margin: 0;">
              Αγαπητέ/ή ${recipientName || 'Γονέα'},
            </p>
            <p style="color: #64748b; font-size: 16px; margin: 12px 0 0 0;">
              Σας ενημερώνουμε ότι το ιατρικό πιστοποιητικό του/της <strong style="color: #1e293b;">${athleteName}</strong>
              ${statusText}.
            </p>
          </div>

          <div style="background: ${isExpired ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${isExpired ? '#fecaca' : '#fde68a'}; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin: 0 0 12px 0;">🏥</div>
            <p style="color: ${isExpired ? '#991b1b' : '#92400e'}; font-size: 16px; font-weight: 700; margin: 0;">
              ${isExpired ? 'Απαιτείται άμεση ανανέωση' : 'Λήγει σύντομα — Ανανεώστε εγκαίρως'}
            </p>
            ${formattedDate ? `<p style="color: ${isExpired ? '#b91c1c' : '#b45309'}; font-size: 14px; margin: 8px 0 0 0;">${formattedDate}</p>` : ''}
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #166534; font-size: 14px; margin: 0;">
              <strong>Σημαντικό:</strong> Η συμμετοχή σε προπονήσεις και αγώνες χωρίς ισχύον ιατρικό πιστοποιητικό δεν επιτρέπεται για λόγους ασφαλείας.
            </p>
          </div>

          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">
            Παρακαλούμε μεριμνήστε για την ανανέωση το συντομότερο δυνατό και ενημερώστε μας.
          </p>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0;">
              ${venueName || 'Η Ακαδημία σας'}
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Αυτό το email στάλθηκε μέσω Yabalitsa
            </p>
          </div>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: recipientEmail,
      subject: `${isExpired ? '⚠️ ' : ''}Ιατρικό Πιστοποιητικό - ${athleteName}`,
      html,
    });

    return NextResponse.json({ success: result.success, provider: result.provider });
  } catch (error) {
    console.error('Notify medical error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
