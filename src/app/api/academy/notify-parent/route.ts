import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

const GREEK_MONTHS = [
  '', 'Ιανουάριο', 'Φεβρουάριο', 'Μάρτιο', 'Απρίλιο', 'Μάιο', 'Ιούνιο',
  'Ιούλιο', 'Αύγουστο', 'Σεπτέμβριο', 'Οκτώβριο', 'Νοέμβριο', 'Δεκέμβριο',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentEmail, parentName, athleteName, month, amount, venueName } = body;

    if (!parentEmail || !athleteName || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [year, monthNum] = month.split('-');
    const monthName = GREEK_MONTHS[parseInt(monthNum)] || month;

    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0a7e4a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Yabalitsa</h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">Υπενθύμιση Πληρωμής</p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="color: #1e293b; font-size: 16px; margin: 0;">
              Αγαπητέ/ή ${parentName || 'Γονέα'},
            </p>
            <p style="color: #64748b; font-size: 16px; margin: 12px 0 0 0;">
              Σας ενημερώνουμε ότι η μηνιαία συνδρομή του/της <strong style="color: #1e293b;">${athleteName}</strong>
              για τον μήνα <strong style="color: #1e293b;">${monthName} ${year}</strong> δεν έχει ακόμα εξοφληθεί.
            </p>
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Οφειλόμενο Ποσό</p>
            <div style="font-size: 36px; font-weight: 700; color: #dc2626; margin: 0;">
              &euro;${amount}
            </div>
            <p style="color: #b91c1c; font-size: 13px; margin: 8px 0 0 0;">
              ${monthName} ${year}
            </p>
          </div>

          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">
            Παρακαλούμε τακτοποιήστε τη συνδρομή το συντομότερο δυνατό.
            Για οποιαδήποτε απορία, επικοινωνήστε μαζί μας.
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
      to: parentEmail,
      subject: `Υπενθύμιση Πληρωμής - ${athleteName} (${monthName} ${year})`,
      html,
    });

    return NextResponse.json({ success: result.success, provider: result.provider });
  } catch (error) {
    console.error('Notify parent error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
