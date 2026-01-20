// Caregiver-specific service functions
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User, Medication, DoseLog, CaregiverAlert } from '../../types';

// Unlink a senior from caregiver
export const unlinkSenior = async (
  caregiverId: string,
  seniorId: string
): Promise<void> => {
  console.log('[CaregiverService] Unlinking senior:', seniorId, 'from caregiver:', caregiverId);
  
  try {
    // Remove seniorId from caregiver's seniorIds array
    const caregiverDoc = await getDoc(doc(db, 'users', caregiverId));
    if (caregiverDoc.exists()) {
      const caregiverData = caregiverDoc.data();
      const seniorIds = (caregiverData.seniorIds || []).filter((id: string) => id !== seniorId);
      await updateDoc(doc(db, 'users', caregiverId), { seniorIds });
    }

    // Remove caregiverId from senior's caregiverIds array
    const seniorDoc = await getDoc(doc(db, 'users', seniorId));
    if (seniorDoc.exists()) {
      const seniorData = seniorDoc.data();
      const caregiverIds = (seniorData.caregiverIds || []).filter((id: string) => id !== caregiverId);
      await updateDoc(doc(db, 'users', seniorId), { caregiverIds });
    }

    console.log('[CaregiverService] Senior unlinked successfully');
  } catch (error) {
    console.error('[CaregiverService] Error unlinking senior:', error);
    throw error;
  }
};

// Get all medications for a senior
export const getSeniorMedications = async (seniorId: string): Promise<Medication[]> => {
  console.log('[CaregiverService] Getting medications for senior:', seniorId);
  
  try {
    const medsQuery = query(
      collection(db, 'medications'),
      where('userId', '==', seniorId)
    );
    const snapshot = await getDocs(medsQuery);
    
    const medications: Medication[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        barcode: data.barcode,
        name: data.name,
        activeSubstance: data.activeSubstance,
        dosage: data.dosage,
        form: data.form,
        packageSize: data.packageSize,
        currentQuantity: data.currentQuantity,
        addedAt: data.addedAt?.toDate() || new Date(),
        expirationDate: data.expirationDate?.toDate(),
        imageUrl: data.imageUrl,
        manufacturer: data.manufacturer,
      };
    });

    console.log('[CaregiverService] Found', medications.length, 'medications');
    return medications;
  } catch (error) {
    console.error('[CaregiverService] Error getting medications:', error);
    throw error;
  }
};

// Get dose logs for a senior within a date range
export const getSeniorDoseLogs = async (
  seniorId: string,
  startDate: Date,
  endDate: Date
): Promise<DoseLog[]> => {
  console.log('[CaregiverService] Getting dose logs for senior:', seniorId);
  
  try {
    const logsQuery = query(
      collection(db, 'doseLogs'),
      where('userId', '==', seniorId)
    );
    const snapshot = await getDocs(logsQuery);
    
    const logs: DoseLog[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          scheduleId: data.scheduleId,
          medicationId: data.medicationId,
          userId: data.userId,
          scheduledTime: data.scheduledTime?.toDate() || new Date(),
          takenAt: data.takenAt?.toDate(),
          status: data.status,
          notes: data.notes,
        };
      })
      .filter((log) => {
        const logTime = log.scheduledTime.getTime();
        return logTime >= startDate.getTime() && logTime <= endDate.getTime();
      });

    console.log('[CaregiverService] Found', logs.length, 'dose logs in range');
    return logs;
  } catch (error) {
    console.error('[CaregiverService] Error getting dose logs:', error);
    throw error;
  }
};

// Get senior user data
export const getSeniorUser = async (seniorId: string): Promise<User | null> => {
  try {
    const seniorDoc = await getDoc(doc(db, 'users', seniorId));
    if (!seniorDoc.exists()) return null;

    const data = seniorDoc.data();
    return {
      id: seniorDoc.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      role: data.role,
      createdAt: data.createdAt?.toDate() || new Date(),
      caregiverIds: data.caregiverIds,
    };
  } catch (error) {
    console.error('[CaregiverService] Error getting senior:', error);
    throw error;
  }
};

