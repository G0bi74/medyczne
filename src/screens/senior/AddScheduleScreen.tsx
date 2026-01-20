import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Card } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useMedicationStore, useScheduleStore } from '../../store';
import { addSchedule } from '../../services/api/medicationService';
import { scheduleDoseReminder, scheduleAllReminders } from '../../services/notifications/pushService';
import { DAYS_OF_WEEK, COMMON_DOSE_TIMES, REMINDER_OPTIONS } from '../../constants/medications';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface AddScheduleScreenProps {
  navigation: any;
  route: {
    params: {
      medicationId: string;
    };
  };
}

// Duration options
const DURATION_OPTIONS = [
  { value: 'indefinite', label: 'Bez ograniczeń', days: null },
  { value: '7days', label: '7 dni', days: 7 },
  { value: '14days', label: '14 dni', days: 14 },
  { value: '30days', label: '30 dni', days: 30 },
  { value: '3months', label: '3 miesiące', days: 90 },
];

export const AddScheduleScreen: React.FC<AddScheduleScreenProps> = ({
  navigation,
  route,
}) => {
  const { medicationId } = route.params;
  
  const [dosageAmount, setDosageAmount] = useState('1 tabletka');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00']);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]); // All days
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [customTime, setCustomTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('indefinite');
  const [loading, setLoading] = useState(false);

  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const addScheduleToStore = useScheduleStore((state) => state.addSchedule);

  const medication = medications.find((m) => m.id === medicationId);

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort()
    );
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time)
        ? prev.filter((t) => t !== time)
        : [...prev, time].sort()
    );
  };

  const addCustomTime = () => {
    // Validate time format HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(customTime)) {
      Alert.alert('Błąd', 'Wprowadź godzinę w formacie HH:MM (np. 14:30)');
      return;
    }
    
    // Normalize format (e.g., 8:00 -> 08:00)
    const [hours, minutes] = customTime.split(':');
    const normalizedTime = `${hours.padStart(2, '0')}:${minutes}`;
    
    if (!selectedTimes.includes(normalizedTime)) {
      setSelectedTimes((prev) => [...prev, normalizedTime].sort());
    }
    setCustomTime('');
  };

  const removeTime = (time: string) => {
    setSelectedTimes((prev) => prev.filter((t) => t !== time));
  };

  const handleSave = async () => {
    if (!user || !medication) return;

    if (selectedTimes.length === 0) {
      Alert.alert('Błąd', 'Wybierz co najmniej jedną godzinę dawkowania');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Błąd', 'Wybierz co najmniej jeden dzień tygodnia');
      return;
    }

    if (!dosageAmount.trim()) {
      Alert.alert('Błąd', 'Wprowadź dawkowanie');
      return;
    }

    setLoading(true);
    try {
      // Calculate end date based on duration
      const startDate = new Date();
      let endDate: Date | undefined = undefined;
      
      const durationOption = DURATION_OPTIONS.find(d => d.value === selectedDuration);
      if (durationOption && durationOption.days !== null) {
        endDate = addDays(startDate, durationOption.days);
      }
      
      const newSchedule = await addSchedule({
        medicationId,
        userId: user.id,
        times: selectedTimes,
        daysOfWeek: selectedDays,
        dosageAmount,
        startDate,
        endDate,
        reminderMinutesBefore: reminderMinutes,
        isActive: true,
      });

      addScheduleToStore(newSchedule);

      // Schedule notifications
      await scheduleAllReminders(newSchedule, medication);

      Alert.alert(
        'Sukces!',
        'Harmonogram został utworzony. Otrzymasz powiadomienia o nadchodzących dawkach.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating schedule:', error);
      Alert.alert('Błąd', 'Nie udało się utworzyć harmonogramu');
    } finally {
      setLoading(false);
    }
  };

  const FrequencyPreset: React.FC<{
    label: string;
    times: string[];
    onSelect: () => void;
    isActive: boolean;
  }> = ({ label, times, onSelect, isActive }) => (
    <TouchableOpacity
      style={[styles.presetButton, isActive && styles.presetButtonActive]}
      onPress={onSelect}
    >
      <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.presetTimes, isActive && styles.presetTimesActive]}>
        {times.join(', ')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Medication Info */}
      <Card style={styles.medicationCard}>
        <View style={styles.medicationRow}>
          <Ionicons name="medical" size={24} color={Colors.primary[500]} />
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication?.name || 'Lek'}</Text>
            <Text style={styles.medicationDosage}>{medication?.dosage}</Text>
          </View>
        </View>
      </Card>

      {/* Dosage Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dawkowanie</Text>
        <Input
          placeholder="np. 1 tabletka, 5ml, 2 kapsułki"
          value={dosageAmount}
          onChangeText={setDosageAmount}
          leftIcon={<Ionicons name="medical-outline" size={20} color={Colors.text.tertiary} />}
        />
        
        <View style={styles.dosagePresets}>
          {['1 tabletka', '2 tabletki', '1 kapsułka', '5 ml', '10 ml'].map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.dosageChip,
                dosageAmount === preset && styles.dosageChipActive,
              ]}
              onPress={() => setDosageAmount(preset)}
            >
              <Text
                style={[
                  styles.dosageChipText,
                  dosageAmount === preset && styles.dosageChipTextActive,
                ]}
              >
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Frequency Presets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Szybki wybór częstotliwości</Text>
        <View style={styles.presetsGrid}>
          <FrequencyPreset
            label="Raz dziennie"
            times={['08:00']}
            isActive={selectedTimes.length === 1 && selectedTimes[0] === '08:00'}
            onSelect={() => setSelectedTimes(['08:00'])}
          />
          <FrequencyPreset
            label="Dwa razy dziennie"
            times={['08:00', '20:00']}
            isActive={selectedTimes.length === 2 && selectedTimes.includes('08:00') && selectedTimes.includes('20:00')}
            onSelect={() => setSelectedTimes(['08:00', '20:00'])}
          />
          <FrequencyPreset
            label="Trzy razy dziennie"
            times={['08:00', '14:00', '20:00']}
            isActive={selectedTimes.length === 3}
            onSelect={() => setSelectedTimes(['08:00', '14:00', '20:00'])}
          />
          <FrequencyPreset
            label="Co 8 godzin"
            times={['06:00', '14:00', '22:00']}
            isActive={selectedTimes.includes('06:00') && selectedTimes.includes('14:00') && selectedTimes.includes('22:00')}
            onSelect={() => setSelectedTimes(['06:00', '14:00', '22:00'])}
          />
        </View>
      </View>

      {/* Custom Times */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Godziny dawkowania</Text>
        
        <View style={styles.selectedTimesContainer}>
          {selectedTimes.map((time) => (
            <View key={time} style={styles.selectedTimeChip}>
              <Ionicons name="time" size={16} color={Colors.primary[600]} />
              <Text style={styles.selectedTimeText}>{time}</Text>
              <TouchableOpacity onPress={() => removeTime(time)}>
                <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.addTimeRow}>
          <Input
            placeholder="HH:MM"
            value={customTime}
            onChangeText={setCustomTime}
            keyboardType="numbers-and-punctuation"
            containerStyle={styles.timeInput}
          />
          <Button
            title="Dodaj"
            onPress={addCustomTime}
            size="small"
          />
        </View>

        <Text style={styles.commonTimesLabel}>Popularne godziny:</Text>
        <View style={styles.commonTimesGrid}>
          {COMMON_DOSE_TIMES.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.commonTimeChip,
                selectedTimes.includes(time) && styles.commonTimeChipActive,
              ]}
              onPress={() => toggleTime(time)}
            >
              <Text
                style={[
                  styles.commonTimeText,
                  selectedTimes.includes(time) && styles.commonTimeTextActive,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Days of Week */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dni tygodnia</Text>
        
        <View style={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[
                styles.dayButton,
                selectedDays.includes(day.value) && styles.dayButtonActive,
              ]}
              onPress={() => toggleDay(day.value)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  selectedDays.includes(day.value) && styles.dayButtonTextActive,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dayPresetsRow}>
          <TouchableOpacity
            style={styles.dayPresetButton}
            onPress={() => setSelectedDays([1, 2, 3, 4, 5, 6, 7])}
          >
            <Text style={styles.dayPresetText}>Codziennie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dayPresetButton}
            onPress={() => setSelectedDays([1, 2, 3, 4, 5])}
          >
            <Text style={styles.dayPresetText}>Dni robocze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dayPresetButton}
            onPress={() => setSelectedDays([6, 7])}
          >
            <Text style={styles.dayPresetText}>Weekend</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Duration Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Czas trwania leczenia</Text>
        <Text style={styles.sectionSubtitle}>
          Przez ile dni przyjmować ten lek?
        </Text>
        
        <View style={styles.durationOptions}>
          {DURATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.durationOption,
                selectedDuration === option.value && styles.durationOptionActive,
              ]}
              onPress={() => setSelectedDuration(option.value)}
            >
              <Ionicons
                name={selectedDuration === option.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedDuration === option.value ? Colors.primary[500] : Colors.text.tertiary}
              />
              <View style={styles.durationOptionContent}>
                <Text
                  style={[
                    styles.durationOptionText,
                    selectedDuration === option.value && styles.durationOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {option.days !== null && selectedDuration === option.value && (
                  <Text style={styles.durationEndDate}>
                    Do: {format(addDays(new Date(), option.days), 'd MMMM yyyy', { locale: pl })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reminder Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Przypomnienie</Text>
        
        <View style={styles.reminderOptions}>
          {REMINDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.reminderOption,
                reminderMinutes === option.value && styles.reminderOptionActive,
              ]}
              onPress={() => setReminderMinutes(option.value)}
            >
              <Ionicons
                name={reminderMinutes === option.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={reminderMinutes === option.value ? Colors.primary[500] : Colors.text.tertiary}
              />
              <Text
                style={[
                  styles.reminderOptionText,
                  reminderMinutes === option.value && styles.reminderOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Podsumowanie</Text>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryBold}>{dosageAmount}</Text> leku{' '}
          <Text style={styles.summaryBold}>{medication?.name}</Text>
        </Text>
        <Text style={styles.summaryText}>
          Godziny: <Text style={styles.summaryBold}>{selectedTimes.join(', ')}</Text>
        </Text>
        <Text style={styles.summaryText}>
          Dni: <Text style={styles.summaryBold}>
            {selectedDays.length === 7 
              ? 'Codziennie' 
              : selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
          </Text>
        </Text>
        <Text style={styles.summaryText}>
          Czas trwania: <Text style={styles.summaryBold}>
            {(() => {
              const option = DURATION_OPTIONS.find(d => d.value === selectedDuration);
              if (!option) return 'Bez ograniczeń';
              if (option.days === null) return 'Bez ograniczeń';
              return `${option.label} (do ${format(addDays(new Date(), option.days), 'd.MM.yyyy')})`;
            })()}
          </Text>
        </Text>
      </Card>

      {/* Save Button */}
      <View style={styles.actions}>
        <Button
          title="Zapisz harmonogram"
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="large"
        />
        <Button
          title="Anuluj"
          variant="ghost"
          onPress={() => navigation.goBack()}
          fullWidth
          style={{ marginTop: Spacing.sm }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  medicationCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  medicationDosage: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  dosagePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dosageChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
  },
  dosageChipActive: {
    backgroundColor: Colors.primary[500],
  },
  dosageChipText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  dosageChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  presetsGrid: {
    gap: Spacing.sm,
  },
  presetButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  presetButtonActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  presetLabel: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  presetLabelActive: {
    color: Colors.primary[600],
  },
  presetTimes: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  presetTimesActive: {
    color: Colors.primary[500],
  },
  selectedTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectedTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary[100],
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  selectedTimeText: {
    ...Typography.bodyBold,
    color: Colors.primary[600],
  },
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
  },
  commonTimesLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  commonTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  commonTimeChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral[100],
  },
  commonTimeChipActive: {
    backgroundColor: Colors.primary[500],
  },
  commonTimeText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  commonTimeTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  dayButtonText: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: Colors.text.inverse,
  },
  dayPresetsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayPresetButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral[100],
  },
  dayPresetText: {
    ...Typography.small,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  reminderOptions: {
    gap: Spacing.sm,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  reminderOptionActive: {},
  reminderOptionText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  reminderOptionTextActive: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  durationOptions: {
    gap: Spacing.sm,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  durationOptionActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  durationOptionContent: {
    flex: 1,
  },
  durationOptionText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  durationOptionTextActive: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  durationEndDate: {
    ...Typography.caption,
    color: Colors.primary[600],
    marginTop: 2,
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  summaryTitle: {
    ...Typography.bodyBold,
    color: Colors.primary[700],
    marginBottom: Spacing.sm,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  summaryBold: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  actions: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});

export default AddScheduleScreen;
