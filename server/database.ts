import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/zeptrack.db';

export interface WeightEntry {
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

export interface UserProfile {
  id: string;
  heightInches: number;
  targetWeight: number;
  name?: string;
  createdAt: number;
}

export class Database {
  private db: Database.Database | null = null;

  constructor() {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  initialize() {
    this.db = new Database(DB_PATH);
    this.createTables();
    this.createDefaultProfile();
  }

  private createTables() {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        height_inches REAL NOT NULL,
        target_weight REAL NOT NULL,
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

  private createDefaultProfile() {
    if (!this.db) return;

    const existingProfile = this.db.prepare('SELECT id FROM users LIMIT 1').get();
    if (!existingProfile) {
      const defaultUserId = 'default-user';
      this.db.prepare(`
        INSERT INTO users (id, height_inches, target_weight, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(defaultUserId, 0, 0, 'User', Date.now());
    }
  }

  // Profile methods
  getProfile(userId: string = 'default-user'): UserProfile | null {
    if (!this.db) return null;

    const row = this.db.prepare(`
      SELECT id, height_inches as heightInches, target_weight as targetWeight, name, created_at as createdAt
      FROM users
      WHERE id = ?
    `).get(userId) as UserProfile | undefined;

    return row || null;
  }

  saveProfile(userId: string = 'default-user', profile: Partial<UserProfile>): UserProfile {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.getProfile(userId);

    if (existing) {
      this.db.prepare(`
        UPDATE users
        SET height_inches = ?, target_weight = ?, name = ?
        WHERE id = ?
      `).run(
        profile.heightInches ?? existing.heightInches,
        profile.targetWeight ?? existing.targetWeight,
        profile.name ?? existing.name,
        userId
      );
    } else {
      this.db.prepare(`
        INSERT INTO users (id, height_inches, target_weight, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        profile.heightInches ?? 0,
        profile.targetWeight ?? 0,
        profile.name ?? 'User',
        Date.now()
      );
    }

    return this.getProfile(userId)!;
  }

  // Entry methods
  getEntries(userId: string = 'default-user'): WeightEntry[] {
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
    `).all(userId) as WeightEntry[];

    // Parse side effects from JSON string
    return rows.map(row => ({
      ...row,
      sideEffects: row.sideEffects ? JSON.parse(row.sideEffects) : undefined
    }));
  }

  getEntry(id: string, userId: string = 'default-user'): WeightEntry | null {
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
    `).get(id, userId) as WeightEntry | undefined;

    if (!row) return null;

    return {
      ...row,
      sideEffects: row.sideEffects ? JSON.parse(row.sideEffects as string) : undefined
    };
  }

  saveEntry(entry: Omit<WeightEntry, 'userId'>, userId: string = 'default-user'): WeightEntry {
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

  deleteEntry(id: string, userId: string = 'default-user'): boolean {
    if (!this.db) return false;

    const result = this.db.prepare(`
      DELETE FROM weight_entries
      WHERE id = ? AND user_id = ?
    `).run(id, userId);

    return result.changes > 0;
  }

  deleteEntries(ids: string[], userId: string = 'default-user'): number {
    if (!this.db) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const result = this.db.prepare(`
      DELETE FROM weight_entries
      WHERE id IN (${placeholders}) AND user_id = ?
    `).run(...ids, userId);

    return result.changes;
  }

  getLastDosage(userId: string = 'default-user'): number {
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

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
