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

export type ViewState = 'dashboard' | 'history' | 'dosage' | 'bmi' | 'settings' | 'status' | 'admin';

// Auth types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  mfaEnabled: boolean;
  mfaMethod?: 'totp' | 'email';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaMethod?: 'totp' | 'email';
  error: string | null;
}

export interface TOTPSetupData {
  secret: string;
  qrCodeDataUrl: string;
}

export interface InviteUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}