// Get schedules for a senior
export const getSeniorSchedules = async (seniorId: string): Promise<any[]> => {
  console.log('[CaregiverService] Getting schedules for senior:', seniorId);
  
  try {
    const schedulesQuery = query(
      collection(db, 'schedules'),
      where('userId', '==', seniorId)
    );
    const snapshot = await getDocs(schedulesQuery);
    
    const schedules = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        medicationId: data.medicationId,
        userId: data.userId,
        times: data.times || [],
        daysOfWeek: data.daysOfWeek || [],
        dosageAmount: data.dosageAmount,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate(),
        reminderMinutesBefore: data.reminderMinutesBefore || 10,
        isActive: data.isActive ?? true,
      };
    });

    console.log('[CaregiverService] Found', schedules.length, 'schedules');
    return schedules.filter(s => s.isActive);
  } catch (error) {
    console.error('[CaregiverService] Error getting schedules:', error);
    return [];
  }
};

// Get dose statuses for a senior (saved dose states like taken/skipped)
export const getSeniorDoseStatuses = async (
  seniorId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, { status: string; takenAt?: Date }>> => {
  console.log('[CaregiverService] Getting dose statuses for senior:', seniorId);
  
  try {
    const statusesQuery = query(
      collection(db, 'doseStatuses'),
      where('userId', '==', seniorId)
    );
    const snapshot = await getDocs(statusesQuery);
    
    const statusesMap = new Map<string, { status: string; takenAt?: Date }>();
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const scheduledTime = data.scheduledTime?.toDate();
      
      // Only include if within date range
      if (scheduledTime && scheduledTime >= startDate && scheduledTime <= endDate) {
        statusesMap.set(doc.id, {
          status: data.status,
          takenAt: data.takenAt?.toDate(),
        });
      }
    });

    console.log('[CaregiverService] Found', statusesMap.size, 'dose statuses');
    return statusesMap;
  } catch (error) {
    console.error('[CaregiverService] Error getting dose statuses:', error);
    return new Map();
  }
};

// Generate alerts for all seniors of a caregiver
export const generateSeniorAlerts = async (
  seniors: User[],
  seniorMedications: Record<string, Medication[]>,
  seniorDoseLogs: Record<string, DoseLog[]>
): Promise<CaregiverAlert[]> => {
  const alerts: CaregiverAlert[] = [];
  const now = new Date();

  for (const senior of seniors) {
    const medications = seniorMedications[senior.id] || [];
    const logs = seniorDoseLogs[senior.id] || [];

    // Check for missed doses (pending and overdue by 30+ minutes)
    for (const log of logs) {
      if (log.status === 'pending' || log.status === 'missed') {
        const minutesOverdue = (now.getTime() - log.scheduledTime.getTime()) / (1000 * 60);
        if (minutesOverdue > 30) {
          const medication = medications.find((m) => m.id === log.medicationId);
          alerts.push({
            id: `missed-${log.id}`,
            seniorId: senior.id,
            seniorName: senior.name,
            type: 'missed_dose',
            medicationId: log.medicationId,
            medicationName: medication?.name || 'Nieznany lek',
            message: `Pominięta dawka o ${log.scheduledTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
            createdAt: log.scheduledTime,
            isRead: false,
          });
        }
      }
    }

    // Check for low stock medications (less than 5 remaining)
    for (const medication of medications) {
      if (medication.currentQuantity < 5) {
        alerts.push({
          id: `low-${medication.id}`,
          seniorId: senior.id,
          seniorName: senior.name,
          type: 'low_stock',
          medicationId: medication.id,
          medicationName: medication.name,
          message: `Pozostało tylko ${medication.currentQuantity} sztuk`,
          createdAt: now,
          isRead: false,
        });
      }
    }

    // Check for expiring medications (within 30 days)
    for (const medication of medications) {
      if (medication.expirationDate) {
        const daysUntilExpiry = Math.ceil(
          (medication.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          alerts.push({
            id: `expiring-${medication.id}`,
            seniorId: senior.id,
            seniorName: senior.name,
            type: 'expiring',
            medicationId: medication.id,
            medicationName: medication.name,
            message: `Lek wygasa za ${daysUntilExpiry} dni`,
            createdAt: now,
            isRead: false,
          });
        }
      }
    }
  }

  // Sort by creation date (newest first)
  return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};
