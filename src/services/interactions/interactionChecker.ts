// Drug interaction checker service
// Contains rules for common drug interactions

import { DrugInteraction, InteractionSeverity, Medication } from '../../types';

// Database of known drug interactions
// In production, this would be a comprehensive database or API
const DRUG_INTERACTIONS: DrugInteraction[] = [
  // Anticoagulants interactions
  {
    id: '1',
    substance1: 'warfaryna',
    substance2: 'kwas acetylosalicylowy',
    severity: 'high',
    description: 'Zwiększone ryzyko krwawienia przy jednoczesnym stosowaniu warfaryny i aspiryny.',
    recommendation: 'Unikać jednoczesnego stosowania bez wyraźnego zalecenia lekarza. Konieczna częstsza kontrola INR.',
  },
  {
    id: '2',
    substance1: 'warfaryna',
    substance2: 'ibuprofen',
    severity: 'high',
    description: 'NLPZ mogą nasilać działanie warfaryny i zwiększać ryzyko krwawienia.',
    recommendation: 'Jeśli konieczne, stosować paracetamol zamiast ibuprofenu.',
  },
  {
    id: '3',
    substance1: 'warfaryna',
    substance2: 'paracetamol',
    severity: 'medium',
    description: 'Regularne stosowanie paracetamolu może nieznacznie nasilić działanie warfaryny.',
    recommendation: 'Można stosować, ale zalecana kontrola INR przy regularnym przyjmowaniu.',
  },
  
  // Metformin interactions
  {
    id: '4',
    substance1: 'metformina',
    substance2: 'alkohol',
    severity: 'critical',
    description: 'Alkohol znacznie zwiększa ryzyko kwasicy mleczanowej przy stosowaniu metforminy.',
    recommendation: 'Bezwzględnie unikać spożywania alkoholu podczas leczenia metforminą.',
  },
  {
    id: '5',
    substance1: 'metformina',
    substance2: 'środki kontrastowe',
    severity: 'high',
    description: 'Jodowe środki kontrastowe mogą powodować ostrą niewydolność nerek i kwasicę mleczanową.',
    recommendation: 'Odstawić metforminę 48h przed badaniem z kontrastem i 48h po badaniu.',
  },
  
  // NSAID interactions
  {
    id: '6',
    substance1: 'ibuprofen',
    substance2: 'kwas acetylosalicylowy',
    severity: 'medium',
    description: 'Ibuprofen może osłabiać działanie kardioprotekcyjne aspiryny.',
    recommendation: 'Przyjmować aspirynę co najmniej 30 minut przed ibuprofenem lub 8 godzin po.',
  },
  {
    id: '7',
    substance1: 'ibuprofen',
    substance2: 'diklofenak',
    severity: 'high',
    description: 'Łączenie dwóch NLPZ znacznie zwiększa ryzyko uszkodzenia żołądka i nerek.',
    recommendation: 'Nie łączyć dwóch leków z grupy NLPZ.',
  },
  
  // ACE inhibitors
  {
    id: '8',
    substance1: 'lizynopryl',
    substance2: 'potas',
    severity: 'high',
    description: 'Inhibitory ACE mogą zwiększać poziom potasu we krwi, łączenie z suplementami potasu grozi hiperkaliemią.',
    recommendation: 'Unikać suplementów potasu bez kontroli laboratoryjnej.',
  },
  {
    id: '9',
    substance1: 'lizynopryl',
    substance2: 'ibuprofen',
    severity: 'medium',
    description: 'NLPZ mogą osłabiać działanie hipotensyjne inhibitorów ACE.',
    recommendation: 'Monitorować ciśnienie krwi, rozważyć paracetamol jako alternatywę.',
  },
  
  // Statins
  {
    id: '10',
    substance1: 'atorwastatyna',
    substance2: 'grejpfrut',
    severity: 'medium',
    description: 'Sok grejpfrutowy zwiększa stężenie statyn we krwi, nasilając ryzyko działań niepożądanych.',
    recommendation: 'Unikać spożywania grejpfrutów podczas leczenia atorwastatyną.',
  },
  {
    id: '11',
    substance1: 'simwastatyna',
    substance2: 'amiodaron',
    severity: 'high',
    description: 'Amiodaron znacznie zwiększa stężenie simwastatyny, ryzyko rabdomiolizy.',
    recommendation: 'Maksymalna dawka simwastatyny to 20mg przy jednoczesnym stosowaniu amiodaronu.',
  },
  
  // Benzodiazepines
  {
    id: '12',
    substance1: 'alprazolam',
    substance2: 'alkohol',
    severity: 'critical',
    description: 'Łączenie benzodiazepin z alkoholem może prowadzić do ciężkiej depresji oddechowej.',
    recommendation: 'Bezwzględnie unikać alkoholu podczas stosowania alprazolamu.',
  },
  {
    id: '13',
    substance1: 'alprazolam',
    substance2: 'tramadol',
    severity: 'critical',
    description: 'Łączenie benzodiazepin z opioidami znacznie zwiększa ryzyko depresji oddechowej.',
    recommendation: 'Unikać jednoczesnego stosowania, jeśli konieczne - pod ścisłą kontrolą lekarza.',
  },
  
  // Diabetic medications
  {
    id: '14',
    substance1: 'gliklazyd',
    substance2: 'flukonazol',
    severity: 'high',
    description: 'Flukonazol hamuje metabolizm pochodnych sulfonylomocznika, ryzyko hipoglikemii.',
    recommendation: 'Częstsza kontrola glikemii, możliwa konieczność zmniejszenia dawki gliklazydu.',
  },
  
  // Blood pressure medications
  {
    id: '15',
    substance1: 'amlodypina',
    substance2: 'simwastatyna',
    severity: 'medium',
    description: 'Amlodypina może zwiększać stężenie simwastatyny we krwi.',
    recommendation: 'Maksymalna dawka simwastatyny to 20mg przy jednoczesnym stosowaniu amlodypiny.',
  },
];

