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
  })
};
