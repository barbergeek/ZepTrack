import { WeightEntry } from '../types';

const STORAGE_KEY = 'zeptrack_entries_v1';

export const getEntries = (): WeightEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Sort by date descending (newest first) by default
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

export const getLastDosage = (): number => {
  const entries = getEntries();
  if (entries.length === 0) return 2.5; // Default starting dose for Zepbound
  return entries[0].dosage;
};

export const exportData = (): string => {
  const entries = getEntries();
  return JSON.stringify(entries, null, 2);
};

export const importData = (jsonData: string): boolean => {
  try {
    const parsed = JSON.parse(jsonData);
    if (!Array.isArray(parsed)) return false;
    
    // Basic validation: ensure items have required fields
    const isValid = parsed.every(e => e.id && e.date && typeof e.weight === 'number');
    if (!isValid) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
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
    
    for (let i = 8; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 7));
      const dose = i > 4 ? 2.5 : 5.0;
      
      data.push({
        id: crypto.randomUUID(),
        date: d.toISOString().split('T')[0],
        weight: Number(currentWeight.toFixed(1)),
        dosage: dose,
        createdAt: Date.now() - (i * 86400000)
      });
      currentWeight -= (Math.random() * 1.5 + 0.5); 
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};