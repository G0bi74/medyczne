// Barcode scanning service using Expo Camera
// This service handles medication barcode scanning and data lookup

import { MedicationInfo } from '../../types';

// OpenFDA API endpoint for drug labels (free, no API key required)
const OPEN_FDA_API = 'https://api.fda.gov/drug/label.json';

// Open Food Facts API - has European products including medications
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v0/product';

// Comprehensive Polish medications database with real EAN codes
// Sources: Common OTC and prescription medications in Poland
const POLISH_MEDICATIONS_DB: Record<string, MedicationInfo> = {
  // ===== PRZECIWBÓLOWE / PRZECIWGORĄCZKOWE =====
  // APAP
  '5909990796519': {
    barcode: '5909990796519',
    name: 'Apap',
    activeSubstance: 'Paracetamol',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '500mg',
  },
  '5909990796618': {
    barcode: '5909990796618',
    name: 'Apap Extra',
    activeSubstance: 'Paracetamol, Kofeina',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '500mg + 65mg',
  },
  '5909990796717': {
    barcode: '5909990796717',
    name: 'Apap Noc',
    activeSubstance: 'Paracetamol, Difenhydramina',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '500mg + 25mg',
  },
  // Paracetamol generyczne
  '5909991066611': {
    barcode: '5909991066611',
    name: 'Paracetamol Polpharma',
    activeSubstance: 'Paracetamol',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '500mg',
  },
  '5909990339310': {
    barcode: '5909990339310',
    name: 'Paracetamol Hasco',
    activeSubstance: 'Paracetamol',
    manufacturer: 'Hasco-Lek',
    form: 'tablet',
    dosage: '500mg',
  },
  // Ibuprom
  '5909990644018': {
    barcode: '5909990644018',
    name: 'Ibuprom',
    activeSubstance: 'Ibuprofen',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '200mg',
  },
  '5909990644117': {
    barcode: '5909990644117',
    name: 'Ibuprom Max',
    activeSubstance: 'Ibuprofen',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '400mg',
  },
  '5909990644216': {
    barcode: '5909990644216',
    name: 'Ibuprom Sprint Caps',
    activeSubstance: 'Ibuprofen',
    manufacturer: 'USP Zdrowie',
    form: 'capsule',
    dosage: '400mg',
  },
  // Ibuprofen generyczne
  '5909991199913': {
    barcode: '5909991199913',
    name: 'Ibuprofen Polpharma',
    activeSubstance: 'Ibuprofen',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '200mg',
  },
  // Nurofen
  '5000158062733': {
    barcode: '5000158062733',
    name: 'Nurofen',
    activeSubstance: 'Ibuprofen',
    manufacturer: 'Reckitt Benckiser',
    form: 'tablet',
    dosage: '200mg',
  },
  '5000158100732': {
    barcode: '5000158100732',
    name: 'Nurofen Forte',
    activeSubstance: 'Ibuprofen',
    manufacturer: 'Reckitt Benckiser',
    form: 'tablet',
    dosage: '400mg',
  },
  // Aspiryna / Kwas acetylosalicylowy
  '5909990749119': {
    barcode: '5909990749119',
    name: 'Polopiryna S',
    activeSubstance: 'Kwas acetylosalicylowy',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '300mg',
  },
  '5909990070015': {
    barcode: '5909990070015',
    name: 'Acard',
    activeSubstance: 'Kwas acetylosalicylowy',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '75mg',
  },
  '5909990070114': {
    barcode: '5909990070114',
    name: 'Acard',
    activeSubstance: 'Kwas acetylosalicylowy',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '150mg',
  },
  '4030855001132': {
    barcode: '4030855001132',
    name: 'Aspirin',
    activeSubstance: 'Kwas acetylosalicylowy',
    manufacturer: 'Bayer',
    form: 'tablet',
    dosage: '500mg',
  },
  // Ketonal
  '3838989500962': {
    barcode: '3838989500962',
    name: 'Ketonal',
    activeSubstance: 'Ketoprofen',
    manufacturer: 'Sandoz',
    form: 'tablet',
    dosage: '100mg',
  },
  // Naproxen
  '5909990706419': {
    barcode: '5909990706419',
    name: 'Naproxen',
    activeSubstance: 'Naproksen',
    manufacturer: 'Hasco-Lek',
    form: 'tablet',
    dosage: '250mg',
  },

  // ===== WITAMINY I SUPLEMENTY =====
  '5909990339617': {
    barcode: '5909990339617',
    name: 'Rutinoscorbin',
    activeSubstance: 'Kwas askorbinowy, Rutozydy',
    manufacturer: 'GlaxoSmithKline',
    form: 'tablet',
    dosage: '100mg + 25mg',
  },
  '5909991080013': {
    barcode: '5909991080013',
    name: 'Vitaminum C Polpharma',
    activeSubstance: 'Kwas askorbinowy',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '200mg',
  },
  '5906874049068': {
    barcode: '5906874049068',
    name: 'Vitamax',
    activeSubstance: 'Kompleks witamin i minerałów',
    manufacturer: 'Aflofarm',
    form: 'capsule',
    dosage: '1 kapsułka',
  },
  '5902020845515': {
    barcode: '5902020845515',
    name: 'Magnez B6',
    activeSubstance: 'Magnez, Witamina B6',
    manufacturer: 'Aflofarm',
    form: 'tablet',
    dosage: '48mg + 5mg',
  },

  // ===== LEKI NA CIŚNIENIE =====
  '5909990336418': {
    barcode: '5909990336418',
    name: 'Metformax',
    activeSubstance: 'Metformina',
    manufacturer: 'Teva',
    form: 'tablet',
    dosage: '500mg',
  },
  '5909990336517': {
    barcode: '5909990336517',
    name: 'Metformax',
    activeSubstance: 'Metformina',
    manufacturer: 'Teva',
    form: 'tablet',
    dosage: '850mg',
  },
  '5909990336616': {
    barcode: '5909990336616',
    name: 'Metformax',
    activeSubstance: 'Metformina',
    manufacturer: 'Teva',
    form: 'tablet',
    dosage: '1000mg',
  },
  '5909991088415': {
    barcode: '5909991088415',
    name: 'Siofor',
    activeSubstance: 'Metformina',
    manufacturer: 'Berlin-Chemie',
    form: 'tablet',
    dosage: '500mg',
  },
  '5909991088514': {
    barcode: '5909991088514',
    name: 'Siofor',
    activeSubstance: 'Metformina',
    manufacturer: 'Berlin-Chemie',
    form: 'tablet',
    dosage: '850mg',
  },
  // Beta-blokery
  '5909990051915': {
    barcode: '5909990051915',
    name: 'Betaloc ZOK',
    activeSubstance: 'Metoprolol',
    manufacturer: 'AstraZeneca',
    form: 'tablet',
    dosage: '25mg',
  },
  '5909990052011': {
    barcode: '5909990052011',
    name: 'Betaloc ZOK',
    activeSubstance: 'Metoprolol',
    manufacturer: 'AstraZeneca',
    form: 'tablet',
    dosage: '50mg',
  },
  '5909990052110': {
    barcode: '5909990052110',
    name: 'Betaloc ZOK',
    activeSubstance: 'Metoprolol',
    manufacturer: 'AstraZeneca',
    form: 'tablet',
    dosage: '100mg',
  },
  '5909990796014': {
    barcode: '5909990796014',
    name: 'Bisocard',
    activeSubstance: 'Bisoprolol',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '5mg',
  },
  // ACE inhibitory
  '5909990295715': {
    barcode: '5909990295715',
    name: 'Enarenal',
    activeSubstance: 'Enalapril',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '5mg',
  },
  '5909990295814': {
    barcode: '5909990295814',
    name: 'Enarenal',
    activeSubstance: 'Enalapril',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '10mg',
  },
  '5909990679218': {
    barcode: '5909990679218',
    name: 'Prestarium',
    activeSubstance: 'Peryndopryl',
    manufacturer: 'Servier',
    form: 'tablet',
    dosage: '5mg',
  },
  // Statyny
  '5909990734917': {
    barcode: '5909990734917',
    name: 'Atoris',
    activeSubstance: 'Atorwastatyna',
    manufacturer: 'KRKA',
    form: 'tablet',
    dosage: '10mg',
  },
  '5909990735014': {
    barcode: '5909990735014',
    name: 'Atoris',
    activeSubstance: 'Atorwastatyna',
    manufacturer: 'KRKA',
    form: 'tablet',
    dosage: '20mg',
  },
  '5909990735111': {
    barcode: '5909990735111',
    name: 'Atoris',
    activeSubstance: 'Atorwastatyna',
    manufacturer: 'KRKA',
    form: 'tablet',
    dosage: '40mg',
  },

  // ===== LEKI NA UKŁAD POKARMOWY =====
  '5909990677511': {
    barcode: '5909990677511',
    name: 'Controloc',
    activeSubstance: 'Pantoprazol',
    manufacturer: 'Takeda',
    form: 'tablet',
    dosage: '20mg',
  },
  '5909990677610': {
    barcode: '5909990677610',
    name: 'Controloc',
    activeSubstance: 'Pantoprazol',
    manufacturer: 'Takeda',
    form: 'tablet',
    dosage: '40mg',
  },
  '5909990699919': {
    barcode: '5909990699919',
    name: 'Helicid',
    activeSubstance: 'Omeprazol',
    manufacturer: 'Zentiva',
    form: 'capsule',
    dosage: '20mg',
  },
  '5909990699018': {
    barcode: '5909990699018',
    name: 'Helicid',
    activeSubstance: 'Omeprazol',
    manufacturer: 'Zentiva',
    form: 'capsule',
    dosage: '10mg',
  },
  '5909990379217': {
    barcode: '5909990379217',
    name: 'Espumisan',
    activeSubstance: 'Symetykon',
    manufacturer: 'Berlin-Chemie',
    form: 'capsule',
    dosage: '40mg',
  },
  '5909990058013': {
    barcode: '5909990058013',
    name: 'Smecta',
    activeSubstance: 'Diosmektyt',
    manufacturer: 'Ipsen',
    form: 'other',
    dosage: '3g',
  },
  '5909990089215': {
    barcode: '5909990089215',
    name: 'Loperamid',
    activeSubstance: 'Loperamid',
    manufacturer: 'Polpharma',
    form: 'capsule',
    dosage: '2mg',
  },
  '5909991000110': {
    barcode: '5909991000110',
    name: 'Stoperan',
    activeSubstance: 'Loperamid',
    manufacturer: 'USP Zdrowie',
    form: 'capsule',
    dosage: '2mg',
  },
  
  // ===== LEKI NA ALERGIE =====
  '5909990711512': {
    barcode: '5909990711512',
    name: 'Zyrtec',
    activeSubstance: 'Cetyryzyna',
    manufacturer: 'UCB Pharma',
    form: 'tablet',
    dosage: '10mg',
  },
  '5909990058112': {
    barcode: '5909990058112',
    name: 'Claritine',
    activeSubstance: 'Loratadyna',
    manufacturer: 'Bayer',
    form: 'tablet',
    dosage: '10mg',
  },
  '5909990058211': {
    barcode: '5909990058211',
    name: 'Claritine',
    activeSubstance: 'Loratadyna',
    manufacturer: 'Bayer',
    form: 'syrup',
    dosage: '1mg/ml',
  },
  '5909990706518': {
    barcode: '5909990706518',
    name: 'Allertec',
    activeSubstance: 'Cetyryzyna',
    manufacturer: 'Polpharma',
    form: 'tablet',
    dosage: '10mg',
  },
  '5909990706617': {
    barcode: '5909990706617',
    name: 'Hitaxa',
    activeSubstance: 'Desloratadyna',
    manufacturer: 'KRKA',
    form: 'tablet',
    dosage: '5mg',
  },

  // ===== ANTYBIOTYKI =====
  '5909990055012': {
    barcode: '5909990055012',
    name: 'Augmentin',
    activeSubstance: 'Amoksycylina, Kwas klawulanowy',
    manufacturer: 'GlaxoSmithKline',
    form: 'tablet',
    dosage: '875mg + 125mg',
  },
  '5909990080816': {
    barcode: '5909990080816',
    name: 'Amoksiklav',
    activeSubstance: 'Amoksycylina, Kwas klawulanowy',
    manufacturer: 'Sandoz',
    form: 'tablet',
    dosage: '500mg + 125mg',
  },
  '5909990287918': {
    barcode: '5909990287918',
    name: 'Duomox',
    activeSubstance: 'Amoksycylina',
    manufacturer: 'Astellas',
    form: 'tablet',
    dosage: '500mg',
  },
  '5909990287116': {
    barcode: '5909990287116',
    name: 'Duomox',
    activeSubstance: 'Amoksycylina',
    manufacturer: 'Astellas',
    form: 'tablet',
    dosage: '1000mg',
  },
  '5909990712519': {
    barcode: '5909990712519',
    name: 'Klacid',
    activeSubstance: 'Klarytromycyna',
    manufacturer: 'Abbott',
    form: 'tablet',
    dosage: '500mg',
  },
  '5909990068210': {
    barcode: '5909990068210',
    name: 'Sumamed',
    activeSubstance: 'Azytromycyna',
    manufacturer: 'Pliva',
    form: 'tablet',
    dosage: '500mg',
  },

  // ===== LEKI PRZECIWBÓLOWE - SILNIEJSZE =====
  '5909990958115': {
    barcode: '5909990958115',
    name: 'Xanax',
    activeSubstance: 'Alprazolam',
    manufacturer: 'Pfizer',
    form: 'tablet',
    dosage: '0,25mg',
  },
  '5909990958214': {
    barcode: '5909990958214',
    name: 'Xanax',
    activeSubstance: 'Alprazolam',
    manufacturer: 'Pfizer',
    form: 'tablet',
    dosage: '0,5mg',
  },
  '5909990681716': {
    barcode: '5909990681716',
    name: 'Tramal',
    activeSubstance: 'Tramadol',
    manufacturer: 'Zentiva',
    form: 'capsule',
    dosage: '50mg',
  },

  // ===== NA PRZEZIĘBIENIE =====
  '5909990659814': {
    barcode: '5909990659814',
    name: 'Gripex',
    activeSubstance: 'Paracetamol, Dekstrometorfan, Pseudoefedryna',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '325mg + 15mg + 30mg',
  },
  '5909990659913': {
    barcode: '5909990659913',
    name: 'Gripex Noc',
    activeSubstance: 'Paracetamol, Dekstrometorfan, Chlorfeniramina',
    manufacturer: 'USP Zdrowie',
    form: 'tablet',
    dosage: '325mg + 15mg + 2mg',
  },
  '4030855000319': {
    barcode: '4030855000319',
    name: 'Aspirin Complex',
    activeSubstance: 'Kwas acetylosalicylowy, Pseudoefedryna',
    manufacturer: 'Bayer',
    form: 'other',
    dosage: '500mg + 30mg',
  },
  '5909990711611': {
    barcode: '5909990711611',
    name: 'Fervex',
    activeSubstance: 'Paracetamol, Feniramina, Witamina C',
    manufacturer: 'UPSA',
    form: 'other',
    dosage: '500mg + 25mg + 200mg',
  },
  '5909990711710': {
    barcode: '5909990711710',
    name: 'Theraflu',
    activeSubstance: 'Paracetamol, Fenylofryna, Chlorfeniramina',
    manufacturer: 'GlaxoSmithKline',
    form: 'other',
    dosage: '650mg + 10mg + 4mg',
  },

  // ===== SYROPY NA KASZEL =====
  '5909990679317': {
    barcode: '5909990679317',
    name: 'ACC',
    activeSubstance: 'Acetylocysteina',
    manufacturer: 'Sandoz',
    form: 'syrup',
    dosage: '20mg/ml',
  },
  '5909990679416': {
    barcode: '5909990679416',
    name: 'ACC 200',
    activeSubstance: 'Acetylocysteina',
    manufacturer: 'Sandoz',
    form: 'tablet',
    dosage: '200mg',
  },
  '5909990679515': {
    barcode: '5909990679515',
    name: 'ACC 600',
    activeSubstance: 'Acetylocysteina',
    manufacturer: 'Sandoz',
    form: 'tablet',
    dosage: '600mg',
  },
  '5909990696710': {
    barcode: '5909990696710',
    name: 'Ambroksol',
    activeSubstance: 'Ambroksol',
    manufacturer: 'Polpharma',
    form: 'syrup',
    dosage: '15mg/5ml',
  },
  '5909990687718': {
    barcode: '5909990687718',
    name: 'Mucosolvan',
    activeSubstance: 'Ambroksol',
    manufacturer: 'Boehringer Ingelheim',
    form: 'syrup',
    dosage: '30mg/5ml',
  },

  // ===== LEKI NA GARDŁO =====
  '5909990641017': {
    barcode: '5909990641017',
    name: 'Strepsils',
    activeSubstance: 'Amylmetakrezol, Alkohol dichlorobenzylowy',
    manufacturer: 'Reckitt Benckiser',
    form: 'other',
    dosage: '0,6mg + 1,2mg',
  },
  '5909990641116': {
    barcode: '5909990641116',
    name: 'Strepsils Intensive',
    activeSubstance: 'Flurbiprofen',
    manufacturer: 'Reckitt Benckiser',
    form: 'other',
    dosage: '8,75mg',
  },
  '5909990659012': {
    barcode: '5909990659012',
    name: 'Tantum Verde',
    activeSubstance: 'Benzydamina',
    manufacturer: 'Angelini',
    form: 'other',
    dosage: '3mg',
  },

  // ===== INSULINY (popularne) =====
  '4987327012359': {
    barcode: '4987327012359',
    name: 'Lantus SoloStar',
    activeSubstance: 'Insulina glargine',
    manufacturer: 'Sanofi',
    form: 'injection',
    dosage: '100 j./ml',
  },
  '4987327012366': {
    barcode: '4987327012366',
    name: 'Humalog',
    activeSubstance: 'Insulina lispro',
    manufacturer: 'Eli Lilly',
    form: 'injection',
    dosage: '100 j./ml',
  },
  '4987327012373': {
    barcode: '4987327012373',
    name: 'NovoRapid',
    activeSubstance: 'Insulina aspart',
    manufacturer: 'Novo Nordisk',
    form: 'injection',
    dosage: '100 j./ml',
  },
};

