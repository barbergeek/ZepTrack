export type InjectionSite = 'Stomach' | 'Thigh' | 'Arm' | 'None';
export type InjectionSide = 'Left' | 'Right' | 'None';

export interface WeightEntry {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  weight: number;
  dosage: number;
  injectionSite?: InjectionSite;
  injectionSide?: InjectionSide;
  sideEffects?: string[]; // e.g. ["Nausea", "Fatigue"]
  notes?: string;
  createdAt: number;
}

export interface UserProfile {
  heightInches: number;
  targetWeight: number;
  name?: string;
}

export interface Stats {
  currentWeight: number;
  startWeight: number;
  totalLoss: number;
  currentDosage: number;
  lowestWeight: number;
  highestWeight: number;
  bmi: number;
  progressPercent: number;
  goalWeight: number;
}

export type ViewState = 'dashboard' | 'history' | 'dosage' | 'settings';