import { getAdminDb } from './firebase-admin';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface EmailLog {
  to: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: number;
  provider: 'resend' | 'console';
}

// Send email with multiple providers and logging
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; provider: string; error?: string }> {
  const { to, subject, html, from = 'Yabalitsa <no-reply@yabalitsa.com>' } = options;
  
  // Try Resend first (production)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html
        })
      });

      if (response.ok) {
        await response.json();
        await logEmail({ to, subject, status: 'sent', timestamp: Date.now(), provider: 'resend' });
        return { success: true, provider: 'resend' };
      } else {
        const error = await response.text();
        await logEmail({ to, subject, status: 'failed', error, timestamp: Date.now(), provider: 'resend' });
        throw new Error(`Resend failed: ${error}`);
      }
    } catch (error) {
      console.error('Resend email failed:', error);
      // Fall through to console logging
    }
  }

  // Fallback: Console logging (development)
  console.log('📧 EMAIL (Development Mode):', {
    to,
    subject,
    html: html.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
  });
  
  await logEmail({ to, subject, status: 'sent', timestamp: Date.now(), provider: 'console' });
  return { success: true, provider: 'console' };
}

// Log email attempts to Firestore
async function logEmail(log: EmailLog) {
  const db = getAdminDb();
  if (db) {
    try {
      await db.collection('email_logs').add(log);
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }
}

// Email templates
export const emailTemplates = {
  verification: (firstName: string, code: string) => ({
    subject: 'Ο κωδικός επιβεβαίωσης σας - Yabalitsa',
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0a7e4a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Yabalitsa</h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">Επιβεβαίωση Email</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <p style="color: #1e293b; font-size: 16px; margin: 0;">
              Γεια σου${firstName ? ` ${firstName}` : ''}! 🎉
            </p>
            <p style="color: #64748b; font-size: 16px; margin: 8px 0 0 0;">
              Ο κωδικός επιβεβαίωσης για την κράτησή σας είναι:
            </p>
          </div>

          <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 36px; letter-spacing: 8px; font-weight: 700; color: #0a7e4a; margin: 0;">
              ${code}
            </div>
            <p style="color: #059669; font-size: 14px; margin: 12px 0 0 0;">
              Ισχύει για 10 λεπτά
            </p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              ⚠️ <strong>Σημαντικό:</strong> Αν δεν ζήτησες εσύ αυτόν τον κωδικό, αγνόησε αυτό το μήνυμα.
            </p>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              Ευχαριστούμε που επιλέξατε το Yabalitsa!
            </p>
          </div>
        </div>
      </div>
    `
  }),

  bookingConfirmation: (bookingData: {
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
  }) => ({
    subject: 'Επιβεβαίωση Κράτησης - Yabalitsa',
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0a7e4a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Yabalitsa</h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">Η κράτησή σας επιβεβαιώθηκε!</p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="color: #1e293b; font-size: 16px; margin: 0;">
              Γεια σου ${bookingData.firstName}! 🎉
            </p>
            <p style="color: #64748b; font-size: 16px; margin: 8px 0 0 0;">
              Η κράτησή σας για το γήπεδο επιβεβαιώθηκε με επιτυχία.
            </p>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #0a7e4a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Στοιχεία Κράτησης</h2>
            
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #374151; font-weight: 500;">Γήπεδο:</span>
                <span style="color: #1e293b; font-weight: 600;">${bookingData.pitchName}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #374151; font-weight: 500;">Χώρος:</span>
                <span style="color: #1e293b; font-weight: 600;">${bookingData.venueName}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #374151; font-weight: 500;">Ημερομηνία:</span>
                <span style="color: #1e293b; font-weight: 600;">${bookingData.date}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #374151; font-weight: 500;">Ώρα:</span>
                <span style="color: #1e293b; font-weight: 600;">${bookingData.time}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #d1fae5; padding-top: 12px; margin-top: 8px;">
                <span style="color: #0a7e4a; font-weight: 600; font-size: 18px;">Συνολικό Ποσό:</span>
                <span style="color: #0a7e4a; font-weight: 700; font-size: 20px;">€${bookingData.price}</span>
              </div>
            </div>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Στοιχεία Επικοινωνίας</h3>
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              <strong>Όνομα:</strong> ${bookingData.firstName} ${bookingData.lastName}<br>
              <strong>Email:</strong> ${bookingData.email}<br>
              <strong>Τηλέφωνο:</strong> +30 ${bookingData.phone}
            </p>
          </div>

          <!-- Venue Contact Info -->
          <div style="background: #e0f2fe; border: 1px solid #b3e5fc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #0277bd; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📞 Στοιχεία Γηπέδου</h3>
            <p style="color: #01579b; font-size: 14px; margin: 0;">
              <strong>Γήπεδο:</strong> ${bookingData.venueName}<br>
              ${bookingData.venueAddress ? `<strong>Διεύθυνση:</strong> ${bookingData.venueAddress}<br>` : ''}
              ${bookingData.venuePhone ? `<strong>Τηλέφωνο:</strong> ${bookingData.venuePhone}<br>` : ''}
              ${bookingData.venueEmail ? `<strong>Email:</strong> ${bookingData.venueEmail}` : ''}
            </p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">⚠️ Σημαντικές Οδηγίες</h3>
            <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 20px;">
              <li>Παρακαλώ φτάστε 10 λεπτά πριν την ώρα της κράτησης</li>
              <li>Σε περίπτωση ακύρωσης, επικοινωνήστε μαζί μας τουλάχιστον 2 ώρες νωρίτερα</li>
              <li>Η πληρωμή γίνεται κατά την άφιξή σας στον χώρο</li>
            </ul>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
              Ευχαριστούμε που επιλέξατε το Yabalitsa!
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Αυτό το email στάλθηκε αυτόματα. Παρακαλώ μην απαντάτε σε αυτό το μήνυμα.
            </p>
          </div>
        </div>
      </div>
    `
  }),

  welcome: (firstName: string) => ({
    subject: 'Καλώς ήρθες στο Yabalitsa! 🎉',
    html: `
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Καλώς ήρθες στο Yabalitsa</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F4F8; font-family: 'Roboto', Arial, sans-serif; color: #040D12; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #040D12; padding: 32px 40px; text-align: center; }
    .header img { height: 36px; }
    .hero { background-color: #74EE16; padding: 48px 40px 40px; text-align: center; }
    .hero h1 { font-family: 'Inter', Arial, sans-serif; font-size: 32px; font-weight: 800; color: #040D12; margin: 0 0 12px; line-height: 1.2; }
    .hero p { font-size: 16px; color: #040D12; margin: 0; opacity: 0.85; }
    .body-section { padding: 40px 40px 0; }
    .body-section p { font-size: 15px; line-height: 1.7; color: #040D12; margin: 0 0 20px; }
    .feature-block { background-color: #F1F4F8; border-left: 4px solid #74EE16; border-radius: 0 8px 8px 0; padding: 20px 24px; margin: 0 0 16px; }
    .feature-block h3 { font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #040D12; margin: 0 0 6px; }
    .feature-block p { font-size: 14px; color: #3a4a55; margin: 0; line-height: 1.6; }
    .cta-section { padding: 36px 40px; text-align: center; }
    .cta-button { display: inline-block; background-color: #74EE16; color: #000000; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 40px; border-radius: 16px; letter-spacing: 0.3px; }
    .cta-subtext { font-size: 13px; color: #7a8a94; margin-top: 12px; }
    .tips-section { padding: 0 40px 40px; }
    .tips-section h2 { font-family: 'Inter', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #040D12; margin: 0 0 20px; }
    .tip-row { display: flex; align-items: flex-start; margin-bottom: 16px; }
    .tip-number { background-color: #74EE16; color: #000; font-family: 'Inter', Arial, sans-serif; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 14px; margin-top: 2px; }
    .tip-text { font-size: 14px; color: #040D12; line-height: 1.6; }
    .divider { border: none; border-top: 1px solid #e8ecf0; margin: 0 40px; }
    .footer { padding: 28px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #9aa5af; margin: 0 0 6px; line-height: 1.6; }
    .footer a { color: #74EE16; text-decoration: none; }
    .countdown { background-color: #040D12; color: #74EE16; font-family: 'Inter', Arial, sans-serif; font-size: 13px; font-weight: 700; text-align: center; padding: 10px; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Header -->
    <div class="header">
      <img src="https://www.yabalitsa.com/_next/image?url=%2Fyabalo.png&w=384&q=75" alt="Yabalitsa" />
    </div>

    <!-- Countdown bar -->
    <div class="countdown">⏱ Η δωρεάν δοκιμή σου: 15 ημέρες — ξεκίνησε τώρα</div>

    <!-- Hero -->
    <div class="hero">
      <h1>Καλώς ήρθες στο Yabalitsa! 🎉</h1>
      <p>Το γήπεδό σου μόλις μπήκε στη νέα εποχή της ψηφιακής διαχείρισης.</p>
    </div>

    <!-- Body intro -->
    <div class="body-section">
      <p>Γεια σου ${firstName},</p>
      <p>Χαιρόμαστε που είσαι μαζί μας! Έχεις μπροστά σου <strong>15 ημέρες δωρεάν πρόσβαση</strong> σε όλες τις λειτουργίες του Yabalitsa — χωρίς πιστωτική κάρτα, χωρίς δεσμεύσεις.</p>
      <p>Για να αξιοποιήσεις στο έπακρο τη δοκιμαστική σου περίοδο, θέλαμε να σου παρουσιάσουμε τα <strong>3 πιο δυνατά χαρακτηριστικά</strong> που οι πελάτες μας αγαπούν περισσότερο:</p>
    </div>

    <!-- Features -->
    <div class="body-section" style="padding-top: 0;">

      <div class="feature-block">
        <h3>📅 Αστραπιαίες Κρατήσεις</h3>
        <p>Διαχειρίσου όλες τις κρατήσεις γηπέδων από ένα έξυπνο ημερολόγιο. Αυτόματος έλεγχος διαθεσιμότητας, QR check-in και ξεκάθαρη εικόνα του τζίρου σε πραγματικό χρόνο — από το κινητό σου.</p>
      </div>

      <div class="feature-block">
        <h3>🏃 Player Passport</h3>
        <p>Κάθε αθλητής έχει τη δική του ψηφιακή καρτέλα: πληρωμές, ιατρικά πιστοποιητικά (με αυτόματες ειδοποιήσεις λήξης), αξιολογήσεις και ομαδοποίηση σε squads. Ποτέ ξανά "ποιος χρωστάει;"</p>
      </div>

      <div class="feature-block">
        <h3>📊 Business Στατιστικά</h3>
        <p>Το reports dashboard σου δείχνει έσοδα από κρατήσεις και ακαδημίες σε πραγματικό χρόνο, πληρότητα γηπέδων ανά μέρα/ώρα και ανάλυση που σε βοηθά να παίρνεις καλύτερες αποφάσεις.</p>
      </div>

    </div>

    <!-- CTA -->
    <div class="cta-section">
      <a href="https://yabalitsa.com" class="cta-button">Μπες στο Dashboard →</a>
      <p class="cta-subtext">Χρειάζεσαι βοήθεια; Απάντησε σε αυτό το email — είμαστε εδώ.</p>
    </div>

    <hr class="divider" />

    <!-- Quick start tips -->
    <div class="tips-section">
      <h2>3 βήματα για γρήγορη εκκίνηση</h2>

      <div class="tip-row">
        <span class="tip-number">1</span>
        <span class="tip-text"><strong>Πρόσθεσε τα γήπεδά σου</strong> — ρύθμισε τιμοκατάλογο ανά γήπεδο (5x5, 7x7, 11x11) and ώρες διαθεσιμότητας.</span>
      </div>
      <div class="tip-row">
        <span class="tip-number">2</span>
        <span class="tip-text"><strong>Κάνε την πρώτη σου κράτηση</strong> — δοκίμασε το ημερολόγιο και δες πόσο γρήγορα γίνεται από το κινητό.</span>
      </div>
      <div class="tip-row">
        <span class="tip-number">3</span>
        <span class="tip-text"><strong>Πρόσθεσε έναν αθλητή</strong> — δημιούργησε το πρώτο Player Passport και εξερεύνησε τη λειτουργία της Ακαδημίας.</span>
      </div>
    </div>

    <hr class="divider" />

    <!-- Footer -->
    <div class="footer">
      <p>© 2026 Yabalitsa. Όλα τα δικαιώματα διατηρούνται.</p>
      <p><a href="https://yabalitsa.com">yabalitsa.com</a></p>
    </div>

  </div>
</body>
</html>
    `
  })
};