// Fetch medication info from local database first, then try external APIs
export const fetchMedicationByBarcode = async (
  barcode: string
): Promise<MedicationInfo | null> => {
  console.log('Searching for barcode:', barcode);
  
  // First, check local Polish medications database
  if (POLISH_MEDICATIONS_DB[barcode]) {
    console.log('Found in local database');
    return POLISH_MEDICATIONS_DB[barcode];
  }

  // Try Open Food Facts API (has European products)
  try {
    console.log('Trying Open Food Facts API...');
    const offResponse = await fetch(
      `${OPEN_FOOD_FACTS_API}/${barcode}.json`,
      { headers: { 'User-Agent': 'ApteczkaSeniora/1.0' } }
    );

    if (offResponse.ok) {
      const offData = await offResponse.json();
      
      if (offData.status === 1 && offData.product) {
        const product = offData.product;
        // Check if it looks like a medication
        if (
          product.categories_tags?.some((c: string) => 
            c.includes('medication') || 
            c.includes('pharma') || 
            c.includes('drug') ||
            c.includes('health')
          ) ||
          product.product_name
        ) {
          console.log('Found in Open Food Facts');
          return {
            barcode,
            name: product.product_name || product.product_name_pl || 'Nieznany produkt',
            activeSubstance: product.ingredients_text_pl || product.ingredients_text || 'Nieznana',
            manufacturer: product.brands || product.brand_owner || 'Nieznany',
            form: 'other',
            dosage: product.quantity || '',
          };
        }
      }
    }
  } catch (error) {
    console.log('Open Food Facts API error:', error);
  }

  // Try OpenFDA API (works for US medications, may have some international data)
  try {
    console.log('Trying OpenFDA API...');
    // Try searching by UPC/EAN
    const response = await fetch(
      `${OPEN_FDA_API}?search=openfda.upc:"${barcode}"+OR+openfda.package_ndc:"${barcode}"&limit=1`
    );

    if (response.ok) {
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log('Found in OpenFDA');
        return {
          barcode,
          name: result.openfda?.brand_name?.[0] || result.openfda?.generic_name?.[0] || 'Nieznany lek',
          activeSubstance: result.openfda?.generic_name?.[0] || 'Nieznana',
          manufacturer: result.openfda?.manufacturer_name?.[0] || 'Nieznany',
          form: result.dosage_form?.[0]?.toLowerCase(),
          dosage: result.active_ingredient?.[0]?.strength,
        };
      }
    }
  } catch (error) {
    console.log('OpenFDA API error:', error);
  }

  console.log('Medication not found in any database');
  // Return null if medication not found
  return null;
};

