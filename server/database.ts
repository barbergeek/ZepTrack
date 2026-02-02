import BetterSqlite3 from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_PATH = process.env.DB_PATH || './data/zeptrack.db';

export interface WeightEntry {
  id: string;
  userId: string;
  date: string;
  weight: number;
  dosage: number;
  injectionSite?: string;
  injectionSide?: string;
  sideEffects?: string[];
  notes?: string;
  createdAt: number;
}

// Internal type for raw DB rows (sideEffects stored as JSON string)
interface WeightEntryRow {
  id: string;
  userId: string;
  date: string;
  weight: number;
  dosage: number;
  injectionSite?: string;
  injectionSide?: string;
  sideEffects?: string;
  notes?: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  oauthProvider?: string;
  oauthId?: string;
  role: 'user' | 'admin';
  mfaEnabled: boolean;
  mfaMethod?: 'totp' | 'email';
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  emailVerified: boolean;
  invitedBy?: string;
  heightInches: number;
  targetWeight: number;
  createdAt: number;
  updatedAt?: number;
  lastLoginAt?: number;
}

interface UserRow {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  oauth_provider?: string;
  oauth_id?: string;
  role: string;
  mfa_enabled: number;
  mfa_method?: string;
  mfa_secret?: string;
  mfa_backup_codes?: string;
  email_verified: number;
  invited_by?: string;
  height_inches: number;
  target_weight: number;
  created_at: number;
  updated_at?: number;
  last_login_at?: number;
}

export interface UserProfile {
  id: string;
  heightInches: number;
  targetWeight: number;
  name?: string;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
}

export interface MFAVerification {
  id: string;
  userId: string;
  code: string;
  type: 'email' | 'totp';
  expiresAt: number;
  usedAt?: number;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  invitedBy: string;
  role: 'user' | 'admin';
  expiresAt: number;
  acceptedAt?: number;
}

export interface CreateUserInput {
  email: string;
  name?: string;
  avatarUrl?: string;
  oauthProvider?: string;
  oauthId?: string;
  role?: 'user' | 'admin';
  invitedBy?: string;
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: number;
}

export interface CreateInviteInput {
  email: string;
  role?: 'user' | 'admin';
  invitedBy: string;
}

export class Database {
  private db: BetterSqlite3Database | null = null;

