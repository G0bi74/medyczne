import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medication } from '../../types';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../constants/theme';
import { MEDICATION_FORMS } from '../../constants/medications';

interface MedicationCardProps {
  medication: Medication;
  onPress?: () => void;
  onEdit?: () => void;
  showQuantity?: boolean;
  showExpiration?: boolean;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  onPress,
  onEdit,
  showQuantity = true,
  showExpiration = false,
}) => {
  const formInfo = MEDICATION_FORMS.find((f) => f.value === medication.form);
  
  const getFormIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (medication.form) {
      case 'tablet':
        return 'tablet-portrait-outline';
      case 'capsule':
        return 'ellipse-outline';
      case 'syrup':
        return 'beaker-outline';
      case 'drops':
        return 'water-outline';
      case 'injection':
        return 'fitness-outline';
      case 'cream':
        return 'color-fill-outline';
      case 'inhaler':
        return 'cloud-outline';
      default:
        return 'medical-outline';
    }
  };

  const isLowQuantity = medication.currentQuantity < 10;
  const isExpiringSoon =
    medication.expirationDate &&
    medication.expirationDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getFormIcon()} size={28} color={Colors.primary[500]} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {medication.name}
          </Text>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.substance} numberOfLines={1}>
          {medication.activeSubstance}
        </Text>
        
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Dawka:</Text>
            <Text style={styles.detailValue}>{medication.dosage}</Text>
          </View>
          
          {showQuantity && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ilość:</Text>
              <Text
                style={[
                  styles.detailValue,
                  isLowQuantity && styles.warningText,
                ]}
              >
                {medication.currentQuantity}/{medication.packageSize}
              </Text>
            </View>
          )}
        </View>
        
        {showExpiration && medication.expirationDate && (
          <View style={styles.expirationContainer}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={isExpiringSoon ? Colors.warning : Colors.text.tertiary}
            />
            <Text
              style={[
                styles.expirationText,
                isExpiringSoon && styles.warningText,
              ]}
            >
              Ważny do: {medication.expirationDate.toLocaleDateString('pl-PL')}
            </Text>
          </View>
        )}
      </View>
      
      {(isLowQuantity || isExpiringSoon) && (
        <View style={styles.warningBadge}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
  substance: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  details: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginRight: 4,
  },
  detailValue: {
    ...Typography.small,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  expirationText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  warningText: {
    color: Colors.warning,
  },
  warningBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
});

export default MedicationCard;
