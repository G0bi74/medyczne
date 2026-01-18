import { MedicationForm } from '../types';

export const MEDICATION_FORMS: { value: MedicationForm; label: string; icon: string }[] = [
  { value: 'tablet', label: 'Tabletka', icon: 'tablet' },
  { value: 'capsule', label: 'Kapsułka', icon: 'capsule' },
  { value: 'syrup', label: 'Syrop', icon: 'flask' },
  { value: 'drops', label: 'Krople', icon: 'eyedropper' },
  { value: 'injection', label: 'Zastrzyk', icon: 'syringe' },
  { value: 'cream', label: 'Krem/Maść', icon: 'tube' },
  { value: 'patch', label: 'Plaster', icon: 'bandage' },
  { value: 'inhaler', label: 'Inhalator', icon: 'lungs' },
  { value: 'other', label: 'Inne', icon: 'pills' },
];

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Pon', fullLabel: 'Poniedziałek' },
  { value: 2, label: 'Wt', fullLabel: 'Wtorek' },
  { value: 3, label: 'Śr', fullLabel: 'Środa' },
  { value: 4, label: 'Czw', fullLabel: 'Czwartek' },
  { value: 5, label: 'Pt', fullLabel: 'Piątek' },
  { value: 6, label: 'Sob', fullLabel: 'Sobota' },
  { value: 7, label: 'Nd', fullLabel: 'Niedziela' },
];

export const COMMON_DOSE_TIMES = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '12:00',
  '13:00',
  '14:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

export const REMINDER_OPTIONS = [
  { value: 0, label: 'W momencie dawki' },
  { value: 5, label: '5 minut przed' },
  { value: 10, label: '10 minut przed' },
  { value: 15, label: '15 minut przed' },
  { value: 30, label: '30 minut przed' },
  { value: 60, label: '1 godzinę przed' },
];

export const DOSE_STATUS_LABELS = {
  pending: 'Oczekuje',
  taken: 'Przyjęty',
  missed: 'Pominięty',
  skipped: 'Pominięty celowo',
};

export const SEVERITY_LABELS = {
  low: 'Niskie ryzyko',
  medium: 'Średnie ryzyko',
  high: 'Wysokie ryzyko',
  critical: 'Krytyczne',
};
