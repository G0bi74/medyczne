import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Medication, Schedule, DoseLog, DoseStatus, MedicationForm } from '../../types';

// ============ MEDICATIONS ============

export const addMedication = async (
  medication: Omit<Medication, 'id'>
): Promise<Medication> => {
  try {
    console.log('Adding medication:', medication.name);
    
    // Validate required fields
    if (!medication.userId) {
      throw new Error('Brak ID użytkownika');
    }
    if (!medication.name) {
      throw new Error('Brak nazwy leku');
    }
    if (!medication.activeSubstance) {
      throw new Error('Brak substancji czynnej');
    }

    // Prepare data for Firestore (remove undefined values)
    const medicationData: Record<string, unknown> = {
      userId: medication.userId,
      barcode: medication.barcode || '',
      name: medication.name,
      activeSubstance: medication.activeSubstance,
      dosage: medication.dosage || '',
      form: medication.form || 'tablet',
      packageSize: medication.packageSize || 30,
      currentQuantity: medication.currentQuantity || medication.packageSize || 30,
      addedAt: serverTimestamp(),
    };

    // Add optional fields only if they exist
    if (medication.manufacturer) {
      medicationData.manufacturer = medication.manufacturer;
    }
    if (medication.leafletUrl) {
      medicationData.leafletUrl = medication.leafletUrl;
    }
    if (medication.imageUrl) {
      medicationData.imageUrl = medication.imageUrl;
    }
    if (medication.expirationDate) {
      medicationData.expirationDate = Timestamp.fromDate(medication.expirationDate);
    }

    console.log('Saving to Firestore...');
    const docRef = await addDoc(collection(db, 'medications'), medicationData);
    console.log('Medication saved with ID:', docRef.id);

    return {
      ...medication,
      id: docRef.id,
      addedAt: new Date(),
    };
  } catch (error: any) {
    console.error('Error adding medication:', error);
    
    // Provide more helpful error messages
    if (error.code === 'permission-denied') {
      throw new Error('Brak uprawnień do zapisu. Sprawdź reguły Firestore.');
    } else if (error.code === 'unavailable') {
      throw new Error('Baza danych niedostępna. Sprawdź połączenie internetowe.');
    } else if (error.message?.includes('Firebase')) {
      throw new Error('Błąd Firebase: ' + error.message);
    }
    
    throw error;
  }
};

export const getMedicationsByUser = async (
  userId: string
): Promise<Medication[]> => {
  try {
    // Simple query without orderBy to avoid needing composite index
    const q = query(
      collection(db, 'medications'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const medications = snapshot.docs.map((doc) => {
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
        leafletUrl: data.leafletUrl,
        manufacturer: data.manufacturer,
        imageUrl: data.imageUrl,
        addedAt: data.addedAt?.toDate() || new Date(),
        expirationDate: data.expirationDate?.toDate(),
      };
    });
    
    // Sort client-side by addedAt descending
    return medications.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  } catch (error) {
    console.error('Error getting medications:', error);
    return [];
  }
};

export const updateMedication = async (
  medicationId: string,
  updates: Partial<Medication>
): Promise<void> => {
  await updateDoc(doc(db, 'medications', medicationId), updates);
};

export const deleteMedication = async (medicationId: string): Promise<void> => {
  await deleteDoc(doc(db, 'medications', medicationId));
};

// ============ SCHEDULES ============

export const addSchedule = async (
  schedule: Omit<Schedule, 'id'>
): Promise<Schedule> => {
  const docRef = await addDoc(collection(db, 'schedules'), {
    ...schedule,
    startDate: Timestamp.fromDate(schedule.startDate),
    endDate: schedule.endDate ? Timestamp.fromDate(schedule.endDate) : null,
  });

  return {
    ...schedule,
    id: docRef.id,
  };
};

export const getSchedulesByUser = async (
  userId: string
): Promise<Schedule[]> => {
  try {
    // Simple query - filter isActive client-side to avoid composite index
    const q = query(
      collection(db, 'schedules'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
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
    
    // Filter active schedules client-side
    return schedules.filter(s => s.isActive);
  } catch (error) {
    console.error('Error getting schedules:', error);
    return [];
  }
};

export const getSchedulesByMedication = async (
  medicationId: string
): Promise<Schedule[]> => {
  const q = query(
    collection(db, 'schedules'),
    where('medicationId', '==', medicationId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      medicationId: data.medicationId,
      userId: data.userId,
      times: data.times,
      daysOfWeek: data.daysOfWeek,
      dosageAmount: data.dosageAmount,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate(),
      reminderMinutesBefore: data.reminderMinutesBefore,
      isActive: data.isActive,
    };
  });
};

export const updateSchedule = async (
  scheduleId: string,
  updates: Partial<Schedule>
): Promise<void> => {
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.startDate) {
    updateData.startDate = Timestamp.fromDate(updates.startDate);
  }
  if (updates.endDate) {
    updateData.endDate = Timestamp.fromDate(updates.endDate);
  }

  await updateDoc(doc(db, 'schedules', scheduleId), updateData);
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  await deleteDoc(doc(db, 'schedules', scheduleId));
};

// ============ DOSE LOGS ============

export const createDoseLog = async (
  log: Omit<DoseLog, 'id'>
): Promise<DoseLog> => {
  const docRef = await addDoc(collection(db, 'doseLogs'), {
    ...log,
    scheduledTime: Timestamp.fromDate(log.scheduledTime),
    takenAt: log.takenAt ? Timestamp.fromDate(log.takenAt) : null,
  });

  return {
    ...log,
    id: docRef.id,
  };
};

export const getDoseLogsByUser = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DoseLog[]> => {
  try {
    // Simple query without orderBy to avoid needing composite index
    const q = query(
      collection(db, 'doseLogs'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        scheduleId: data.scheduleId,
        medicationId: data.medicationId,
        userId: data.userId,
        scheduledTime: data.scheduledTime?.toDate() || new Date(),
        takenAt: data.takenAt?.toDate(),
        status: data.status as DoseStatus,
        notes: data.notes,
      };
    });

    // Filter by date range if provided
    if (startDate) {
      logs = logs.filter((log) => log.scheduledTime >= startDate);
    }
    if (endDate) {
      logs = logs.filter((log) => log.scheduledTime <= endDate);
    }

    // Sort client-side by scheduledTime descending
    return logs.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
  } catch (error) {
    console.error('Error getting dose logs:', error);
    return [];
  }
};

export const getTodaysDoseLogs = async (userId: string): Promise<DoseLog[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getDoseLogsByUser(userId, today, tomorrow);
};

export const updateDoseLog = async (
  logId: string,
  updates: Partial<DoseLog>
): Promise<void> => {
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.scheduledTime) {
    updateData.scheduledTime = Timestamp.fromDate(updates.scheduledTime);
  }
  if (updates.takenAt) {
    updateData.takenAt = Timestamp.fromDate(updates.takenAt);
  }

  await updateDoc(doc(db, 'doseLogs', logId), updateData);
};

export const markDoseAsTaken = async (logId: string): Promise<void> => {
  await updateDoc(doc(db, 'doseLogs', logId), {
    status: 'taken',
    takenAt: serverTimestamp(),
  });
};

export const markDoseAsSkipped = async (
  logId: string,
  notes?: string
): Promise<void> => {
  await updateDoc(doc(db, 'doseLogs', logId), {
    status: 'skipped',
    notes: notes || 'Pominięto celowo',
  });
};

export const markDoseAsMissed = async (logId: string): Promise<void> => {
  await updateDoc(doc(db, 'doseLogs', logId), {
    status: 'missed',
  });
};
