import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { DoseCard, Card } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useMedicationStore, useScheduleStore } from '../../store';
import {
  getMedicationsByUser,
  getSchedulesByUser,
} from '../../services/api/medicationService';
import {
  generateDosesForDate,
  GeneratedDose,
  markDoseAsTakenWithPersistence,
  markDoseAsSkippedWithPersistence,
  loadDoseStatusesFromFirebase,
} from '../../services/doses/doseGenerator';

interface ScheduleScreenProps {
  navigation: any;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [allDoses, setAllDoses] = useState<Map<string, GeneratedDose[]>>(new Map());
  
  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const setMedications = useMedicationStore((state) => state.setMedications);
  const schedules = useScheduleStore((state) => state.schedules);
  const setSchedules = useScheduleStore((state) => state.setSchedules);

  useEffect(() => {
    // Generate week dates starting from today
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(today, i));
    }
    setWeekDates(dates);
  }, []);

  const generateAllDoses = (scheds = schedules, meds = medications) => {
    if (!user) return;
    
    const dosesMap = new Map<string, GeneratedDose[]>();
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const doses = generateDosesForDate(scheds, meds, date, user.id);
      dosesMap.set(dateKey, doses);
    }
    
    setAllDoses(dosesMap);
  };

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load saved dose statuses for the week
      const today = startOfDay(new Date());
      const weekEnd = addDays(today, 7);
      await loadDoseStatusesFromFirebase(user.id, today, weekEnd);
      
      const [meds, scheds] = await Promise.all([
        getMedicationsByUser(user.id),
        getSchedulesByUser(user.id),
      ]);
      
      setMedications(meds);
      setSchedules(scheds);
      generateAllDoses(scheds, meds);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateMedicationInStore = useMedicationStore((state) => state.updateMedication);

  const handleTakeDose = async (dose: GeneratedDose) => {
    // Save to Firebase for persistence
    await markDoseAsTakenWithPersistence(dose);
    
    // Update dose status in local state
    const dateKey = format(dose.scheduledTime, 'yyyy-MM-dd');
    setAllDoses(prev => {
      const newMap = new Map(prev);
      const dateDoses = newMap.get(dateKey) || [];
      newMap.set(dateKey, dateDoses.map(d => 
        d.id === dose.id ? { ...d, status: 'taken' as const, takenAt: new Date() } : d
      ));
      return newMap;
    });
    
    // Decrease medication quantity
    const medication = medications.find(m => m.id === dose.medicationId);
    if (medication && medication.currentQuantity > 0) {
      const newQuantity = medication.currentQuantity - 1;
      updateMedicationInStore(dose.medicationId, { currentQuantity: newQuantity });
      
      // Also update in Firebase (fire and forget)
      import('../../services/api/medicationService').then(({ updateMedication }) => {
        updateMedication(dose.medicationId, { currentQuantity: newQuantity }).catch(err => {
          console.log('Failed to update medication quantity in Firebase:', err);
        });
      });
    }
  };

  const handleSkipDose = async (dose: GeneratedDose) => {
    // Save to Firebase for persistence
    await markDoseAsSkippedWithPersistence(dose);
    
    // Update local state
    const dateKey = format(dose.scheduledTime, 'yyyy-MM-dd');
    setAllDoses(prev => {
      const newMap = new Map(prev);
      const dateDoses = newMap.get(dateKey) || [];
      newMap.set(dateKey, dateDoses.map(d => 
        d.id === dose.id ? { ...d, status: 'skipped' as const } : d
      ));
      return newMap;
    });
  };

  // Get doses for selected date
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateDoses = allDoses.get(selectedDateKey) || [];

  // Group doses by time
  const groupedDoses = selectedDateDoses.reduce((groups, dose) => {
    const time = format(dose.scheduledTime, 'HH:mm');
    if (!groups[time]) {
      groups[time] = [];
    }
    groups[time].push(dose);
    return groups;
  }, {} as Record<string, GeneratedDose[]>);

  const renderDateItem = ({ item }: { item: Date }) => {
    const isSelected = isSameDay(item, selectedDate);
    const isToday = isSameDay(item, new Date());
    const dateKey = format(item, 'yyyy-MM-dd');
    const dayDoses = allDoses.get(dateKey) || [];
    const hasPending = dayDoses.some((d) => d.status === 'pending');
    const allComplete = dayDoses.length > 0 && dayDoses.every((d) => d.status === 'taken');

    return (
      <TouchableOpacity
        style={[
          styles.dateItem,
          isSelected && styles.dateItemSelected,
          isToday && !isSelected && styles.dateItemToday,
        ]}
        onPress={() => setSelectedDate(item)}
      >
        <Text
          style={[
            styles.dayName,
            isSelected && styles.dayNameSelected,
          ]}
        >
          {format(item, 'EEE', { locale: pl })}
        </Text>
        <Text
          style={[
            styles.dayNumber,
            isSelected && styles.dayNumberSelected,
          ]}
        >
          {format(item, 'd')}
        </Text>
        {dayDoses.length > 0 && (
          <View
            style={[
              styles.doseDot,
              allComplete && { backgroundColor: Colors.success },
              hasPending && { backgroundColor: Colors.info },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.monthYear}>
            {format(selectedDate, 'LLLL yyyy', { locale: pl })}
          </Text>
        </View>
        
        <FlatList
          data={weekDates}
          renderItem={renderDateItem}
          keyExtractor={(item) => item.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesList}
        />
      </View>

      {/* Doses for selected date */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.selectedDateText}>
          {format(selectedDate, "EEEE, d MMMM", { locale: pl })}
        </Text>

        {selectedDateDoses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Brak zaplanowanych dawek</Text>
            <Text style={styles.emptyText}>
              Na ten dzień nie masz zaplanowanych żadnych leków.
            </Text>
          </Card>
        ) : (
          Object.entries(groupedDoses).map(([time, doses]) => (
            <View key={time} style={styles.timeGroup}>
              <View style={styles.timeHeader}>
                <Ionicons name="time-outline" size={18} color={Colors.text.secondary} />
                <Text style={styles.timeText}>{time}</Text>
              </View>
              
              {doses.map((dose) => {
                const medication = medications.find((m) => m.id === dose.medicationId);
                const isPast = dose.scheduledTime < new Date() && dose.status === 'pending';
                
                return (
                  <DoseCard
                    key={dose.id}
                    dose={{
                      ...dose,
                      status: isPast ? 'missed' : dose.status,
                    }}
                    medication={medication}
                    onTake={dose.status === 'pending' ? () => handleTakeDose(dose) : undefined}
                    onSkip={dose.status === 'pending' ? () => handleSkipDose(dose) : undefined}
                  />
                );
              })}
            </View>
          ))
        )}

        {/* Active Schedules */}
        <View style={styles.schedulesSection}>
          <View style={styles.schedulesHeader}>
            <Text style={styles.sectionTitle}>Aktywne harmonogramy</Text>
            <TouchableOpacity>
              <Text style={styles.manageText}>Zarządzaj</Text>
            </TouchableOpacity>
          </View>

          {schedules.length === 0 ? (
            <Text style={styles.noSchedulesText}>
              Brak aktywnych harmonogramów. Dodaj lek i ustaw przypomnienia.
            </Text>
          ) : (
            schedules.slice(0, 3).map((schedule) => {
              const medication = medications.find((m) => m.id === schedule.medicationId);
              return (
                <Card key={schedule.id} style={styles.scheduleCard}>
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleMedName}>
                        {medication?.name || 'Lek'}
                      </Text>
                      <Text style={styles.scheduleDosage}>
                        {schedule.dosageAmount}
                      </Text>
                    </View>
                    <View style={styles.scheduleTimes}>
                      {schedule.times.slice(0, 3).map((time, index) => (
                        <View key={index} style={styles.timeChip}>
                          <Text style={styles.timeChipText}>{time}</Text>
                        </View>
                      ))}
                      {schedule.times.length > 3 && (
                        <Text style={styles.moreTimesText}>
                          +{schedule.times.length - 3}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  calendarContainer: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  monthYear: {
    ...Typography.h3,
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  datesList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  dateItem: {
    width: 56,
    height: 76,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  dateItemSelected: {
    backgroundColor: Colors.primary[500],
  },
  dateItemToday: {
    borderWidth: 2,
    borderColor: Colors.primary[300],
  },
  dayName: {
    ...Typography.small,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  dayNameSelected: {
    color: Colors.text.inverse,
  },
  dayNumber: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: 2,
  },
  dayNumberSelected: {
    color: Colors.text.inverse,
  },
  doseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral[300],
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  selectedDateText: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textTransform: 'capitalize',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  timeGroup: {
    marginBottom: Spacing.lg,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  timeText: {
    ...Typography.bodyBold,
    color: Colors.text.secondary,
  },
  schedulesSection: {
    marginTop: Spacing.lg,
  },
  schedulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  manageText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  noSchedulesText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  scheduleCard: {
    marginBottom: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleMedName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  scheduleDosage: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  scheduleTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeChip: {
    backgroundColor: Colors.primary[100],
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  timeChipText: {
    ...Typography.small,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  moreTimesText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
});

export default ScheduleScreen;
