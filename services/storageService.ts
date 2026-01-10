import { WeightEntry, UserProfile } from '../types';

const STORAGE_KEY = 'zeptrack_entries_v1';
const PROFILE_KEY = 'zeptrack_profile_v1';

export const getEntries = (): WeightEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.sort((a: WeightEntry, b: WeightEntry) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
};

export const saveEntry = (entry: WeightEntry): void => {
  const entries = getEntries();
  const existingIndex = entries.findIndex(e => e.id === entry.id);
  
  let newEntries;
  if (existingIndex >= 0) {
    newEntries = [...entries];
    newEntries[existingIndex] = entry;
  } else {
    newEntries = [entry, ...entries];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
};

export const deleteEntry = (id: string): void => {
  const entries = getEntries();
  const newEntries = entries.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
};

export const deleteEntries = (ids: string[]): void => {
  const entries = getEntries();
  const newEntries = entries.filter(e => !ids.includes(e.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
};

export const getProfile = (): UserProfile => {
  const data = localStorage.getItem(PROFILE_KEY);
  if (!data) return { heightInches: 67, targetWeight: 180 }; // Default defaults
  return JSON.parse(data);
};

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getLastDosage = (): number => {
  const entries = getEntries();
  if (entries.length === 0) return 2.5;
  return entries[0].dosage;
};

export const exportData = (): string => {
  const entries = getEntries();
  const profile = getProfile();
  return JSON.stringify({ entries, profile }, null, 2);
};

export const importData = (jsonData: string): boolean => {
  try {
    const parsed = JSON.parse(jsonData);
    let entries = [];
    if (Array.isArray(parsed)) {
      entries = parsed;
    } else if (parsed.entries) {
      entries = parsed.entries;
      if (parsed.profile) saveProfile(parsed.profile);
    } else {
      return false;
    }
    
    const isValid = entries.every((e: any) => e.id && e.date && typeof e.weight === 'number');
    if (!isValid) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.error("Failed to import data", e);
    return false;
  }
};

export const seedInitialData = () => {
  if (getEntries().length === 0) {
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
        id: crypto.randomUUID(),
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};