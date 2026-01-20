import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfDay, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, DoseCard, InteractionAlert } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useMedicationStore, useScheduleStore } from '../../store';
import {
  getMedicationsByUser,
  getSchedulesByUser,
} from '../../services/api/medicationService';
import {
  checkAllInteractions,
} from '../../services/interactions/interactionChecker';
import {
  generateTodaysDoses,
  GeneratedDose,
  markDoseAsTakenWithPersistence,
  markDoseAsSkippedWithPersistence,
  calculateProgress,
  loadDoseStatusesFromFirebase,
} from '../../services/doses/doseGenerator';
import { DrugInteraction } from '../../types';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [todaysDoses, setTodaysDoses] = useState<GeneratedDose[]>([]);
  
  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const setMedications = useMedicationStore((state) => state.setMedications);
  const schedules = useScheduleStore((state) => state.schedules);
  const setSchedules = useScheduleStore((state) => state.setSchedules);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // First, load saved dose statuses from Firebase for today
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);
      await loadDoseStatusesFromFirebase(user.id, today, tomorrow);
      
      const [meds, scheds] = await Promise.all([
        getMedicationsByUser(user.id),
        getSchedulesByUser(user.id),
      ]);
      
      setMedications(meds);
      setSchedules(scheds);
      
      // Generate doses from schedules dynamically
      const doses = generateTodaysDoses(scheds, meds, user.id);
      setTodaysDoses(doses);
      
      // Check for drug interactions
      const foundInteractions = checkAllInteractions(meds);
      setInteractions(foundInteractions);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Regenerate doses when schedules or medications change
  const regenerateDoses = useCallback(() => {
    if (user && schedules.length > 0) {
      const doses = generateTodaysDoses(schedules, medications, user.id);
      setTodaysDoses(doses);
    }
  }, [schedules, medications, user]);

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
    setTodaysDoses(prev => 
      prev.map(d => d.id === dose.id ? { ...d, status: 'taken', takenAt: new Date() } : d)
    );
    
    // Decrease medication quantity
    const medication = medications.find(m => m.id === dose.medicationId);
    if (medication && medication.currentQuantity > 0) {
      const newQuantity = medication.currentQuantity - 1;
      updateMedicationInStore(dose.medicationId, { currentQuantity: newQuantity });
      
      // Also update in Firebase (fire and forget - don't await)
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
    setTodaysDoses(prev => 
      prev.map(d => d.id === dose.id ? { ...d, status: 'skipped' } : d)
    );
  };

  const progress = calculateProgress(todaysDoses);
  const pendingDoses = todaysDoses.filter((d) => d.status === 'pending');
  const missedDoses = todaysDoses.filter((d) => d.status === 'missed');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Miłego popołudnia';
    return 'Dobry wieczór';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'Użytkownik'} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.text.primary} />
          {missedDoses.length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{missedDoses.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Date */}
      <Text style={styles.date}>
        {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
      </Text>

      {/* Progress Card */}
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Dzisiejszy postęp</Text>
          <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress.percentage}%` }]} />
        </View>
        
        <View style={styles.progressStats}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.statText}>Przyjęte: {progress.taken}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: Colors.info }]} />
            <Text style={styles.statText}>Oczekuje: {progress.pending}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
            <Text style={styles.statText}>Pominięte: {progress.missed}</Text>
          </View>
        </View>
      </Card>

      {/* Drug Interactions Warning */}
      {interactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Interakcje lekowe</Text>
          {interactions.slice(0, 2).map((interaction) => (
            <InteractionAlert key={interaction.id} interaction={interaction} />
          ))}
          {interactions.length > 2 && (
            <TouchableOpacity style={styles.showMoreButton}>
              <Text style={styles.showMoreText}>
                Zobacz wszystkie ({interactions.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Upcoming Doses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nadchodzące dawki</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.seeAllText}>Zobacz wszystkie</Text>
          </TouchableOpacity>
        </View>
        
        {pendingDoses.length > 0 ? (
          pendingDoses.slice(0, 3).map((dose) => {
            const medication = medications.find((m) => m.id === dose.medicationId);
            return (
              <DoseCard
                key={dose.id}
                dose={dose}
                medication={medication}
                onTake={() => handleTakeDose(dose)}
                onSkip={() => handleSkipDose(dose)}
              />
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>Wszystko zrobione!</Text>
            <Text style={styles.emptySubtitle}>
              Na dziś nie masz więcej leków do przyjęcia
            </Text>
          </Card>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Szybkie akcje</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('ScanMedication')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary[100] }]}>
              <Ionicons name="scan-outline" size={24} color={Colors.primary[600]} />
            </View>
            <Text style={styles.quickActionText}>Skanuj lek</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Medications')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.secondary[100] }]}>
              <Ionicons name="medical-outline" size={24} color={Colors.secondary[600]} />
            </View>
            <Text style={styles.quickActionText}>Moje leki</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Schedule')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.info + '20' }]}>
              <Ionicons name="calendar-outline" size={24} color={Colors.info} />
            </View>
            <Text style={styles.quickActionText}>Harmonogram</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Medications Overview */}
      {medications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Twoje leki ({medications.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Medications')}>
              <Text style={styles.seeAllText}>Zarządzaj</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.medicationsScroll}
          >
            {medications.slice(0, 5).map((medication) => (
              <TouchableOpacity
                key={medication.id}
                style={styles.medicationPill}
                onPress={() =>
                  navigation.navigate('MedicationDetail', { medicationId: medication.id })
                }
              >
                <Ionicons name="medical-outline" size={18} color={Colors.primary[500]} />
                <Text style={styles.medicationPillText} numberOfLines={1}>
                  {medication.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  greeting: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  userName: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    ...Typography.small,
    color: Colors.text.inverse,
    fontWeight: '700',
    fontSize: 10,
  },
  date: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.lg,
    textTransform: 'capitalize',
  },
  progressCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary[500],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    ...Typography.bodyBold,
    color: Colors.text.inverse,
  },
  progressPercentage: {
    ...Typography.h2,
    color: Colors.text.inverse,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.full,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    ...Typography.small,
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  showMoreText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    ...Typography.small,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  medicationsScroll: {
    gap: Spacing.sm,
  },
  medicationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    ...Shadows.sm,
    maxWidth: 150,
  },
  medicationPillText: {
    ...Typography.caption,
    color: Colors.text.primary,
    fontWeight: '500',
  },
});

export default DashboardScreen;
