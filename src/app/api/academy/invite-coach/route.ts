import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { db, verifyAuth, isAuthError } from '@/lib/api-auth';

const adminAuth = getAuth();

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const body = await request.json();
    const {
      email,
      name,
      venueId,
      venueName,
      academyUserId,
      assignedSquadIds,
      coachViewMode,
    } = body;

    if (!email || !name || !venueId || !academyUserId) {
      return NextResponse.json({ error: 'Λείπουν υποχρεωτικά πεδία' }, { status: 400 });
    }

    // Verify user is owner of this venue (only admins can invite coaches)
    const venueDoc = await db.collection('yabalitsa_venues').doc(venueId).get();
    if (!venueDoc.exists || venueDoc.data()?.ownerId !== authResult.decodedToken.uid) {
      return NextResponse.json(
        { error: 'Unauthorized: only venue owners can invite coaches' },
        { status: 403 }
      );
    }

    // Check if a VenueOwner with this email already exists
    const existingOwner = await db.collection('yabalitsa_venueOwners')
      .where('email', '==', email)
      .where('venueId', '==', venueId)
      .get();

    if (!existingOwner.empty) {
      return NextResponse.json(
        { error: 'Αυτός ο χρήστης έχει ήδη λογαριασμό σε αυτό το venue' },
        { status: 409 }
      );
    }

    // Generate a random password
    const tempPassword = generatePassword();

    // Create Firebase Auth account
    let userRecord;
    try {
      // Check if auth account already exists
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      // User doesn't exist — create new
      userRecord = await adminAuth.createUser({
        email,
        password: tempPassword,
        displayName: name,
      });
    }

    // Create VenueOwner document with coach role
    await db.collection('yabalitsa_venueOwners').add({
      venueId,
      email,
      name,
      phone: '',
      role: 'coach',
      permissions: [],
      academyUserId,
      assignedSquadIds: assignedSquadIds || [],
      coachViewMode: coachViewMode || 'own_squads',
      firebaseUid: userRecord.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Generate password reset link for the coach to set their own password
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    // Send invitation email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Yabalitsa <no-reply@yabalitsa.com>',
            to: email,
            subject: `Πρόσκληση - ${venueName || 'Yabalitsa'}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <h1 style="color: #059669; font-size: 28px; margin: 0;">Yabalitsa</h1>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Πλατφόρμα Διαχείρισης Ακαδημίας</p>
                </div>

                <div style="background: #f8fafc; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
                  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 16px 0;">
                    Γεια σου ${name}!
                  </h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                    Σε προσκαλούμε ως <strong style="color: #2563eb;">Προπονητή</strong> στην πλατφόρμα
                    <strong>${venueName || 'Yabalitsa'}</strong>.
                  </p>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Μέσω της πλατφόρμας θα μπορείς να:
                  </p>
                  <ul style="color: #475569; font-size: 15px; line-height: 2; padding-left: 20px; margin: 0 0 24px 0;">
                    <li>Βλέπεις τα τμήματα και τους αθλητές σου</li>
                    <li>Διαχειρίζεσαι τις προπονήσεις</li>
                    <li>Κρατάς απουσιολόγιο</li>
                    <li>Αξιολογείς τους αθλητές</li>
                    <li>Στέλνεις ανακοινώσεις στους γονείς</li>
                  </ul>
                </div>

                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${resetLink}"
                     style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 700;">
                    Ορισμός Κωδικού & Σύνδεση
                  </a>
                </div>

                <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
                  Αν δεν ζήτησες αυτή την πρόσκληση, αγνόησε αυτό το email.
                </p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error('Email send error:', err);
        // Don't fail the invitation if email fails
      }
    } else {
      console.log('[Coach Invite] No RESEND_API_KEY, password reset link:', resetLink);
    }

    return NextResponse.json({
      success: true,
      message: 'Η πρόσκληση στάλθηκε',
      resetLink: !resendKey ? resetLink : undefined,
    });
  } catch (error: unknown) {
    console.error('Coach invitation error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Αποτυχία πρόσκλησης' },
      { status: 500 }
    );
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
