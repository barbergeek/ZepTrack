import { Request, Response, NextFunction } from 'express';
import { verifyToken, hashToken } from '../services/jwt';
import { Database } from '../database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: 'user' | 'admin';
      sessionId?: string;
      mfaVerified?: boolean;
    }
  }
}

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'zeptrack_session';

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[COOKIE_NAME];
  const db: Database = (req as any).db;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!payload.mfaVerified) {
    // Get user's MFA method for the frontend
    const user = db.findUserById(payload.userId);
    return res.status(403).json({
      error: 'MFA verification required',
      code: 'MFA_REQUIRED',
      mfaMethod: user?.mfaMethod,
    });
  }

  // Verify session is still valid in database
  const session = db.findSessionByTokenHash(hashToken(token));
  if (!session) {
    return res.status(401).json({ error: 'Session expired or revoked' });
  }

  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.userRole = payload.role;
  req.sessionId = payload.sessionId;
  req.mfaVerified = payload.mfaVerified;

  next();
}

export function authOptional(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[COOKIE_NAME];

  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.mfaVerified) {
      const db: Database = (req as any).db;
      const session = db.findSessionByTokenHash(hashToken(token));
      if (session) {
        req.userId = payload.userId;
        req.userEmail = payload.email;
        req.userRole = payload.role;
        req.sessionId = payload.sessionId;
        req.mfaVerified = payload.mfaVerified;
      }
    }
  }

  next();
}

export function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function mfaPending(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // For MFA verification, we don't require mfaVerified to be true
  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.userRole = payload.role;
  req.sessionId = payload.sessionId;
  req.mfaVerified = payload.mfaVerified;

  next();
}