// Normalize substance name for comparison
const normalizeSubstance = (substance: string): string => {
  return substance
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
};

// Check if two substances match (handles synonyms and partial matches)
const substancesMatch = (s1: string, s2: string): boolean => {
  const normalized1 = normalizeSubstance(s1);
  const normalized2 = normalizeSubstance(s2);
  
  return (
    normalized1 === normalized2 ||
    normalized1.includes(normalized2) ||
    normalized2.includes(normalized1)
  );
};

export interface InteractionCheckResult {
  hasInteraction: boolean;
  interactions: DrugInteraction[];
  highestSeverity: InteractionSeverity | null;
}

// Check interactions between a new medication and existing medications
export const checkInteractions = (
  newMedication: { activeSubstance: string },
  existingMedications: { activeSubstance: string }[]
): InteractionCheckResult => {
  const foundInteractions: DrugInteraction[] = [];
  const newSubstance = normalizeSubstance(newMedication.activeSubstance);

  for (const existing of existingMedications) {
    const existingSubstance = normalizeSubstance(existing.activeSubstance);

    for (const interaction of DRUG_INTERACTIONS) {
      const sub1 = normalizeSubstance(interaction.substance1);
      const sub2 = normalizeSubstance(interaction.substance2);

      // Check if there's a match between new and existing medication
      if (
        (substancesMatch(newSubstance, sub1) && substancesMatch(existingSubstance, sub2)) ||
        (substancesMatch(newSubstance, sub2) && substancesMatch(existingSubstance, sub1))
      ) {
        // Avoid duplicates
        if (!foundInteractions.find((i) => i.id === interaction.id)) {
          foundInteractions.push(interaction);
        }
      }
    }
  }

  // Determine highest severity
  let highestSeverity: InteractionSeverity | null = null;
  const severityOrder: InteractionSeverity[] = ['low', 'medium', 'high', 'critical'];

  for (const interaction of foundInteractions) {
    const currentIndex = severityOrder.indexOf(interaction.severity);
    const highestIndex = highestSeverity ? severityOrder.indexOf(highestSeverity) : -1;

    if (currentIndex > highestIndex) {
      highestSeverity = interaction.severity;
    }
  }

  return {
    hasInteraction: foundInteractions.length > 0,
    interactions: foundInteractions,
    highestSeverity,
  };
};

// Check all interactions in a medication list
export const checkAllInteractions = (
  medications: { activeSubstance: string }[]
): DrugInteraction[] => {
  const allInteractions: DrugInteraction[] = [];

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const result = checkInteractions(medications[i], [medications[j]]);
      for (const interaction of result.interactions) {
        if (!allInteractions.find((i) => i.id === interaction.id)) {
          allInteractions.push(interaction);
        }
      }
    }
  }

  return allInteractions;
};

// Get color for severity level
export const getSeverityColor = (severity: InteractionSeverity): string => {
  switch (severity) {
    case 'low':
      return '#10B981'; // Green
    case 'medium':
      return '#F59E0B'; // Yellow
    case 'high':
      return '#F97316'; // Orange
    case 'critical':
      return '#EF4444'; // Red
    default:
      return '#64748B'; // Gray
  }
};

// Get label for severity level
export const getSeverityLabel = (severity: InteractionSeverity): string => {
  switch (severity) {
    case 'low':
      return 'Niskie ryzyko';
    case 'medium':
      return 'Średnie ryzyko';
    case 'high':
      return 'Wysokie ryzyko';
    case 'critical':
      return 'Krytyczne';
    default:
      return 'Nieznane';
  }
};
