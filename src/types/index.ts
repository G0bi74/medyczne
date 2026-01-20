// User types
export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'senior' | 'caregiver';
  createdAt: Date;
  fcmToken?: string;
  caregiverIds?: string[];
  seniorIds?: string[];
  avatarUrl?: string;
}

// Medication types
export interface Medication {
  id: string;
  userId: string;
  barcode: string;
  name: string;
  activeSubstance: string;
  dosage: string;
  form: MedicationForm;
  packageSize: number;
  currentQuantity: number;
  leafletUrl?: string;
  addedAt: Date;
  expirationDate?: Date;
  imageUrl?: string;
  manufacturer?: string;
}

export type MedicationForm = 
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'drops'
  | 'injection'
  | 'cream'
  | 'patch'
  | 'inhaler'
  | 'other';

// Schedule types
export interface Schedule {
  id: string;
  medicationId: string;
  userId: string;
  times: string[];
  daysOfWeek: number[];
  dosageAmount: string;
  startDate: Date;
  endDate?: Date;
  reminderMinutesBefore: number;
  isActive: boolean;
}

// Dose log types
export interface DoseLog {
  id: string;
  scheduleId: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  takenAt?: Date;
  status: DoseStatus;
  notes?: string;
}

export type DoseStatus = 'pending' | 'taken' | 'missed' | 'skipped';

// Drug interaction types
export interface DrugInteraction {
  id: string;
  substance1: string;
  substance2: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
}

export type InteractionSeverity = 'low' | 'medium' | 'high' | 'critical';

// API response types
export interface MedicationInfo {
  barcode: string;
  name: string;
  activeSubstance: string;
  manufacturer: string;
  form?: string;
  dosage?: string;
  leafletUrl?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  SeniorTabs: undefined;
  CaregiverTabs: undefined;
  ScanMedication: undefined;
  MedicationDetail: { medicationId: string };
  AddSchedule: { medicationId: string };
  EditSchedule: { scheduleId: string };
  LinkCaregiver: undefined;
  ManageCaregivers: undefined;
  SeniorDetail: { seniorId: string };
  Notifications: undefined;
};

export type SeniorTabParamList = {
  Dashboard: undefined;
  Medications: undefined;
  Schedule: undefined;
  Profile: undefined;
};

export type CaregiverTabParamList = {
  Monitoring: undefined;
  Seniors: undefined;
  Alerts: undefined;
  Profile: undefined;
};

// Caregiver alert types
export interface CaregiverAlert {
  id: string;
  seniorId: string;
  seniorName: string;
  type: 'missed_dose' | 'low_stock' | 'expiring';
  medicationId?: string;
  medicationName?: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}