  constructor() {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o750 });
    }
  }

  initialize() {
    this.db = new BetterSqlite3(DB_PATH);
    this.createTables();
    this.migrateSchema();
  }

  private createTables() {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        height_inches REAL NOT NULL DEFAULT 0,
        target_weight REAL NOT NULL DEFAULT 0,
        name TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS weight_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        weight REAL NOT NULL,
        dosage REAL NOT NULL,
        injection_site TEXT,
        injection_side TEXT,
        side_effects TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_entries_user_id ON weight_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_entries_date ON weight_entries(date);
    `);
  }

  private migrateSchema() {
    if (!this.db) return;

    // Check if migration is needed by looking for email column
    const hasEmail = this.db.prepare(
      "SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='email'"
    ).get() as { count: number };

    if (hasEmail.count === 0) {
      console.log('Running auth schema migration...');

      // Add new columns to users table
      this.db.exec(`
        ALTER TABLE users ADD COLUMN email TEXT;
        ALTER TABLE users ADD COLUMN oauth_provider TEXT;
        ALTER TABLE users ADD COLUMN oauth_id TEXT;
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
        ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN mfa_method TEXT;
        ALTER TABLE users ADD COLUMN mfa_secret TEXT;
        ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT;
        ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN invited_by TEXT;
        ALTER TABLE users ADD COLUMN updated_at INTEGER;
        ALTER TABLE users ADD COLUMN last_login_at INTEGER;
      `);

      // Create new tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          revoked_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS mfa_verifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          code TEXT NOT NULL,
          type TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          used_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS invites (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          token TEXT NOT NULL,
          invited_by TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          expires_at INTEGER NOT NULL,
          accepted_at INTEGER,
          FOREIGN KEY (invited_by) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);

      console.log('Auth schema migration complete');
    }
  }

  // ========== User Auth Methods ==========

  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      oauthProvider: row.oauth_provider,
      oauthId: row.oauth_id,
      role: (row.role as 'user' | 'admin') || 'user',
      mfaEnabled: row.mfa_enabled === 1,
      mfaMethod: row.mfa_method as 'totp' | 'email' | undefined,
      mfaSecret: row.mfa_secret,
      mfaBackupCodes: row.mfa_backup_codes ? JSON.parse(row.mfa_backup_codes) : undefined,
      emailVerified: row.email_verified === 1,
      invitedBy: row.invited_by,
      heightInches: row.height_inches,
      targetWeight: row.target_weight,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }

  findUserByEmail(email: string): User | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email) as UserRow | undefined;

    return row ? this.rowToUser(row) : null;
  }

  findUserByOAuth(provider: string, oauthId: string): User | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?
    `).get(provider, oauthId) as UserRow | undefined;

    return row ? this.rowToUser(row) : null;
  }

  findUserById(userId: string): User | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).get(userId) as UserRow | undefined;

    return row ? this.rowToUser(row) : null;
  }

  createUser(input: CreateUserInput): User {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO users (id, email, name, avatar_url, oauth_provider, oauth_id, role, invited_by, height_inches, target_weight, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(
      id,
      input.email,
      input.name || null,
      input.avatarUrl || null,
      input.oauthProvider || null,
      input.oauthId || null,
      input.role || 'user',
      input.invitedBy || null,
      now
    );

    return this.findUserById(id)!;
  }

  updateUser(userId: string, updates: Partial<User>): User {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.findUserById(userId);
    if (!existing) throw new Error('User not found');

    this.db.prepare(`
      UPDATE users SET
        name = ?,
        avatar_url = ?,
        oauth_provider = ?,
        oauth_id = ?,
        role = ?,
        mfa_enabled = ?,
        mfa_method = ?,
        mfa_secret = ?,
        mfa_backup_codes = ?,
        email_verified = ?,
        height_inches = ?,
        target_weight = ?,
        updated_at = ?,
        last_login_at = ?
      WHERE id = ?
    `).run(
      updates.name ?? existing.name ?? null,
      updates.avatarUrl ?? existing.avatarUrl ?? null,
      updates.oauthProvider ?? existing.oauthProvider ?? null,
      updates.oauthId ?? existing.oauthId ?? null,
      updates.role ?? existing.role,
      (updates.mfaEnabled ?? existing.mfaEnabled) ? 1 : 0,
      updates.mfaMethod ?? existing.mfaMethod ?? null,
      updates.mfaSecret ?? existing.mfaSecret ?? null,
      updates.mfaBackupCodes ? JSON.stringify(updates.mfaBackupCodes) : (existing.mfaBackupCodes ? JSON.stringify(existing.mfaBackupCodes) : null),
      (updates.emailVerified ?? existing.emailVerified) ? 1 : 0,
      updates.heightInches ?? existing.heightInches,
      updates.targetWeight ?? existing.targetWeight,
      Date.now(),
      updates.lastLoginAt ?? existing.lastLoginAt ?? null,
      userId
    );

    return this.findUserById(userId)!;
  }

  getAllUsers(): User[] {
    if (!this.db) return [];

    const rows = this.db.prepare(`
      SELECT * FROM users ORDER BY created_at DESC
    `).all() as UserRow[];

    return rows.map(row => this.rowToUser(row));
  }

  deleteUser(userId: string): boolean {
    if (!this.db) return false;

    // Delete user's entries first
    this.db.prepare('DELETE FROM weight_entries WHERE user_id = ?').run(userId);
    // Delete user's sessions
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    // Delete user's MFA verifications
    this.db.prepare('DELETE FROM mfa_verifications WHERE user_id = ?').run(userId);
    // Delete user
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return result.changes > 0;
  }

  // ========== Session Methods ==========

  createSession(input: CreateSessionInput): Session {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    this.db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.userId,
      input.tokenHash,
      input.ipAddress || null,
      input.userAgent || null,
      now,
      input.expiresAt
    );

    return {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: now,
      expiresAt: input.expiresAt,
    };
  }

  findSessionByTokenHash(tokenHash: string): Session | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT id, user_id as userId, token_hash as tokenHash, ip_address as ipAddress,
             user_agent as userAgent, created_at as createdAt, expires_at as expiresAt, revoked_at as revokedAt
      FROM sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
    `).get(tokenHash, Date.now()) as Session | undefined;

    return row || null;
  }

  revokeSession(sessionId: string): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE sessions SET revoked_at = ? WHERE id = ?
    `).run(Date.now(), sessionId);
  }

  revokeAllUserSessions(userId: string): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL
    `).run(Date.now(), userId);
  }

  // ========== MFA Methods ==========

  createMFAVerification(userId: string, codeHash: string, type: 'email' | 'totp'): MFAVerification {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.db.prepare(`
      INSERT INTO mfa_verifications (id, user_id, code, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, codeHash, type, expiresAt);

    return { id, userId, code: codeHash, type, expiresAt };
  }

  findValidMFAVerification(userId: string, type: 'email' | 'totp'): MFAVerification | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT id, user_id as userId, code, type, expires_at as expiresAt, used_at as usedAt
      FROM mfa_verifications
      WHERE user_id = ? AND type = ? AND used_at IS NULL AND expires_at > ?
      ORDER BY expires_at DESC
      LIMIT 1
    `).get(userId, type, Date.now()) as MFAVerification | undefined;

    return row || null;
  }

  markMFAVerificationUsed(verificationId: string): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE mfa_verifications SET used_at = ? WHERE id = ?
    `).run(Date.now(), verificationId);
  }

  saveMFASecret(userId: string, secret: string, backupCodes: string[]): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE users SET mfa_secret = ?, mfa_backup_codes = ? WHERE id = ?
    `).run(secret, JSON.stringify(backupCodes), userId);
  }

  enableMFA(userId: string, method: 'totp' | 'email'): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE users SET mfa_enabled = 1, mfa_method = ?, updated_at = ? WHERE id = ?
    `).run(method, Date.now(), userId);
  }

  disableMFA(userId: string): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE users SET mfa_enabled = 0, mfa_method = NULL, mfa_secret = NULL, mfa_backup_codes = NULL, updated_at = ? WHERE id = ?
    `).run(Date.now(), userId);
  }

  useBackupCode(userId: string, code: string): boolean {
    if (!this.db) return false;

    const user = this.findUserById(userId);
    if (!user || !user.mfaBackupCodes) return false;

    const index = user.mfaBackupCodes.indexOf(code);
    if (index === -1) return false;

    // Remove used backup code
    const remainingCodes = user.mfaBackupCodes.filter((_, i) => i !== index);
    this.db.prepare(`
      UPDATE users SET mfa_backup_codes = ? WHERE id = ?
    `).run(JSON.stringify(remainingCodes), userId);

    return true;
  }

  // ========== Invite Methods ==========

  createInvite(input: CreateInviteInput): Invite {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    this.db.prepare(`
      INSERT INTO invites (id, email, token, invited_by, role, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.email, token, input.invitedBy, input.role || 'user', expiresAt);

    return {
      id,
      email: input.email,
      token,
      invitedBy: input.invitedBy,
      role: (input.role as 'user' | 'admin') || 'user',
      expiresAt,
    };
  }

  findInviteByToken(token: string): Invite | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT id, email, token, invited_by as invitedBy, role, expires_at as expiresAt, accepted_at as acceptedAt
      FROM invites WHERE token = ? AND accepted_at IS NULL AND expires_at > ?
    `).get(token, Date.now()) as Invite | undefined;

    return row || null;
  }

  findInviteByEmail(email: string): Invite | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT id, email, token, invited_by as invitedBy, role, expires_at as expiresAt, accepted_at as acceptedAt
      FROM invites WHERE email = ? AND accepted_at IS NULL AND expires_at > ?
    `).get(email, Date.now()) as Invite | undefined;

    return row || null;
  }

  acceptInvite(inviteId: string): void {
    if (!this.db) return;

    this.db.prepare(`
      UPDATE invites SET accepted_at = ? WHERE id = ?
    `).run(Date.now(), inviteId);
  }

  // ========== Profile Methods (Legacy Compatible) ==========

  getProfile(userId: string): UserProfile | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT id, height_inches as heightInches, target_weight as targetWeight, name, created_at as createdAt
      FROM users
      WHERE id = ?
    `).get(userId) as UserProfile | undefined;

    return row || null;
  }

  saveProfile(userId: string, profile: Partial<UserProfile>): UserProfile {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.getProfile(userId);

    if (existing) {
      this.db.prepare(`
        UPDATE users
        SET height_inches = ?, target_weight = ?, name = ?, updated_at = ?
        WHERE id = ?
      `).run(
        profile.heightInches ?? existing.heightInches,
        profile.targetWeight ?? existing.targetWeight,
        profile.name ?? existing.name,
        Date.now(),
        userId
      );
    }

    return this.getProfile(userId)!;
  }

  // ========== Entry Methods ==========

  getEntries(userId: string): WeightEntry[] {
    if (!this.db) return [];

    const rows = this.db.prepare(`
      SELECT
        id,
        user_id as userId,
        date,
        weight,
        dosage,
        injection_site as injectionSite,
        injection_side as injectionSide,
        side_effects as sideEffects,
        notes,
        created_at as createdAt
      FROM weight_entries
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(userId) as WeightEntryRow[];

    return rows.map(row => ({
      ...row,
      sideEffects: row.sideEffects ? JSON.parse(row.sideEffects) : undefined
    }));
  }

  getEntry(id: string, userId: string): WeightEntry | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT
        id,
        user_id as userId,
        date,
        weight,
        dosage,
        injection_site as injectionSite,
        injection_side as injectionSide,
        side_effects as sideEffects,
        notes,
        created_at as createdAt
      FROM weight_entries
      WHERE id = ? AND user_id = ?
    `).get(id, userId) as WeightEntryRow | undefined;

    if (!row) return null;

    return {
      ...row,
      sideEffects: row.sideEffects ? JSON.parse(row.sideEffects) : undefined
    };
  }

  saveEntry(entry: Omit<WeightEntry, 'userId'>, userId: string): WeightEntry {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.getEntry(entry.id, userId);
    const sideEffectsJson = entry.sideEffects ? JSON.stringify(entry.sideEffects) : null;

    if (existing) {
      this.db.prepare(`
        UPDATE weight_entries
        SET date = ?, weight = ?, dosage = ?, injection_site = ?, injection_side = ?, side_effects = ?, notes = ?
        WHERE id = ? AND user_id = ?
      `).run(
        entry.date,
        entry.weight,
        entry.dosage,
        entry.injectionSite || null,
        entry.injectionSide || null,
        sideEffectsJson,
        entry.notes || null,
        entry.id,
        userId
      );
    } else {
      this.db.prepare(`
        INSERT INTO weight_entries (id, user_id, date, weight, dosage, injection_site, injection_side, side_effects, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.id,
        userId,
        entry.date,
        entry.weight,
        entry.dosage,
        entry.injectionSite || null,
        entry.injectionSide || null,
        sideEffectsJson,
        entry.notes || null,
        entry.createdAt
      );
    }

    return this.getEntry(entry.id, userId)!;
  }

  deleteEntry(id: string, userId: string): boolean {
    if (!this.db) return false;

    const result = this.db.prepare(`
      DELETE FROM weight_entries
      WHERE id = ? AND user_id = ?
    `).run(id, userId);

    return result.changes > 0;
  }

  deleteEntries(ids: string[], userId: string): number {
    if (!this.db) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const result = this.db.prepare(`
      DELETE FROM weight_entries
      WHERE id IN (${placeholders}) AND user_id = ?
    `).run(...ids, userId);

    return result.changes;
  }

  getLastDosage(userId: string): number {
    if (!this.db) return 0;

    const row = this.db.prepare(`
      SELECT dosage
      FROM weight_entries
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT 1
    `).get(userId) as { dosage: number } | undefined;

    return row?.dosage || 0;
  }

  // ========== Status Methods ==========

  getStatus(): { connected: boolean; entries: number; profiles: number } {
    if (!this.db) {
      return { connected: false, entries: 0, profiles: 0 };
    }

    try {
      const entriesCount = (this.db.prepare('SELECT COUNT(*) as count FROM weight_entries').get() as { count: number }).count;
      const profilesCount = (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
      return { connected: true, entries: entriesCount, profiles: profilesCount };
    } catch {
      return { connected: false, entries: 0, profiles: 0 };
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
