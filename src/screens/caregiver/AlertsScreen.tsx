import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card } from '../../components';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useAuthStore, useCaregiverStore } from '../../store';
import { User, CaregiverAlert, Medication, Schedule, DoseStatus } from '../../types';
import { 
  getSeniorMedications, 
  getSeniorSchedules,
  getSeniorDoseStatuses,
} from '../../services/api/caregiverService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { generateDosesForDate, GeneratedDose } from '../../services/doses/doseGenerator';
import { checkAllInteractions, getSeverityLabel } from '../../services/interactions/interactionChecker';

interface AlertsScreenProps {
  navigation: any;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<CaregiverAlert[]>([]);
  const [seniors, setSeniors] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const user = useAuthStore((state) => state.user);
  const seniorMedications = useCaregiverStore((state) => state.seniorMedications);
  const setSeniorMedications = useCaregiverStore((state) => state.setSeniorMedications);
  const seniorDoseLogs = useCaregiverStore((state) => state.seniorDoseLogs);
  const setSeniorDoseLogs = useCaregiverStore((state) => state.setSeniorDoseLogs);

  const loadAlerts = async () => {
    if (!user) {
      setAlerts([]);
      return;
    }

    try {
      // Fetch fresh user data from Firebase to get latest seniorIds
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (!userDoc.exists()) {
        console.log('[AlertsScreen] User document not found');
        setAlerts([]);
        return;
      }

      const userData = userDoc.data();
      const seniorIds = userData.seniorIds || [];
      
      console.log('[AlertsScreen] Loaded seniorIds from Firebase:', seniorIds);
      
      if (seniorIds.length === 0) {
        console.log('[AlertsScreen] No seniors linked to this caregiver');
        setAlerts([]);
        return;
      }
      // Load senior data
      const seniorUsers: User[] = [];
      for (const seniorId of seniorIds) {
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

      const allAlerts: CaregiverAlert[] = [];
      const now = new Date();

      for (const senior of seniorUsers) {
        // Load medications and schedules
        const meds = await getSeniorMedications(senior.id);
        setSeniorMedications(senior.id, meds);
        
        const schedules = await getSeniorSchedules(senior.id);
        
        // Load dose statuses
        const today = startOfDay(new Date());
        const todayEnd = endOfDay(today);
        const doseStatuses = await getSeniorDoseStatuses(senior.id, today, todayEnd);

        // Generate today's doses from schedules
        const todaysDoses = generateDosesForDate(schedules, meds, new Date(), senior.id);
        
        // Apply saved statuses and check for missed doses
        for (const dose of todaysDoses) {
          const savedStatus = doseStatuses.get(dose.id);
          const currentStatus = savedStatus?.status || dose.status;
          
          // Check for missed doses (pending and overdue by 30+ minutes)
          const minutesOverdue = differenceInMinutes(now, dose.scheduledTime);
          if (
            (currentStatus === 'pending' && minutesOverdue > 30) ||
            currentStatus === 'missed'
          ) {
            const medication = meds.find((m) => m.id === dose.medicationId);
            allAlerts.push({
              id: `missed-${dose.id}`,
              seniorId: senior.id,
              seniorName: senior.name,
              type: 'missed_dose',
              medicationId: dose.medicationId,
              medicationName: medication?.name || 'Nieznany lek',
              message: `Pominięta dawka o ${format(dose.scheduledTime, 'HH:mm')}`,
              createdAt: dose.scheduledTime,
              isRead: false,
            });
          }
        }

        // Check for low stock medications (less than 5 remaining)
        console.log(`[AlertsScreen] Checking ${meds.length} medications for ${senior.name}`);
        for (const medication of meds) {
          console.log(`[AlertsScreen] ${medication.name}: currentQuantity = ${medication.currentQuantity}`);
          if (medication.currentQuantity < 5) {
            allAlerts.push({
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
        for (const medication of meds) {
          if (medication.expirationDate) {
            const daysUntilExpiry = Math.ceil(
              (medication.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
              allAlerts.push({
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

        // Check for drug interactions
        const interactions = checkAllInteractions(meds);
        for (const interaction of interactions) {
          allAlerts.push({
            id: `interaction-${senior.id}-${interaction.id}`,
            seniorId: senior.id,
            seniorName: senior.name,
            type: 'interaction' as any,
            medicationId: '',
            medicationName: `${interaction.substance1} + ${interaction.substance2}`,
            message: `${getSeverityLabel(interaction.severity)}: ${interaction.description}`,
            createdAt: now,
            isRead: false,
          });
        }
      }

      // Sort by creation date (newest first)
      allAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAlerts(allAlerts);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setIsLoaded(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleCallSenior = (alert: CaregiverAlert) => {
    const senior = seniors.find((s) => s.id === alert.seniorId);
    if (senior?.phone) {
      Alert.alert(
        `Kontakt z ${senior.name}`,
        `Zadzwonić pod numer ${senior.phone}?`,
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Zadzwoń', onPress: () => Linking.openURL(`tel:${senior.phone}`) },
        ]
      );
    } else {
      Alert.alert('Brak numeru', 'Ten senior nie ma zapisanego numeru telefonu.');
    }
  };

  const handleViewSenior = (seniorId: string) => {
    navigation.navigate('SeniorDetail', { seniorId });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'missed_dose':
        return 'alert-circle';
      case 'low_stock':
        return 'warning';
      case 'expiring':
        return 'time';
      case 'interaction':
        return 'flask';
      default:
        return 'information-circle';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'missed_dose':
        return Colors.error;
      case 'low_stock':
        return Colors.warning;
      case 'expiring':
        return '#F59E0B'; // amber
      case 'interaction':
        return '#DC2626'; // red for dangerous interactions
      default:
        return Colors.info;
    }
  };

  const getAlertLabel = (type: string) => {
    switch (type) {
      case 'missed_dose':
        return 'Pominięta dawka';
      case 'low_stock':
        return 'Niski stan';
      case 'expiring':
        return 'Wygasa';
      default:
        return 'Powiadomienie';
    }
  };

  const formatAlertDate = (date: Date) => {
    if (isToday(date)) {
      return `Dziś, ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Wczoraj, ${format(date, 'HH:mm')}`;
    }
    return format(date, 'd MMM, HH:mm', { locale: pl });
  };

  const renderAlertItem = ({ item: alert }: { item: CaregiverAlert }) => {
    const color = getAlertColor(alert.type);

    return (
      <Card style={{...styles.alertCard, borderLeftColor: color}}>
        <View style={styles.alertHeader}>
          <View style={[styles.alertIconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={getAlertIcon(alert.type)} size={20} color={color} />
          </View>
          <View style={styles.alertInfo}>
            <View style={styles.alertTitleRow}>
              <Text style={[styles.alertLabel, { color }]}>{getAlertLabel(alert.type)}</Text>
              <Text style={styles.alertTime}>{formatAlertDate(alert.createdAt)}</Text>
            </View>
            <Text style={styles.alertSenior}>{alert.seniorName}</Text>
          </View>
        </View>

        <View style={styles.alertBody}>
          {alert.medicationName && (
            <View style={styles.medicationRow}>
              <Ionicons name="medical" size={16} color={Colors.primary[500]} />
              <Text style={styles.medicationName}>{alert.medicationName}</Text>
            </View>
          )}
          <Text style={styles.alertMessage}>{alert.message}</Text>
        </View>

        <View style={styles.alertActions}>
          <TouchableOpacity
            style={styles.alertAction}
            onPress={() => handleCallSenior(alert)}
          >
            <Ionicons name="call" size={18} color={Colors.primary[500]} />
            <Text style={styles.alertActionText}>Zadzwoń</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.alertAction}
            onPress={() => handleViewSenior(alert.seniorId)}
          >
            <Ionicons name="eye" size={18} color={Colors.primary[500]} />
            <Text style={styles.alertActionText}>Szczegóły</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  // Group alerts by type
  const missedDoses = alerts.filter((a) => a.type === 'missed_dose');
  const lowStock = alerts.filter((a) => a.type === 'low_stock');
  const expiring = alerts.filter((a) => a.type === 'expiring');

  if (isLoaded && seniors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="notifications-off-outline" size={64} color={Colors.neutral[300]} />
        </View>
        <Text style={styles.emptyTitle}>Brak powiadomień</Text>
        <Text style={styles.emptyText}>
          Dodaj podopiecznego, aby otrzymywać powiadomienia o przyjmowaniu leków.
        </Text>
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: Colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
        </View>
        <Text style={styles.emptyTitle}>Wszystko w porządku!</Text>
        <Text style={styles.emptyText}>
          Twoi podopieczni przyjmują leki zgodnie z harmonogramem.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={Colors.primary[500]} />
          <Text style={styles.refreshButtonText}>Odśwież</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.summaryText}>{missedDoses.length} pominiętych</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: Colors.warning }]} />
          <Text style={styles.summaryText}>{lowStock.length} niski stan</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.summaryText}>{expiring.length} wygasa</Text>
        </View>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  alertCard: {
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  alertLabel: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  alertTime: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  alertSenior: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  alertBody: {
    marginBottom: Spacing.md,
    paddingLeft: 44,
  },
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  medicationName: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  alertMessage: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertActionText: {
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  refreshButtonText: {
    ...Typography.body,
    color: Colors.primary[500],
    fontWeight: '600',
  },
});

export default AlertsScreen;
