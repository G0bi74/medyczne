import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, DoseCard, Button } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useCaregiverStore } from '../../store';
import { User, DoseLog, Medication, Schedule, DoseStatus } from '../../types';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { generateDosesForDate, GeneratedDose } from '../../services/doses/doseGenerator';

interface MonitoringDashboardProps {
  navigation: any;
}

// Store generated doses per senior
interface SeniorDoses {
  [seniorId: string]: GeneratedDose[];
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  navigation,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [seniorDoses, setSeniorDoses] = useState<SeniorDoses>({});
  const [seniorSchedules, setSeniorSchedules] = useState<{ [id: string]: Schedule[] }>({});
  
  const user = useAuthStore((state) => state.user);
  const seniors = useCaregiverStore((state) => state.seniors);
  const setSeniors = useCaregiverStore((state) => state.setSeniors);
  const seniorMedications = useCaregiverStore((state) => state.seniorMedications);
  const setSeniorMedications = useCaregiverStore((state) => state.setSeniorMedications);
  const seniorDoseLogs = useCaregiverStore((state) => state.seniorDoseLogs);
  const setSeniorDoseLogs = useCaregiverStore((state) => state.setSeniorDoseLogs);

  const loadData = async () => {
    if (!user || !user.seniorIds || user.seniorIds.length === 0) return;

    try {
      // Load senior users
      const seniorUsers: User[] = [];
      
      for (const seniorId of user.seniorIds) {
        const seniorDoc = await getDoc(doc(db, 'users', seniorId));
        if (seniorDoc.exists()) {
          const data = seniorDoc.data();
          seniorUsers.push({
            id: seniorDoc.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: data.role,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      }
      
      setSeniors(seniorUsers);

      const allSeniorDoses: SeniorDoses = {};
      const allSeniorSchedules: { [id: string]: Schedule[] } = {};

      // Load medications, schedules, and dose statuses for each senior
      for (const senior of seniorUsers) {
        // Load medications
        const medsQuery = query(
          collection(db, 'medications'),
          where('userId', '==', senior.id)
        );
        const medsSnapshot = await getDocs(medsQuery);
        const medications: Medication[] = medsSnapshot.docs.map((doc) => {
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
          };
        });
        setSeniorMedications(senior.id, medications);

        // Load schedules
        const schedsQuery = query(
          collection(db, 'schedules'),
          where('userId', '==', senior.id)
        );
        const schedsSnapshot = await getDocs(schedsQuery);
        const schedules: Schedule[] = schedsSnapshot.docs.map((doc) => {
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
        }).filter(s => s.isActive);
        
        allSeniorSchedules[senior.id] = schedules;

        // Load dose statuses for today
        const today = startOfDay(new Date());
        const tomorrow = endOfDay(today);
        
        const statusesQuery = query(
          collection(db, 'doseStatuses'),
          where('userId', '==', senior.id)
        );
        const statusesSnapshot = await getDocs(statusesQuery);
        const statusesMap = new Map<string, { status: DoseStatus; takenAt?: Date }>();
        
        statusesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const scheduledTime = data.scheduledTime?.toDate();
          if (scheduledTime && isToday(scheduledTime)) {
            statusesMap.set(doc.id, {
              status: data.status,
              takenAt: data.takenAt?.toDate(),
            });
          }
        });

        // Generate today's doses from schedules
        const todaysDoses = generateDosesForDate(schedules, medications, new Date(), senior.id);
        
        // Apply saved statuses
        const dosesWithStatuses = todaysDoses.map(dose => {
          const savedStatus = statusesMap.get(dose.id);
          if (savedStatus) {
            return {
              ...dose,
              status: savedStatus.status,
              takenAt: savedStatus.takenAt,
            };
          }
          return dose;
        });
        
        allSeniorDoses[senior.id] = dosesWithStatuses;
        
        // Also set as DoseLog for compatibility with existing code
        const logsForStore: DoseLog[] = dosesWithStatuses.map(dose => ({
          id: dose.id,
          scheduleId: dose.scheduleId,
          medicationId: dose.medicationId,
          userId: dose.userId,
          scheduledTime: dose.scheduledTime,
          takenAt: dose.takenAt,
          status: dose.status,
        }));
        setSeniorDoseLogs(senior.id, logsForStore);
      }
      
      setSeniorDoses(allSeniorDoses);
      setSeniorSchedules(allSeniorSchedules);
    } catch (error) {
      console.error('Error loading caregiver data:', error);
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

  const getSeniorStatus = (seniorId: string) => {
    const doses = seniorDoses[seniorId] || seniorDoseLogs[seniorId] || [];
    const pending = doses.filter((d) => d.status === 'pending');
    const taken = doses.filter((d) => d.status === 'taken');
    const missed = doses.filter((d) => d.status === 'missed');
    
    return {
      total: doses.length,
      pending: pending.length,
      taken: taken.length,
      missed: missed.length,
      percentage: doses.length > 0 ? Math.round((taken.length / doses.length) * 100) : 0,
    };
  };

  const getMissedAlerts = () => {
    const alerts: { senior: User; dose: DoseLog; medication?: Medication }[] = [];
    
    for (const senior of seniors) {
      const doses = seniorDoses[senior.id] || seniorDoseLogs[senior.id] || [];
      const medications = seniorMedications[senior.id] || [];
      
      for (const dose of doses) {
        // Check if dose is overdue (pending and past scheduled time by more than 30 minutes)
        if (
          dose.status === 'pending' &&
          differenceInMinutes(new Date(), dose.scheduledTime) > 30
        ) {
          alerts.push({
            senior,
            dose: { ...dose, status: 'missed' },
            medication: medications.find((m) => m.id === dose.medicationId),
          });
        }
        
        if (dose.status === 'missed') {
          alerts.push({
            senior,
            dose: dose as DoseLog,
            medication: medications.find((m) => m.id === dose.medicationId),
          });
        }
      }
    }
    
    return alerts.sort(
      (a, b) => b.dose.scheduledTime.getTime() - a.dose.scheduledTime.getTime()
    );
  };

  const missedAlerts = getMissedAlerts();

  const handleContactSenior = (senior: User) => {
    if (senior.phone) {
      Alert.alert(
        `Kontakt z ${senior.name}`,
        `Zadzwonić pod numer ${senior.phone}?`,
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Zadzwoń', onPress: () => {} }, // Would open phone dialer
        ]
      );
    } else {
      Alert.alert('Brak numeru', 'Ten senior nie ma zapisanego numeru telefonu.');
    }
  };

  const renderSeniorCard = (senior: User) => {
    const status = getSeniorStatus(senior.id);
    const medications = seniorMedications[senior.id] || [];
    const hasAlerts = missedAlerts.some((a) => a.senior.id === senior.id);

    return (
      <Card key={senior.id} style={styles.seniorCard}>
        <View style={styles.seniorHeader}>
          <View style={styles.seniorAvatar}>
            <Text style={styles.seniorInitials}>
              {senior.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          <View style={styles.seniorInfo}>
            <View style={styles.seniorNameRow}>
              <Text style={styles.seniorName}>{senior.name}</Text>
              {hasAlerts && (
                <View style={styles.alertBadge}>
                  <Ionicons name="alert" size={12} color={Colors.text.inverse} />
                </View>
              )}
            </View>
            <Text style={styles.seniorMeds}>
              {medications.length} {medications.length === 1 ? 'lek' : 'leków'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContactSenior(senior)}
          >
            <Ionicons name="call-outline" size={20} color={Colors.primary[500]} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Dzisiejsze postępy</Text>
            <Text style={styles.progressPercentage}>{status.percentage}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${status.percentage}%` }]}
            />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.statText}>
                Przyjęte: {status.taken}/{status.total}
              </Text>
            </View>
            {status.missed > 0 && (
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
                <Text style={[styles.statText, { color: Colors.error }]}>
                  Pominięte: {status.missed}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => navigation.navigate('SeniorDetail', { seniorId: senior.id })}
        >
          <Text style={styles.viewDetailsText}>Zobacz szczegóły</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      </Card>
    );
  };

  if (!user?.seniorIds || user.seniorIds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="people-outline" size={64} color={Colors.neutral[300]} />
        </View>
        <Text style={styles.emptyTitle}>Brak podopiecznych</Text>
        <Text style={styles.emptyText}>
          Poproś seniora o dodanie Cię jako opiekuna w ustawieniach jego aplikacji.
        </Text>
        <Button
          title="Jak to działa?"
          variant="outline"
          onPress={() => {}}
        />
      </View>
    );
  }

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
        <Text style={styles.greeting}>Panel opiekuna</Text>
        <Text style={styles.subtitle}>
          {format(new Date(), "EEEE, d MMMM", { locale: pl })}
        </Text>
      </View>

      {/* Alerts Section */}
      {missedAlerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.alertTitleContainer}>
              <Ionicons name="warning" size={20} color={Colors.error} />
              <Text style={styles.alertTitle}>
                Pominięte dawki ({missedAlerts.length})
              </Text>
            </View>
          </View>

          {missedAlerts.slice(0, 3).map((alert, index) => (
            <Card
              key={`${alert.senior.id}-${alert.dose.id}-${index}`}
              style={styles.alertCard}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertSeniorName}>{alert.senior.name}</Text>
                <Text style={styles.alertTime}>
                  {format(alert.dose.scheduledTime, 'HH:mm')}
                </Text>
              </View>
              <View style={styles.alertBody}>
                <Ionicons name="medical" size={18} color={Colors.error} />
                <Text style={styles.alertMedName}>
                  {alert.medication?.name || 'Lek'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.alertAction}
                onPress={() => handleContactSenior(alert.senior)}
              >
                <Ionicons name="call" size={16} color={Colors.primary[500]} />
                <Text style={styles.alertActionText}>Zadzwoń</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}

      {/* Seniors List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Twoi podopieczni ({seniors.length})
        </Text>
        {seniors.map(renderSeniorCard)}
      </View>

      {/* Quick Tips */}
      <Card style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb-outline" size={24} color={Colors.warning} />
          <Text style={styles.tipsTitle}>Wskazówka</Text>
        </View>
        <Text style={styles.tipsText}>
          Regularnie sprawdzaj postępy swoich podopiecznych. W razie pominięcia
          dawki, skontaktuj się z nimi telefonicznie.
        </Text>
      </Card>
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
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.h1,
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
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
    marginBottom: Spacing.sm,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertTitle: {
    ...Typography.h3,
    color: Colors.error,
  },
  alertCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  alertSeniorName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  alertTime: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  alertBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  alertMedName: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-end',
  },
  alertActionText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  seniorCard: {
    marginBottom: Spacing.md,
  },
  seniorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seniorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  seniorInitials: {
    ...Typography.bodyBold,
    color: Colors.primary[600],
  },
  seniorInfo: {
    flex: 1,
  },
  seniorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  seniorName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  alertBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seniorMeds: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  progressPercentage: {
    ...Typography.bodyBold,
    color: Colors.primary[500],
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.full,
  },
  progressStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
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
    color: Colors.text.secondary,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    gap: Spacing.xs,
  },
  viewDetailsText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.secondary,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  tipsCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    ...Typography.bodyBold,
    color: '#F59E0B',
  },
  tipsText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});

export default MonitoringDashboard;
