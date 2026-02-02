import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  mfaVerified: boolean;
  sessionId: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validate JWT_SECRET on startup
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be at least 32 characters in production. Generate with: openssl rand -hex 32');
  }
  console.warn('WARNING: JWT_SECRET not configured or too short. Using insecure default for development only.');
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'development-secret-change-in-production-min-32-chars';

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  // Parse expiresIn to seconds for JWT
  const expiresInSeconds = parseExpiry(JWT_EXPIRES_IN) / 1000;
  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: expiresInSeconds });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

export function getExpiryMs(): number {
  return parseExpiry(JWT_EXPIRES_IN);
}