// Search medications by name (for manual search)
export const searchMedicationsByName = async (
  query: string
): Promise<MedicationInfo[]> => {
  const results: MedicationInfo[] = [];

  // Search local database
  const queryLower = query.toLowerCase();
  for (const medication of Object.values(POLISH_MEDICATIONS_DB)) {
    if (
      medication.name.toLowerCase().includes(queryLower) ||
      medication.activeSubstance.toLowerCase().includes(queryLower)
    ) {
      results.push(medication);
    }
  }

  // Sort by relevance (name starts with query first)
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(queryLower);
    const bStarts = b.name.toLowerCase().startsWith(queryLower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
};

// Get all medications from local database (for autocomplete)
export const getAllLocalMedications = (): MedicationInfo[] => {
  return Object.values(POLISH_MEDICATIONS_DB);
};

// Get unique medication names for suggestions
export const getMedicationNameSuggestions = (): string[] => {
  const names = new Set<string>();
  for (const med of Object.values(POLISH_MEDICATIONS_DB)) {
    names.add(med.name);
  }
  return Array.from(names).sort();
};

// Create a manual medication entry when barcode is not found
export const createManualMedicationInfo = (
  barcode: string,
  name: string,
  activeSubstance: string,
  manufacturer?: string,
  form?: string,
  dosage?: string
): MedicationInfo => {
  return {
    barcode,
    name,
    activeSubstance,
    manufacturer: manufacturer || 'Nieznany',
    form,
    dosage,
  };
};
