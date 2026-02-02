import { TOTP, generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const MFA_ISSUER = process.env.MFA_ISSUER || 'ZepTrack';

export interface TOTPSetup {
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
}

export async function generateTOTPSetup(email: string): Promise<TOTPSetup> {
  const secret = generateSecret();
  const uri = generateURI({
    secret,
    issuer: MFA_ISSUER,
    label: email,
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(uri);

  return { secret, uri, qrCodeDataUrl };
}

export async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  try {
    const result = await verify({
      secret,
      token: code,
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    });
    return result.valid;
  } catch {
    return false;
  }
}

export function generateEmailCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function generateBackupCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}
