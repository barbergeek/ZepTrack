import { Router } from 'express';
import crypto from 'crypto';
import { Database } from '../database';
import { verifyGoogleToken } from '../services/oauth';
import { signToken, hashToken, getExpiryMs } from '../services/jwt';
import { generateTOTPSetup, verifyTOTP, generateEmailCode, hashCode, verifyCode, generateBackupCodesWithHashes, verifyBackupCode } from '../services/mfa';
import { sendMFACode } from '../services/email';
import { authRequired, mfaPending } from '../middleware/auth';

export const authRouter = Router();

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'zeptrack_session';

// MFA rate limiting - track failed attempts per user
const mfaAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MFA_MAX_ATTEMPTS = 5;
const MFA_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkMFARateLimit(userId: string): { allowed: boolean; remainingAttempts?: number; blockedUntil?: number } {
  const now = Date.now();
  const record = mfaAttempts.get(userId);

  if (!record) {
    return { allowed: true, remainingAttempts: MFA_MAX_ATTEMPTS };
  }

  if (now < record.blockedUntil) {
    return { allowed: false, blockedUntil: record.blockedUntil };
  }

  // Reset if block expired
  if (now >= record.blockedUntil) {
    mfaAttempts.delete(userId);
    return { allowed: true, remainingAttempts: MFA_MAX_ATTEMPTS };
  }

  return { allowed: true, remainingAttempts: MFA_MAX_ATTEMPTS - record.count };
}

function recordMFAFailure(userId: string): void {
  const now = Date.now();
  const record = mfaAttempts.get(userId);

  if (!record || now >= record.blockedUntil) {
    mfaAttempts.set(userId, { count: 1, blockedUntil: 0 });
    return;
  }

  record.count++;
  if (record.count >= MFA_MAX_ATTEMPTS) {
    record.blockedUntil = now + MFA_BLOCK_DURATION_MS;
  }
}

function clearMFAAttempts(userId: string): void {
  mfaAttempts.delete(userId);
}
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// POST /api/auth/google - Login with Google OAuth
authRouter.post('/google', async (req, res) => {
  const { idToken, inviteToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'ID token required' });
  }

  const googleUser = await verifyGoogleToken(idToken);
  if (!googleUser) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  const db: Database = (req as any).db;

  // Find or create user
  let user = db.findUserByOAuth('google', googleUser.sub);
  if (!user) {
    user = db.findUserByEmail(googleUser.email);
    if (user) {
      // Link Google to existing user
      db.updateUser(user.id, { oauthProvider: 'google', oauthId: googleUser.sub });
      user = db.findUserById(user.id)!;
    } else {
      // Check for invite - first by token, then by email
      let invite = inviteToken ? db.findInviteByToken(inviteToken) : null;
      if (!invite) {
        invite = db.findInviteByEmail(googleUser.email);
      }

      // Create new user (atomically assigns admin to first user)
      user = db.createUserWithFirstAdminCheck({
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        oauthProvider: 'google',
        oauthId: googleUser.sub,
        role: invite?.role || 'user',
        invitedBy: invite?.invitedBy,
      });

      // Check for legacy user data to migrate (users created before auth system)
      const legacyUser = db.findLegacyUser();
      if (legacyUser && legacyUser.id !== user.id) {
        console.log(`Migrating legacy user data to ${googleUser.email}`);
        db.migrateLegacyUserTo(legacyUser.id, user.id);
        // Refresh user to get migrated profile data
        user = db.findUserById(user.id)!;
      }

      if (invite) {
        db.acceptInvite(invite.id);
      }
    }
  }

  // Update last login
  db.updateUser(user.id, { lastLoginAt: Date.now() });

  // Check if MFA required
  if (user.mfaEnabled) {
    // Issue limited token for MFA flow (mfaVerified = false)
    const sessionId = crypto.randomUUID();
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaVerified: false,
      sessionId,
    });

    // Create MFA pending session (short expiry - 10 minutes)
    db.createSession({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute expiry for MFA pending
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.json({
      requiresMFA: true,
      mfaMethod: user.mfaMethod,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  }

  // No MFA - create full session
  const sessionId = crypto.randomUUID();
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    mfaVerified: true,
    sessionId,
  });

  db.createSession({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(token),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    expiresAt: Date.now() + getExpiryMs(),
  });

  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      heightInches: user.heightInches,
      targetWeight: user.targetWeight,
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    const db: Database = (req as any).db;
    const session = db.findSessionByTokenHash(hashToken(token));
    if (session) {
      db.revokeSession(session.id);
    }
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

// GET /api/auth/me - Get current user
authRouter.get('/me', authRequired, (req, res) => {
  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod,
    },
  });
});

