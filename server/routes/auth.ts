import { Router } from 'express';
import crypto from 'crypto';
import { Database } from '../database';
import { verifyGoogleToken } from '../services/oauth';
import { signToken, hashToken, getExpiryMs } from '../services/jwt';
import { generateTOTPSetup, verifyTOTP, generateEmailCode, hashCode, verifyCode, generateBackupCodes } from '../services/mfa';
import { sendMFACode } from '../services/email';
import { authRequired, mfaPending } from '../middleware/auth';

export const authRouter = Router();

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'zeptrack_session';
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

      // Check if this is the first user - make them admin
      const isFirstUser = db.getAllUsers().length === 0;

      // Create new user
      user = db.createUser({
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        oauthProvider: 'google',
        oauthId: googleUser.sub,
        role: isFirstUser ? 'admin' : (invite?.role || 'user'),
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

  // Generate backup codes and enable MFA
  const backupCodes = generateBackupCodes();
  db.saveMFASecret(user.id, user.mfaSecret, backupCodes);
  db.enableMFA(user.id, 'totp');

  res.json({
    success: true,
    backupCodes,
  });
});

// POST /api/auth/mfa/setup/email - Enable email MFA
authRouter.post('/mfa/setup/email', authRequired, async (req, res) => {
  const db: Database = (req as any).db;
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate backup codes and enable MFA
  const backupCodes = generateBackupCodes();
  db.saveMFASecret(user.id, '', backupCodes);
  db.enableMFA(user.id, 'email');

  res.json({
    success: true,
    backupCodes,
  });
});

// POST /api/auth/mfa/disable - Disable MFA
authRouter.post('/mfa/disable', authRequired, (req, res) => {
  const db: Database = (req as any).db;
  db.disableMFA(req.userId!);
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

  let verified = false;

  if (user.mfaMethod === 'totp') {
    // Verify TOTP code
    if (user.mfaSecret && await verifyTOTP(user.mfaSecret, code)) {
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

  // Check backup codes if not verified
  if (!verified && db.useBackupCode(user.id, code.toUpperCase())) {
    verified = true;
  }

  if (!verified) {
    return res.status(400).json({ error: 'Invalid verification code' });
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
