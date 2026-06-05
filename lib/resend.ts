import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy123456789');

const FROM_EMAIL = 'noreply@satish.com.np';
const APP_NAME = 'InboxKura';

// ── Send OTP verification email ───────────────────────────────────────────────
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Your verification code: ${otp}`,
      html: buildOTPEmailHTML(otp, email),
    });

    if (error) throw error;
  } catch (err) {
    console.warn('⚠️ Primary OTP email sending failed, trying with onboarding@resend.dev fallback...', err);
    const { error: fallbackError } = await resend.emails.send({
      from: `${APP_NAME} <onboarding@resend.dev>`,
      to: email,
      subject: `[Fallback] Your verification code: ${otp}`,
      html: buildOTPEmailHTML(otp, email),
    });

    if (fallbackError) {
      console.error('Resend fallback email error (OTP):', fallbackError);
      throw new Error('Failed to send verification email');
    }
  }
}

// ── Send Password Reset OTP email ───────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, otp: string): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Password Reset Code: ${otp}`,
      html: buildOTPEmailHTML(otp, email, 'Password Reset Request', 'Use the code below to reset the password for'),
    });

    if (error) throw error;
  } catch (err) {
    console.warn('⚠️ Primary reset email sending failed, trying fallback...', err);
    const { error: fallbackError } = await resend.emails.send({
      from: `${APP_NAME} <onboarding@resend.dev>`,
      to: email,
      subject: `[Fallback] Password Reset Code: ${otp}`,
      html: buildOTPEmailHTML(otp, email, 'Password Reset Request', 'Use the code below to reset the password for'),
    });

    if (fallbackError) {
      console.error('Resend fallback email error (Reset):', fallbackError);
      throw new Error('Failed to send reset email');
    }
  }
}

// ── HTML email template ───────────────────────────────────────────────────────
function buildOTPEmailHTML(otp: string, email: string, title = 'Verify your email', subtitlePrefix = 'Use the verification code below to confirm'): string {
  const digits = otp.split('');
  const digitBoxes = digits
    .map(
      (d) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:48px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;font-size:24px;font-weight:600;color:#18181b;margin:0 4px;font-family:monospace;">${d}</span>`
    )
    .join('');

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://inboxkura.vercel.app';
  const LOGO_URL = `${APP_URL}/icon-512x512.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="48" height="48" style="border-radius:12px;display:inline-block;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.1);" />
              <h1 style="margin:0;color:#111827;font-size:22px;font-weight:700;letter-spacing:-0.025em;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                ${subtitlePrefix} <strong>${email}</strong>.
              </p>

              <!-- OTP Boxes -->
              <div style="margin:0 auto 32px;text-align:center;">
                ${digitBoxes}
              </div>

              <p style="margin:0 0 32px;color:#6b7280;font-size:14px;">
                This code expires in <strong>10 minutes</strong>.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />

              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                Sent by ${APP_NAME}<br/>
                This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Send Workspace Invitation Email ───────────────────────────────────────────
export async function sendInviteEmail(
  email: string,
  orgName: string,
  inviteUrl: string,
  inviterName: string
): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `You've been invited to join ${orgName} on ${APP_NAME}`,
      html: buildInviteEmailHTML(orgName, inviteUrl, inviterName, email),
    });

    if (error) throw error;
  } catch (err) {
    console.warn('⚠️ Primary invite email sending failed, trying with onboarding@resend.dev fallback...', err);
    const { error: fallbackError } = await resend.emails.send({
      from: `${APP_NAME} <onboarding@resend.dev>`,
      to: email,
      subject: `[Fallback] You've been invited to join ${orgName} on ${APP_NAME}`,
      html: buildInviteEmailHTML(orgName, inviteUrl, inviterName, email),
    });

    if (fallbackError) {
      console.error('Resend fallback email error (invite):', fallbackError);
      throw new Error('Failed to send invitation email');
    }
  }
}

// ── HTML invitation email template ───────────────────────────────────────────
function buildInviteEmailHTML(orgName: string, inviteUrl: string, inviterName: string, email: string): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://inboxkura.vercel.app';
  const LOGO_URL = `${APP_URL}/icon-512x512.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspace Invitation – ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="48" height="48" style="border-radius:12px;display:inline-block;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.1);" />
              <h1 style="margin:0;color:#111827;font-size:22px;font-weight:700;letter-spacing:-0.025em;">You've been invited</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;text-align:left;">
                Hello,<br/><br/>
                <strong>${inviterName}</strong> has invited you to collaborate in the <strong>${orgName}</strong> workspace on ${APP_NAME}.
              </p>

              <!-- Accept Button -->
              <div style="margin:32px 0;text-align:center;">
                <a href="${inviteUrl}" target="_blank" style="background:#4f46e5;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin:0 0 24px;color:#6b7280;font-size:13px;line-height:1.6;text-align:left;">
                If the button above does not work, copy and paste this URL into your browser:<br/>
                <a href="${inviteUrl}" style="color:#4f46e5;word-break:all;">${inviteUrl}</a>
              </p>

              <p style="margin:0 0 32px;color:#6b7280;font-size:13px;text-align:left;">
                This invitation is intended for <strong>${email}</strong>. If you did not expect this invitation, you can ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />

              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                Sent by ${APP_NAME}<br/>
                This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

