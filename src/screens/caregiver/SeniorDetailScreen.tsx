import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, subDays, startOfDay, endOfDay, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, DoseCard } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useCaregiverStore } from '../../store';
import { User, Medication, Schedule, DoseStatus, DrugInteraction } from '../../types';
import { 
  getSeniorUser, 
  getSeniorMedications, 
  getSeniorSchedules,
  getSeniorDoseStatuses,
} from '../../services/api/caregiverService';
import {
  generateDosesForDate,
  GeneratedDose,
} from '../../services/doses/doseGenerator';
import { checkAllInteractions, getSeverityColor, getSeverityLabel } from '../../services/interactions/interactionChecker';

interface SeniorDetailScreenProps {
  navigation: any;
  route: { params: { seniorId: string } };
}

export const SeniorDetailScreen: React.FC<SeniorDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { seniorId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [senior, setSenior] = useState<User | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [todaysDoses, setTodaysDoses] = useState<GeneratedDose[]>([]);
  const [weekStats, setWeekStats] = useState({ taken: 0, total: 0 });
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load senior user data
      const seniorData = await getSeniorUser(seniorId);
      if (seniorData) {
        setSenior(seniorData);
      }

      // Load medications and schedules
      const [meds, scheds] = await Promise.all([
        getSeniorMedications(seniorId),
        getSeniorSchedules(seniorId),
      ]);
      setMedications(meds);
      setSchedules(scheds);

      // Load dose statuses from Firebase
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(today);
      const weekStart = subDays(today, 7);
      
      const doseStatuses = await getSeniorDoseStatuses(seniorId, weekStart, addDays(today, 1));

      // Generate today's doses from schedules with saved statuses
      const todaysGenerated = generateDosesForDate(scheds, meds, new Date(), seniorId);
      
      // Apply saved statuses to generated doses
      const todaysWithStatuses = todaysGenerated.map(dose => {
        const savedStatus = doseStatuses.get(dose.id);
        if (savedStatus) {
          return {
            ...dose,
            status: savedStatus.status as DoseStatus,
            takenAt: savedStatus.takenAt,
          };
        }
        return dose;
      });
      
      setTodaysDoses(todaysWithStatuses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()));

      // Calculate week stats from generated doses with saved statuses
      let weekTaken = 0;
      let weekTotal = 0;
      
      for (let i = -7; i <= 0; i++) {
        const date = addDays(today, i);
        const dayDoses = generateDosesForDate(scheds, meds, date, seniorId);
        
        dayDoses.forEach(dose => {
          weekTotal++;
          const savedStatus = doseStatuses.get(dose.id);
          if (savedStatus?.status === 'taken') {
            weekTaken++;
          }
        });
      }
      
      setWeekStats({ taken: weekTaken, total: weekTotal });

      // Check for drug interactions
      const interactions = checkAllInteractions(meds);
      setDrugInteractions(interactions);

    } catch (error) {
      console.error('Error loading senior data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [seniorId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCall = () => {
    if (senior?.phone) {
      Linking.openURL(`tel:${senior.phone}`);
    } else {
      Alert.alert('Brak numeru', 'Ten senior nie ma zapisanego numeru telefonu.');
    }
  };

  const getMedicationName = (medicationId: string) => {
    const med = medications.find((m) => m.id === medicationId);
    return med?.name || 'Nieznany lek';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return Colors.success;
      case 'missed':
        return Colors.error;
      case 'skipped':
        return Colors.warning;
      default:
        return Colors.neutral[400];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'taken':
        return 'Przyjęty';
      case 'missed':
        return 'Pominięty';
      case 'skipped':
        return 'Pominięty';
      case 'pending':
        return 'Oczekujący';
      default:
        return status;
    }
  };

  const weekPercentage = weekStats.total > 0 
    ? Math.round((weekStats.taken / weekStats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  if (!senior) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Nie znaleziono podopiecznego</Text>
      </View>
    );
  }

  const initials = senior.name.split(' ').map((n) => n[0]).join('').toUpperCase();

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
      {/* Header with senior info */}
      <Card style={styles.headerCard}>
        <View style={styles.seniorHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.seniorInfo}>
            <Text style={styles.seniorName}>{senior.name}</Text>
            {senior.phone && (
              <Text style={styles.seniorPhone}>{senior.phone}</Text>
            )}
            <Text style={styles.seniorEmail}>{senior.email}</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Ionicons name="call" size={24} color={Colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Drug Interactions Warning */}
      {drugInteractions.length > 0 && (
        <Card style={styles.interactionsCard}>
          <View style={styles.interactionsHeader}>
            <Ionicons name="warning" size={24} color={Colors.error} />
            <Text style={styles.interactionsTitle}>
              ⚠️ Wykryto interakcje lekowe ({drugInteractions.length})
            </Text>
          </View>
          {drugInteractions.map((interaction) => (
            <View key={interaction.id} style={styles.interactionItem}>
              <View style={[
                styles.severityBadge, 
                { backgroundColor: getSeverityColor(interaction.severity) + '20' }
              ]}>
                <Text style={[
                  styles.severityText, 
                  { color: getSeverityColor(interaction.severity) }
                ]}>
                  {getSeverityLabel(interaction.severity)}
                </Text>
              </View>
              <Text style={styles.interactionSubstances}>
                {interaction.substance1} + {interaction.substance2}
              </Text>
              <Text style={styles.interactionDescription}>
                {interaction.description}
              </Text>
              <Text style={styles.interactionRecommendation}>
                💡 {interaction.recommendation}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Week stats */}
      <Card style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Statystyki (ostatnie 7 dni)</Text>
        <View style={styles.statsContent}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>{weekPercentage}%</Text>
            <Text style={styles.progressLabel}>przyjętych</Text>
          </View>
          <View style={styles.statsDetails}>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.statText}>Przyjęte: {weekStats.taken}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.statText}>Pominięte: {weekStats.total - weekStats.taken}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: Colors.neutral[300] }]} />
              <Text style={styles.statText}>Wszystkie: {weekStats.total}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Today's doses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dzisiejsze dawki</Text>
        {todaysDoses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>Brak zaplanowanych dawek na dziś</Text>
          </Card>
        ) : (
          todaysDoses.map((dose) => (
            <Card key={dose.id} style={styles.doseCard}>
              <View style={styles.doseHeader}>
                <View style={styles.doseTime}>
                  <Ionicons name="time-outline" size={18} color={Colors.text.secondary} />
                  <Text style={styles.doseTimeText}>
                    {format(dose.scheduledTime, 'HH:mm')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dose.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(dose.status) }]}>
                    {getStatusText(dose.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.doseBody}>
                <Ionicons name="medical" size={20} color={Colors.primary[500]} />
                <Text style={styles.doseMedName}>{getMedicationName(dose.medicationId)}</Text>
              </View>
              {dose.takenAt && (
                <Text style={styles.takenAtText}>
                  Przyjęty o {format(dose.takenAt, 'HH:mm')}
                </Text>
              )}
            </Card>
          ))
        )}
      </View>

      {/* Medications list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leki ({medications.length})</Text>
        {medications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="medical-outline" size={32} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>Brak dodanych leków</Text>
          </Card>
        ) : (
          medications.map((med) => (
            <Card key={med.id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={styles.medIcon}>
                  <Ionicons name="medical" size={20} color={Colors.primary[500]} />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetails}>
                    {med.dosage} • {med.form}
                  </Text>
                </View>
                <View style={styles.medQuantity}>
                  <Text style={[
                    styles.quantityText,
                    med.currentQuantity < 5 && styles.quantityLow
                  ]}>
                    {med.currentQuantity}
                  </Text>
                  <Text style={styles.quantityLabel}>szt.</Text>
                </View>
              </View>
              {med.activeSubstance && (
                <Text style={styles.medSubstance}>
                  Substancja: {med.activeSubstance}
                </Text>
              )}
            </Card>
          ))
        )}
      </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  headerCard: {
    marginBottom: Spacing.md,
  },
  seniorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.h2,
    color: Colors.primary[600],
  },
  seniorInfo: {
    flex: 1,
  },
  seniorName: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  seniorPhone: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  seniorEmail: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
    borderWidth: 6,
    borderColor: Colors.primary[500],
  },
  progressPercent: {
    ...Typography.h2,
    color: Colors.primary[600],
  },
  progressLabel: {
    ...Typography.small,
    color: Colors.primary[500],
  },
  statsDetails: {
    flex: 1,
    gap: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  doseCard: {
    marginBottom: Spacing.sm,
  },
  doseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  doseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  doseTimeText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  doseBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  doseMedName: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  takenAtText: {
    ...Typography.caption,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  medCard: {
    marginBottom: Spacing.sm,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  medDetails: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  medQuantity: {
    alignItems: 'center',
  },
  quantityText: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  quantityLow: {
    color: Colors.error,
  },
  quantityLabel: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  medSubstance: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  interactionsCard: {
    marginBottom: Spacing.lg,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  interactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  interactionsTitle: {
    ...Typography.bodyBold,
    color: Colors.error,
    flex: 1,
  },
  interactionItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  severityText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  interactionSubstances: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  interactionDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  interactionRecommendation: {
    ...Typography.caption,
    color: Colors.primary[600],
    fontStyle: 'italic',
  },
});

export default SeniorDetailScreen;