// POST /api/auth/mfa/setup/totp - Start TOTP setup
authRouter.post('/mfa/setup/totp', authRequired, async (req, res) => {
  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const setup = await generateTOTPSetup(user.email);

  // Store secret temporarily (will be confirmed when user verifies)
  db.saveMFASecret(user.id, setup.secret, []);

  res.json({
    qrCodeDataUrl: setup.qrCodeDataUrl,
    secret: setup.secret, // For manual entry
  });
});

// POST /api/auth/mfa/setup/totp/verify - Verify and enable TOTP
authRouter.post('/mfa/setup/totp/verify', authRequired, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Verification code required' });
  }

  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user || !user.mfaSecret) {
    return res.status(400).json({ error: 'MFA setup not started' });
  }

  // Verify the code
  if (!await verifyTOTP(user.mfaSecret, code)) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  // Generate backup codes (hashed for storage, plain for user)
  const { plainCodes, hashedCodes } = await generateBackupCodesWithHashes();
  db.saveMFASecret(user.id, user.mfaSecret, hashedCodes);
  db.enableMFA(user.id, 'totp');

  res.json({
    success: true,
    backupCodes: plainCodes, // Send plain codes to user
  });
});

// POST /api/auth/mfa/setup/email - Enable email MFA
authRouter.post('/mfa/setup/email', authRequired, async (req, res) => {
  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate backup codes (hashed for storage, plain for user)
  const { plainCodes, hashedCodes } = await generateBackupCodesWithHashes();
  db.saveMFASecret(user.id, '', hashedCodes);
  db.enableMFA(user.id, 'email');

  res.json({
    success: true,
    backupCodes: plainCodes, // Send plain codes to user
  });
});

// POST /api/auth/mfa/disable - Disable MFA
authRouter.post('/mfa/disable', authRequired, (req, res) => {
  const db: Database = (req as any).db;
  db.disableMFA(req.userId!);
  // Revoke all sessions except current one for security
  db.revokeAllUserSessionsExcept(req.userId!, req.sessionId!);
  res.json({ success: true });
});

// POST /api/auth/mfa/send-code - Send email MFA code
authRouter.post('/mfa/send-code', mfaPending, async (req, res) => {
  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.mfaMethod !== 'email') {
    return res.status(400).json({ error: 'Email MFA not enabled' });
  }

  const code = generateEmailCode();
  const codeHash = await hashCode(code);

  db.createMFAVerification(user.id, codeHash, 'email');

  const sent = await sendMFACode(user.email, code);
  if (!sent) {
    return res.status(500).json({ error: 'Failed to send verification code' });
  }

  res.json({ success: true });
});

// POST /api/auth/mfa/verify - Verify MFA code and complete login
authRouter.post('/mfa/verify', mfaPending, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Verification code required' });
  }

  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check rate limiting
  const rateLimit = checkMFARateLimit(user.id);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.blockedUntil! - Date.now()) / 1000);
    return res.status(429).json({
      error: 'Too many failed attempts. Please try again later.',
      retryAfter,
    });
  }

  let verified = false;

  if (user.mfaMethod === 'totp') {
    // Verify TOTP code with replay protection
    if (user.mfaSecret && await verifyTOTP(user.mfaSecret, code)) {
      // Check if code was already used (replay attack prevention)
      if (db.isTOTPCodeUsed(user.id, code)) {
        return res.status(400).json({ error: 'This code has already been used. Please wait for a new code.' });
      }
      db.markTOTPCodeUsed(user.id, code);
      verified = true;
    }
  } else if (user.mfaMethod === 'email') {
    // Verify email code
    const verification = db.findValidMFAVerification(user.id, 'email');
    if (verification && await verifyCode(code, verification.code)) {
      db.markMFAVerificationUsed(verification.id);
      verified = true;
    }
  }

  // Check backup codes if not verified (backup codes are hashed)
  if (!verified && user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
    const backupIndex = await verifyBackupCode(code, user.mfaBackupCodes);
    if (backupIndex >= 0) {
      // Remove used backup code
      db.removeBackupCodeAtIndex(user.id, backupIndex);
      verified = true;
    }
  }

  if (!verified) {
    recordMFAFailure(user.id);
    const remaining = MFA_MAX_ATTEMPTS - (mfaAttempts.get(user.id)?.count || 0);
    return res.status(400).json({
      error: 'Invalid verification code',
      remainingAttempts: Math.max(0, remaining),
    });
  }

  // Clear rate limit on success
  clearMFAAttempts(user.id);

  // Revoke the pending MFA session
  if (req.sessionId) {
    db.revokeSession(req.sessionId);
  }

  // Issue full session token
  const sessionId = crypto.randomUUID();
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    mfaVerified: true,
    sessionId,
  });

  db.createSession({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(token),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    expiresAt: Date.now() + getExpiryMs(),
  });

  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      heightInches: user.heightInches,
      targetWeight: user.targetWeight,
    },
  });
});
