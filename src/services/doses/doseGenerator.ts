// Dose generation service - creates virtual doses from schedules
// This avoids needing to store DoseLogs in Firebase for each day

import { Schedule, Medication, DoseLog, DoseStatus } from '../../types';
import { 
  startOfDay, 
  endOfDay, 
  setHours, 
  setMinutes, 
  isSameDay, 
  isAfter, 
  isBefore,
  format,
  addDays,
  getDay,
} from 'date-fns';

export interface GeneratedDose {
  id: string;
  scheduleId: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  status: DoseStatus;
  dosageAmount: string;
  takenAt?: Date;
  medication?: Medication;
}

// Local storage for taken/skipped doses (in-memory for now, can be persisted)
const takenDoses: Map<string, { status: DoseStatus; takenAt?: Date }> = new Map();

/**
 * Generate a unique key for a dose based on schedule, date and time
 */
const getDoseKey = (scheduleId: string, date: Date, time: string): string => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return `${scheduleId}_${dateStr}_${time}`;
};

/**
 * Check if a schedule is active for a given day
 */
const isScheduleActiveForDay = (schedule: Schedule, date: Date): boolean => {
  // Check if schedule is active
  if (!schedule.isActive) return false;
  
  // Check if date is within schedule range
  const dayStart = startOfDay(date);
  if (isBefore(dayStart, startOfDay(schedule.startDate))) return false;
  if (schedule.endDate && isAfter(dayStart, startOfDay(schedule.endDate))) return false;
  
  // Check if day of week matches
  // JavaScript: 0 = Sunday, 1 = Monday, etc.
  // Our model: 1 = Monday, 7 = Sunday
  const jsDay = getDay(date); // 0-6
  const ourDay = jsDay === 0 ? 7 : jsDay; // 1-7
  
  // If daysOfWeek is empty, assume every day
  if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
    return true;
  }
  
  return schedule.daysOfWeek.includes(ourDay);
};

/**
 * Parse time string "HH:mm" to Date object for a given day
 */
const parseTimeToDate = (date: Date, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let result = startOfDay(date);
  result = setHours(result, hours);
  result = setMinutes(result, minutes);
  return result;
};

/**
 * Generate doses for a specific date from schedules
 */
export const generateDosesForDate = (
  schedules: Schedule[],
  medications: Medication[],
  date: Date,
  userId: string
): GeneratedDose[] => {
  const doses: GeneratedDose[] = [];
  const now = new Date();
  
  for (const schedule of schedules) {
    // Check if schedule applies to this day
    if (!isScheduleActiveForDay(schedule, date)) continue;
    
    const medication = medications.find(m => m.id === schedule.medicationId);
    
    // Generate a dose for each time in the schedule
    for (const time of schedule.times || []) {
      const scheduledTime = parseTimeToDate(date, time);
      const doseKey = getDoseKey(schedule.id, date, time);
      
      // Check if this dose was already taken/skipped
      const savedStatus = takenDoses.get(doseKey);
      
      let status: DoseStatus = 'pending';
      let takenAt: Date | undefined;
      
      if (savedStatus) {
        status = savedStatus.status;
        takenAt = savedStatus.takenAt;
      } else if (isBefore(scheduledTime, now) && !isSameDay(date, now)) {
        // Past dose not on today - mark as missed
        status = 'missed';
      } else if (isBefore(scheduledTime, now) && isSameDay(date, now)) {
        // Past dose today - check if recently missed (more than 2 hours ago)
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        if (isBefore(scheduledTime, twoHoursAgo)) {
          status = 'missed';
        }
      }
      
      doses.push({
        id: doseKey,
        scheduleId: schedule.id,
        medicationId: schedule.medicationId,
        userId,
        scheduledTime,
        status,
        dosageAmount: schedule.dosageAmount,
        takenAt,
        medication,
      });
    }
  }
  
  // Sort by scheduled time
  return doses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
};

/**
 * Generate doses for today
 */
export const generateTodaysDoses = (
  schedules: Schedule[],
  medications: Medication[],
  userId: string
): GeneratedDose[] => {
  return generateDosesForDate(schedules, medications, new Date(), userId);
};

/**
 * Generate doses for a week starting from today
 */
export const generateWeekDoses = (
  schedules: Schedule[],
  medications: Medication[],
  userId: string
): Map<string, GeneratedDose[]> => {
  const weekDoses = new Map<string, GeneratedDose[]>();
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const dateKey = format(date, 'yyyy-MM-dd');
    weekDoses.set(dateKey, generateDosesForDate(schedules, medications, date, userId));
  }
  
  return weekDoses;
};

/**
 * Mark a dose as taken
 */
export const markDoseAsTakenLocal = (doseId: string): void => {
  takenDoses.set(doseId, { status: 'taken', takenAt: new Date() });
};

/**
 * Mark a dose as skipped
 */
export const markDoseAsSkippedLocal = (doseId: string): void => {
  takenDoses.set(doseId, { status: 'skipped' });
};

/**
 * Get dose status
 */
export const getDoseStatus = (doseId: string): { status: DoseStatus; takenAt?: Date } | null => {
  return takenDoses.get(doseId) || null;
};

/**
 * Clear all saved dose statuses (for testing)
 */
export const clearDoseStatuses = (): void => {
  takenDoses.clear();
};

/**
 * Convert GeneratedDose to DoseLog format for compatibility
 */
export const toDoseLog = (dose: GeneratedDose): DoseLog => {
  return {
    id: dose.id,
    scheduleId: dose.scheduleId,
    medicationId: dose.medicationId,
    userId: dose.userId,
    scheduledTime: dose.scheduledTime,
    status: dose.status,
    takenAt: dose.takenAt,
  };
};

/**
 * Calculate progress stats for doses
 */
export const calculateProgress = (doses: GeneratedDose[]): {
  total: number;
  taken: number;
  pending: number;
  missed: number;
  skipped: number;
  percentage: number;
} => {
  const total = doses.length;
  const taken = doses.filter(d => d.status === 'taken').length;
  const pending = doses.filter(d => d.status === 'pending').length;
  const missed = doses.filter(d => d.status === 'missed').length;
  const skipped = doses.filter(d => d.status === 'skipped').length;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
  
  return { total, taken, pending, missed, skipped, percentage };
};
