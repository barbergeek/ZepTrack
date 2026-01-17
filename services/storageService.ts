import { WeightEntry, UserProfile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Generates a unique ID.
 * Falls back to a custom implementation if crypto.randomUUID is unavailable (non-secure contexts).
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const getEntries = async (): Promise<WeightEntry[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/entries`);
    if (!response.ok) throw new Error('Failed to fetch entries');
    return await response.json();
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
};

export const saveEntry = async (entry: WeightEntry): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Failed to save entry');
  } catch (e) {
    console.error("Failed to save entry", e);
    throw e;
  }
};

export const deleteEntry = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/entries/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete entry');
  } catch (e) {
    console.error("Failed to delete entry", e);
    throw e;
  }
};

export const deleteEntries = async (ids: string[]): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/entries/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!response.ok) throw new Error('Failed to delete entries');
  } catch (e) {
    console.error("Failed to delete entries", e);
    throw e;
  }
};

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`);
    if (!response.ok) return { heightInches: 67, targetWeight: 180 };
    return await response.json();
  } catch (e) {
    console.error("Failed to load profile", e);
    return { heightInches: 67, targetWeight: 180 };
  }
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!response.ok) throw new Error('Failed to save profile');
  } catch (e) {
    console.error("Failed to save profile", e);
    throw e;
  }
};

export const getLastDosage = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/entries/meta/last-dosage`);
    if (!response.ok) return 2.5;
    const data = await response.json();
    return data.dosage || 2.5;
  } catch (e) {
    console.error("Failed to get last dosage", e);
    return 2.5;
  }
};

export const exportData = async (): Promise<string> => {
  const entries = await getEntries();
  const profile = await getProfile();
  return JSON.stringify({ entries, profile }, null, 2);
};

export const importData = async (jsonData: string): Promise<boolean> => {
  try {
    const parsed = JSON.parse(jsonData);
    let entries = [];
    if (Array.isArray(parsed)) {
      entries = parsed;
    } else if (parsed.entries) {
      entries = parsed.entries;
      if (parsed.profile) await saveProfile(parsed.profile);
    } else {
      return false;
    }

    const isValid = entries.every((e: any) => e.id && e.date && typeof e.weight === 'number');
    if (!isValid) return false;

    for (const entry of entries) {
      await saveEntry(entry);
    }
    return true;
  } catch (e) {
    console.error("Failed to import data", e);
    return false;
  }
};

export const seedInitialData = async () => {
  const existingEntries = await getEntries();
  if (existingEntries.length === 0) {
    const today = new Date();
    const data: WeightEntry[] = [];
    let currentWeight = 220;
    const sites: any[] = ['Stomach', 'Thigh', 'Arm'];
    const sides: any[] = ['Left', 'Right'];

    for (let i = 8; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 7));
      const dose = i > 4 ? 2.5 : 5.0;

      data.push({
        id: generateId(),
        date: d.toISOString().split('T')[0],
        weight: Number(currentWeight.toFixed(1)),
        dosage: dose,
        injectionSite: sites[i % 3],
        injectionSide: sides[i % 2],
        sideEffects: i === 4 ? ['Nausea'] : [],
        createdAt: Date.now() - (i * 86400000)
      });
      currentWeight -= (Math.random() * 1.5 + 0.5);
    }

    for (const entry of data) {
      await saveEntry(entry);
    }
  }
};