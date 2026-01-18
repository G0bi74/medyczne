import { create } from 'zustand';
import { User, Medication, Schedule, DoseLog } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

interface MedicationState {
  medications: Medication[];
  isLoading: boolean;
  error: string | null;
  setMedications: (medications: Medication[]) => void;
  addMedication: (medication: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMedicationStore = create<MedicationState>((set) => ({
  medications: [],
  isLoading: false,
  error: null,
  setMedications: (medications) => set({ medications, isLoading: false }),
  addMedication: (medication) =>
    set((state) => ({ medications: [...state.medications, medication] })),
  updateMedication: (id, updates) =>
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  removeMedication: (id) =>
    set((state) => ({
      medications: state.medications.filter((m) => m.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

interface ScheduleState {
  schedules: Schedule[];
  isLoading: boolean;
  setSchedules: (schedules: Schedule[]) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  removeSchedule: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  schedules: [],
  isLoading: false,
  setSchedules: (schedules) => set({ schedules, isLoading: false }),
  addSchedule: (schedule) =>
    set((state) => ({ schedules: [...state.schedules, schedule] })),
  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));

interface DoseLogState {
  doseLogs: DoseLog[];
  todaysDoses: DoseLog[];
  isLoading: boolean;
  setDoseLogs: (doseLogs: DoseLog[]) => void;
  setTodaysDoses: (doses: DoseLog[]) => void;
  updateDoseLog: (id: string, updates: Partial<DoseLog>) => void;
  setLoading: (loading: boolean) => void;
}

export const useDoseLogStore = create<DoseLogState>((set) => ({
  doseLogs: [],
  todaysDoses: [],
  isLoading: false,
  setDoseLogs: (doseLogs) => set({ doseLogs }),
  setTodaysDoses: (todaysDoses) => set({ todaysDoses }),
  updateDoseLog: (id, updates) =>
    set((state) => ({
      doseLogs: state.doseLogs.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      todaysDoses: state.todaysDoses.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Store for caregiver monitoring seniors
interface CaregiverState {
  seniors: User[];
  selectedSeniorId: string | null;
  seniorMedications: Record<string, Medication[]>;
  seniorDoseLogs: Record<string, DoseLog[]>;
  isLoading: boolean;
  setSeniors: (seniors: User[]) => void;
  selectSenior: (seniorId: string | null) => void;
  setSeniorMedications: (seniorId: string, medications: Medication[]) => void;
  setSeniorDoseLogs: (seniorId: string, logs: DoseLog[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useCaregiverStore = create<CaregiverState>((set) => ({
  seniors: [],
  selectedSeniorId: null,
  seniorMedications: {},
  seniorDoseLogs: {},
  isLoading: false,
  setSeniors: (seniors) => set({ seniors }),
  selectSenior: (selectedSeniorId) => set({ selectedSeniorId }),
  setSeniorMedications: (seniorId, medications) =>
    set((state) => ({
      seniorMedications: { ...state.seniorMedications, [seniorId]: medications },
    })),
  setSeniorDoseLogs: (seniorId, logs) =>
    set((state) => ({
      seniorDoseLogs: { ...state.seniorDoseLogs, [seniorId]: logs },
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
