import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medication, DoseStatus } from '../../types';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../constants/theme';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// Extended dose type that works with both DoseLog and GeneratedDose
interface DoseData {
  id: string;
  scheduledTime: Date;
  status: DoseStatus;
  takenAt?: Date;
  notes?: string;
  dosageAmount?: string;
}

interface DoseCardProps {
  dose: DoseData;
  medication?: Medication;
  onTake?: () => void;
  onSkip?: () => void;
  onSnooze?: () => void;
  compact?: boolean;
}

export const DoseCard: React.FC<DoseCardProps> = ({
  dose,
  medication,
  onTake,
  onSkip,
  onSnooze,
  compact = false,
}) => {
  const getStatusColor = (status: DoseStatus): string => {
    switch (status) {
      case 'taken':
        return Colors.doseStatus.taken;
      case 'missed':
        return Colors.doseStatus.missed;
      case 'skipped':
        return Colors.doseStatus.skipped;
      default:
        return Colors.doseStatus.pending;
    }
  };

  const getStatusIcon = (status: DoseStatus): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'taken':
        return 'checkmark-circle';
      case 'missed':
        return 'close-circle';
      case 'skipped':
        return 'arrow-forward-circle';
      default:
        return 'time-outline';
    }
  };

  const getStatusLabel = (status: DoseStatus): string => {
    switch (status) {
      case 'taken':
        return 'Przyjęty';
      case 'missed':
        return 'Pominięty';
      case 'skipped':
        return 'Pominięty celowo';
      default:
        return 'Oczekuje';
    }
  };

  const isPending = dose.status === 'pending';
  const statusColor = getStatusColor(dose.status);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: statusColor }]}>
        <View style={styles.compactContent}>
          <Text style={styles.compactTime}>
            {format(dose.scheduledTime, 'HH:mm')}
          </Text>
          <Text style={styles.compactName} numberOfLines={1}>
            {medication?.name || 'Lek'}
          </Text>
        </View>
        <Ionicons name={getStatusIcon(dose.status)} size={24} color={statusColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Ionicons name={getStatusIcon(dose.status)} size={18} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel(dose.status)}
          </Text>
        </View>
        <Text style={styles.time}>
          {format(dose.scheduledTime, 'HH:mm', { locale: pl })}
        </Text>
      </View>

      <View style={styles.medicationInfo}>
        <View style={styles.iconContainer}>
          <Ionicons name="medical-outline" size={24} color={Colors.primary[500]} />
        </View>
        <View style={styles.medicationDetails}>
          <Text style={styles.medicationName}>{medication?.name || 'Lek'}</Text>
          {medication && (
            <Text style={styles.dosage}>{medication.dosage}</Text>
          )}
        </View>
      </View>

      {isPending && (onTake || onSkip || onSnooze) && (
        <View style={styles.actions}>
          {onTake && (
            <TouchableOpacity
              style={[styles.actionButton, styles.takeButton]}
              onPress={onTake}
            >
              <Ionicons name="checkmark" size={20} color={Colors.text.inverse} />
              <Text style={styles.takeButtonText}>Wziąłem</Text>
            </TouchableOpacity>
          )}
          
          {onSnooze && (
            <TouchableOpacity
              style={[styles.actionButton, styles.snoozeButton]}
              onPress={onSnooze}
            >
              <Ionicons name="alarm-outline" size={18} color={Colors.primary[600]} />
            </TouchableOpacity>
          )}
          
          {onSkip && (
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={onSkip}
            >
              <Ionicons name="close" size={18} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {dose.takenAt && (
        <Text style={styles.takenTime}>
          Przyjęty o {format(dose.takenAt, 'HH:mm', { locale: pl })}
        </Text>
      )}

      {dose.notes && (
        <Text style={styles.notes}>{dose.notes}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
  },
  time: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  dosage: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  takeButton: {
    flex: 1,
    backgroundColor: Colors.success,
  },
  takeButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.inverse,
  },
  snoozeButton: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.md,
  },
  skipButton: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.md,
  },
  takenTime: {
    ...Typography.small,
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  notes: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  compactTime: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    minWidth: 50,
  },
  compactName: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
});

export default DoseCard;
