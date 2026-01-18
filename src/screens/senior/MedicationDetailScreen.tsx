import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, InteractionAlert } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useMedicationStore, useScheduleStore } from '../../store';
import {
  deleteMedication,
  updateMedication,
} from '../../services/api/medicationService';
import { checkInteractions } from '../../services/interactions/interactionChecker';
import { Medication, Schedule, DrugInteraction } from '../../types';
import { MEDICATION_FORMS } from '../../constants/medications';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface MedicationDetailScreenProps {
  navigation: any;
  route: {
    params: {
      medicationId: string;
    };
  };
}

export const MedicationDetailScreen: React.FC<MedicationDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { medicationId } = route.params;
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(false);

  const medications = useMedicationStore((state) => state.medications);
  const removeMedication = useMedicationStore((state) => state.removeMedication);
  const updateMedicationInStore = useMedicationStore((state) => state.updateMedication);
  
  // Get schedules from store and filter by medicationId
  const allSchedules = useScheduleStore((state) => state.schedules);
  const schedules = allSchedules.filter((s) => s.medicationId === medicationId);

  const medication = medications.find((m) => m.id === medicationId);

  useEffect(() => {
    checkDrugInteractions();
  }, [medicationId]);

  const checkDrugInteractions = () => {
    if (!medication) return;
    
    const otherMedications = medications.filter((m) => m.id !== medicationId);
    const result = checkInteractions(medication, otherMedications);
    setInteractions(result.interactions);
  };

  const handleDelete = () => {
    Alert.alert(
      'Usuń lek',
      `Czy na pewno chcesz usunąć "${medication?.name}"? Ta operacja jest nieodwracalna i usunie również wszystkie powiązane harmonogramy.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteMedication(medicationId);
              removeMedication(medicationId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć leku');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateQuantity = (delta: number) => {
    if (!medication) return;
    
    const newQuantity = Math.max(0, medication.currentQuantity + delta);
    updateMedication(medicationId, { currentQuantity: newQuantity });
    updateMedicationInStore(medicationId, { currentQuantity: newQuantity });
  };

  const handleOpenLeaflet = () => {
    if (medication?.leafletUrl) {
      Linking.openURL(medication.leafletUrl);
    } else {
      // Search for leaflet on Google
      const searchQuery = encodeURIComponent(`${medication?.name} ulotka PDF`);
      Linking.openURL(`https://www.google.com/search?q=${searchQuery}`);
    }
  };

  if (!medication) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.notFoundText}>Nie znaleziono leku</Text>
        <Button title="Wróć" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const formInfo = MEDICATION_FORMS.find((f) => f.value === medication.form);
  const isLowQuantity = medication.currentQuantity < 10;
  const isExpiringSoon =
    medication.expirationDate &&
    medication.expirationDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  const getFormIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (medication.form) {
      case 'tablet': return 'tablet-portrait-outline';
      case 'capsule': return 'ellipse-outline';
      case 'syrup': return 'beaker-outline';
      case 'drops': return 'water-outline';
      case 'injection': return 'fitness-outline';
      case 'cream': return 'color-fill-outline';
      case 'inhaler': return 'cloud-outline';
      default: return 'medical-outline';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Ionicons name={getFormIcon()} size={40} color={Colors.primary[500]} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.activeSubstance}>{medication.activeSubstance}</Text>
            {medication.manufacturer && (
              <Text style={styles.manufacturer}>{medication.manufacturer}</Text>
            )}
          </View>
        </View>

        {/* Warnings */}
        {(isLowQuantity || isExpiringSoon) && (
          <View style={styles.warningsContainer}>
            {isLowQuantity && (
              <View style={[styles.warningBadge, { backgroundColor: Colors.warning + '20' }]}>
                <Ionicons name="warning" size={16} color={Colors.warning} />
                <Text style={[styles.warningText, { color: Colors.warning }]}>
                  Kończy się zapas
                </Text>
              </View>
            )}
            {isExpiringSoon && (
              <View style={[styles.warningBadge, { backgroundColor: Colors.error + '20' }]}>
                <Ionicons name="time" size={16} color={Colors.error} />
                <Text style={[styles.warningText, { color: Colors.error }]}>
                  Wkrótce wygasa
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Details Card */}
      <Card style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Szczegóły leku</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dawka</Text>
          <Text style={styles.detailValue}>{medication.dosage || 'Nie określono'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Forma</Text>
          <Text style={styles.detailValue}>{formInfo?.label || 'Inna'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Kod kreskowy</Text>
          <Text style={styles.detailValue}>{medication.barcode || 'Brak'}</Text>
        </View>
        
        {medication.expirationDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data ważności</Text>
            <Text style={[styles.detailValue, isExpiringSoon && { color: Colors.error }]}>
              {format(medication.expirationDate, 'd MMMM yyyy', { locale: pl })}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dodano</Text>
          <Text style={styles.detailValue}>
            {format(medication.addedAt, 'd MMMM yyyy', { locale: pl })}
          </Text>
        </View>
      </Card>

      {/* Quantity Card */}
      <Card style={styles.quantityCard}>
        <Text style={styles.sectionTitle}>Ilość w opakowaniu</Text>
        
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(-1)}
          >
            <Ionicons name="remove" size={24} color={Colors.primary[500]} />
          </TouchableOpacity>
          
          <View style={styles.quantityDisplay}>
            <Text style={[styles.quantityValue, isLowQuantity && { color: Colors.warning }]}>
              {medication.currentQuantity}
            </Text>
            <Text style={styles.quantityTotal}>/ {medication.packageSize}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(1)}
          >
            <Ionicons name="add" size={24} color={Colors.primary[500]} />
          </TouchableOpacity>
        </View>
        
        {isLowQuantity && (
          <Text style={styles.lowQuantityHint}>
            💊 Czas zakupić nowe opakowanie!
          </Text>
        )}
      </Card>

      {/* Schedules Card */}
      <Card style={styles.schedulesCard}>
        <View style={styles.schedulesHeader}>
          <Text style={styles.sectionTitle}>Harmonogram dawkowania</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddSchedule', { medicationId })}
          >
            <Ionicons name="add-circle" size={28} color={Colors.primary[500]} />
          </TouchableOpacity>
        </View>
        
        {schedules.length === 0 ? (
          <View style={styles.noSchedules}>
            <Ionicons name="calendar-outline" size={40} color={Colors.neutral[300]} />
            <Text style={styles.noSchedulesText}>Brak harmonogramu</Text>
            <Button
              title="Dodaj harmonogram"
              variant="outline"
              size="small"
              onPress={() => navigation.navigate('AddSchedule', { medicationId })}
            />
          </View>
        ) : (
          schedules.map((schedule) => (
            <TouchableOpacity
              key={schedule.id}
              style={styles.scheduleItem}
              onPress={() => navigation.navigate('EditSchedule', { scheduleId: schedule.id })}
            >
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleDosage}>{schedule.dosageAmount}</Text>
                <View style={styles.scheduleTimes}>
                  {schedule.times.map((time, index) => (
                    <View key={index} style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{time}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ))
        )}
      </Card>

      {/* Drug Interactions */}
      {interactions.length > 0 && (
        <View style={styles.interactionsSection}>
          <Text style={styles.sectionTitle}>⚠️ Interakcje lekowe</Text>
          {interactions.map((interaction) => (
            <InteractionAlert key={interaction.id} interaction={interaction} />
          ))}
        </View>
      )}

      {/* Actions */}
      <Card style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenLeaflet}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="document-text-outline" size={24} color={Colors.primary[500]} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Otwórz ulotkę</Text>
            <Text style={styles.actionDescription}>Znajdź informacje o leku</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </TouchableOpacity>

        <View style={styles.actionDivider} />
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddSchedule', { medicationId })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: Colors.success + '20' }]}>
            <Ionicons name="alarm-outline" size={24} color={Colors.success} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Dodaj harmonogram</Text>
            <Text style={styles.actionDescription}>Ustaw przypomnienia o dawkach</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </TouchableOpacity>
      </Card>

      {/* Delete Button */}
      <View style={styles.deleteContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Usuń lek z apteczki</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.secondary,
  },
  notFoundText: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginVertical: Spacing.md,
  },
  headerCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  medicationName: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  activeSubstance: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  manufacturer: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  warningsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  warningText: {
    ...Typography.small,
    fontWeight: '600',
  },
  detailsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  detailLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  detailValue: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  quantityCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quantityValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  quantityTotal: {
    ...Typography.h3,
    color: Colors.text.tertiary,
    marginLeft: 4,
  },
  lowQuantityHint: {
    ...Typography.caption,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  schedulesCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  schedulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  noSchedules: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noSchedulesText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginVertical: Spacing.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDosage: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  scheduleTimes: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
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
  interactionsSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  actionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  actionDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginLeft: 60,
  },
  deleteContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  deleteButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '500',
  },
});

export default MedicationDetailScreen;
