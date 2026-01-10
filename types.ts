export interface WeightEntry {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  weight: number;
  dosage: number;
  notes?: string;
  createdAt: number;
}

export interface Stats {
  currentWeight: number;
  startWeight: number;
  totalLoss: number;
  currentDosage: number;
  lowestWeight: number;
  highestWeight: number;
}

export type ViewState = 'dashboard' | 'history' | 'dosage' | 'settings';