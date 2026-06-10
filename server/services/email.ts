import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'ZepTrack <noreply@zeptrack.app>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('Email not configured: SMTP_HOST, SMTP_USER, or SMTP_PASS missing');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendMFACode(email: string, code: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`[DEV] SMTP not configured — MFA code not sent to ${email}`);
    return false;
  }

  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Your ZepTrack verification code',
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0d9488;">ZepTrack Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send MFA email:', error);
    return false;
  }
}

export async function sendInvite(email: string, inviteUrl: string, inviterName: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`[DEV] SMTP not configured — invite not sent to ${email}`);
    return false;
  }

  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: `${inviterName} invited you to ZepTrack`,
      text: `You've been invited to join ZepTrack!\n\nClick here to accept: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0d9488;">You're invited to ZepTrack!</h2>
          <p>${inviterName} has invited you to join ZepTrack.</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="color: #94a3b8; font-size: 12px;">This invitation expires in 7 days.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}
