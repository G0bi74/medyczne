import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { fetchMedicationByBarcode } from '../../services/barcode/barcodeService';
import { checkInteractions } from '../../services/interactions/interactionChecker';
import { addMedication } from '../../services/api/medicationService';
import { useAuthStore, useMedicationStore } from '../../store';
import { Button, Card, Input, InteractionAlert } from '../../components';
import { MedicationInfo, DrugInteraction } from '../../types';

// Lista popularnych leków do testów
const TEST_MEDICATIONS = [
  { name: 'Apap', substance: 'Paracetamol', dosage: '500mg', form: 'tablet' },
  { name: 'Ibuprom', substance: 'Ibuprofen', dosage: '200mg', form: 'tablet' },
  { name: 'Aspirin', substance: 'Kwas acetylosalicylowy', dosage: '500mg', form: 'tablet' },
  { name: 'Rutinoscorbin', substance: 'Witamina C + Rutyna', dosage: '100mg', form: 'tablet' },
  { name: 'Xanax', substance: 'Alprazolam', dosage: '0.25mg', form: 'tablet' },
  { name: 'Metformin', substance: 'Metformina', dosage: '500mg', form: 'tablet' },
  { name: 'Amlodipine', substance: 'Amlodypina', dosage: '5mg', form: 'tablet' },
  { name: 'Omeprazol', substance: 'Omeprazol', dosage: '20mg', form: 'capsule' },
  { name: 'Atorvastatin', substance: 'Atorwastatyna', dosage: '20mg', form: 'tablet' },
  { name: 'Warfarin', substance: 'Warfaryna', dosage: '5mg', form: 'tablet' },
  { name: 'Bisoprolol', substance: 'Bisoprolol', dosage: '5mg', form: 'tablet' },
  { name: 'Ramipril', substance: 'Ramipryl', dosage: '5mg', form: 'tablet' },
];

interface ScanMedicationScreenProps {
  navigation: any;
}

type ScanState = 'scanning' | 'found' | 'not_found' | 'adding';

export const ScanMedicationScreen: React.FC<ScanMedicationScreenProps> = ({
  navigation,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [medicationInfo, setMedicationInfo] = useState<MedicationInfo | null>(null);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [showTestList, setShowTestList] = useState(false);
  
  // Manual entry fields
  const [manualName, setManualName] = useState('');
  const [manualSubstance, setManualSubstance] = useState('');
  const [manualDosage, setManualDosage] = useState('');
  const [packageSize, setPackageSize] = useState('30');
  const [expirationDate, setExpirationDate] = useState('');
  
  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const addMedicationToStore = useMedicationStore((state) => state.addMedication);

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanState !== 'scanning') return;
    
    setScannedBarcode(data);
    setLoading(true);
    
    try {
      const info = await fetchMedicationByBarcode(data);
      
      if (info) {
        setMedicationInfo(info);
        setScanState('found');
        
        // Check for interactions
        const interactionResult = checkInteractions(
          { activeSubstance: info.activeSubstance },
          medications
        );
        setInteractions(interactionResult.interactions);
      } else {
        setScanState('not_found');
      }
    } catch (error) {
      console.error('Error fetching medication:', error);
      setScanState('not_found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    const name = medicationInfo?.name || manualName;
    const substance = medicationInfo?.activeSubstance || manualSubstance;
    
    if (!name.trim() || !substance.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę leku i substancję czynną');
      return;
    }
    
    setScanState('adding');
    
    // Parse expiration date if provided
    let parsedExpirationDate: Date | undefined;
    if (expirationDate) {
      const [year, month, day] = expirationDate.split('-').map(Number);
      if (year && month) {
        parsedExpirationDate = new Date(year, month - 1, day || 1);
      }
    }
    
    const medicationToAdd: any = {
      userId: user?.id || 'demo-user',
      barcode: scannedBarcode || '',
      name: name,
      activeSubstance: substance,
      dosage: medicationInfo?.dosage || manualDosage || '',
      form: (medicationInfo?.form as any) || 'tablet',
      packageSize: parseInt(packageSize) || 30,
      currentQuantity: parseInt(packageSize) || 30,
      manufacturer: medicationInfo?.manufacturer,
      leafletUrl: medicationInfo?.leafletUrl,
      addedAt: new Date(),
      expirationDate: parsedExpirationDate,
    };
    
    try {
      // If user is logged in, try to save to Firebase
      if (user) {
        const newMedication = await addMedication(medicationToAdd);
        addMedicationToStore(newMedication);
        
        Alert.alert(
          'Sukces!',
          `Lek "${name}" został dodany do Twojej apteczki.`,
          [
            {
              text: 'Dodaj harmonogram',
              onPress: () =>
                navigation.replace('AddSchedule', { medicationId: newMedication.id }),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Offline/demo mode - save locally only
        const localMedication = {
          ...medicationToAdd,
          id: `local-${Date.now()}`,
        };
        addMedicationToStore(localMedication);
        
        Alert.alert(
          'Zapisano lokalnie',
          `Lek "${name}" został dodany (tryb offline). Zaloguj się, aby zsynchronizować dane.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error adding medication:', error);
      
      // If Firebase fails, save locally
      const localMedication = {
        ...medicationToAdd,
        id: `local-${Date.now()}`,
      };
      addMedicationToStore(localMedication);
      
      Alert.alert(
        'Zapisano lokalnie',
        `Nie udało się zapisać w chmurze (${error.message}). Lek został zapisany lokalnie.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanState('scanning');
    setScannedBarcode(null);
    setMedicationInfo(null);
    setInteractions([]);
    setManualName('');
    setManualSubstance('');
    setManualDosage('');
    setExpirationDate('');
    setShowTestList(false);
  };

  const selectTestMedication = (med: typeof TEST_MEDICATIONS[0]) => {
    setManualName(med.name);
    setManualSubstance(med.substance);
    setManualDosage(med.dosage);
    setShowTestList(false);
    
    // Check for interactions
    const interactionResult = checkInteractions(
      { activeSubstance: med.substance },
      medications
    );
    setInteractions(interactionResult.interactions);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={64} color={Colors.primary[500]} />
          <Text style={styles.permissionTitle}>Dostęp do kamery</Text>
          <Text style={styles.permissionText}>
            Aby skanować kody kreskowe leków, potrzebujemy dostępu do kamery Twojego
            urządzenia.
          </Text>
          <Button
            title="Zezwól na dostęp"
            onPress={requestPermission}
            fullWidth
          />
        </View>
      </View>
    );
  }

  if (scanState === 'found' || scanState === 'not_found' || scanState === 'adding') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {scanState === 'found' ? 'Znaleziono lek' : 'Dodaj lek'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.resultContent} 
          contentContainerStyle={styles.resultContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {scannedBarcode && (
            <Text style={styles.barcodeText}>Kod: {scannedBarcode}</Text>
          )}

          {scanState === 'found' && medicationInfo && (
            <Card style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <View style={styles.medicationIcon}>
                  <Ionicons name="medical" size={32} color={Colors.primary[500]} />
                </View>
                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{medicationInfo.name}</Text>
                  <Text style={styles.medicationSubstance}>
                    {medicationInfo.activeSubstance}
                  </Text>
                </View>
              </View>

              {medicationInfo.dosage && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dawka:</Text>
                  <Text style={styles.detailValue}>{medicationInfo.dosage}</Text>
                </View>
              )}

              {medicationInfo.manufacturer && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Producent:</Text>
                  <Text style={styles.detailValue}>{medicationInfo.manufacturer}</Text>
                </View>
              )}

              <Input
                label="Ilość w opakowaniu"
                value={packageSize}
                onChangeText={setPackageSize}
                keyboardType="number-pad"
                placeholder="30"
              />

              <Input
                label="Data ważności (RRRR-MM-DD)"
                value={expirationDate}
                onChangeText={setExpirationDate}
                placeholder="np. 2026-12-31"
              />
            </Card>
          )}

          {scanState === 'not_found' && (
            <Card style={styles.manualEntryCard}>
              <View style={styles.notFoundHeader}>
                <Ionicons name="help-circle-outline" size={48} color={Colors.warning} />
                <Text style={styles.notFoundTitle}>Dodaj lek</Text>
                <Text style={styles.notFoundText}>
                  Wybierz z listy lub wprowadź ręcznie
                </Text>
              </View>

              {/* Test medications dropdown */}
              <TouchableOpacity 
                style={styles.testListToggle}
                onPress={() => setShowTestList(!showTestList)}
              >
                <Ionicons 
                  name="list" 
                  size={20} 
                  color={Colors.primary[500]} 
                />
                <Text style={styles.testListToggleText}>
                  Wybierz z listy popularnych leków
                </Text>
                <Ionicons 
                  name={showTestList ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={Colors.primary[500]} 
                />
              </TouchableOpacity>

              {showTestList && (
                <ScrollView style={styles.testListContainer} nestedScrollEnabled>
                  {TEST_MEDICATIONS.map((med, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.testListItem}
                      onPress={() => selectTestMedication(med)}
                    >
                      <View style={styles.testListItemIcon}>
                        <Ionicons name="medical" size={16} color={Colors.primary[500]} />
                      </View>
                      <View style={styles.testListItemContent}>
                        <Text style={styles.testListItemName}>{med.name}</Text>
                        <Text style={styles.testListItemDetails}>
                          {med.substance} • {med.dosage}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={Colors.primary[500]} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>lub wprowadź ręcznie</Text>
                <View style={styles.orLine} />
              </View>

              <Input
                label="Nazwa leku *"
                value={manualName}
                onChangeText={setManualName}
                placeholder="np. Apap"
              />

              <Input
                label="Substancja czynna *"
                value={manualSubstance}
                onChangeText={setManualSubstance}
                placeholder="np. Paracetamol"
              />

              <Input
                label="Dawka"
                value={manualDosage}
                onChangeText={setManualDosage}
                placeholder="np. 500mg"
              />

              <Input
                label="Ilość w opakowaniu"
                value={packageSize}
                onChangeText={setPackageSize}
                keyboardType="number-pad"
                placeholder="30"
              />

              <Input
                label="Data ważności (RRRR-MM-DD)"
                value={expirationDate}
                onChangeText={setExpirationDate}
                placeholder="np. 2026-12-31"
              />
            </Card>
          )}

          {/* Drug Interactions Warning */}
          {interactions.length > 0 && (
            <View style={styles.interactionsSection}>
              <Text style={styles.interactionsTitle}>
                ⚠️ Wykryto interakcje lekowe
              </Text>
              {interactions.map((interaction) => (
                <InteractionAlert
                  key={interaction.id}
                  interaction={interaction}
                />
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Dodaj do apteczki"
              onPress={handleAddMedication}
              loading={scanState === 'adding'}
              fullWidth
              size="large"
            />
            
            <Button
              title="Skanuj ponownie"
              onPress={resetScanner}
              variant="outline"
              fullWidth
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color={Colors.text.inverse} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFlashOn(!flashOn)}
              style={styles.flashButton}
            >
              <Ionicons
                name={flashOn ? 'flash' : 'flash-off'}
                size={24}
                color={Colors.text.inverse}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.text.inverse} />
                <Text style={styles.loadingText}>Wyszukiwanie leku...</Text>
              </View>
            )}
          </View>

          <View style={styles.overlayBottom}>
            <Text style={styles.instructions}>
              Skieruj kamerę na kod kreskowy leku
            </Text>
            
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => setScanState('not_found')}
            >
              <Ionicons name="create-outline" size={20} color={Colors.text.inverse} />
              <Text style={styles.manualButtonText}>Wprowadź ręcznie</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  permissionContent: {
    alignItems: 'center',
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary[400],
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.inverse,
    marginTop: Spacing.sm,
  },
  overlayBottom: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  instructions: {
    ...Typography.body,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  manualButtonText: {
    ...Typography.body,
    color: Colors.text.inverse,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  resultContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  resultContentContainer: {
    paddingBottom: Spacing.xxl,
  },
  barcodeText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  medicationCard: {
    marginBottom: Spacing.lg,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  medicationIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  medicationSubstance: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  manualEntryCard: {
    marginBottom: Spacing.lg,
  },
  notFoundHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  notFoundTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  notFoundText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  testListToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[50],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  testListToggleText: {
    ...Typography.bodyBold,
    color: Colors.primary[600],
    flex: 1,
  },
  testListContainer: {
    maxHeight: 200,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  testListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    gap: Spacing.sm,
  },
  testListItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  testListItemContent: {
    flex: 1,
  },
  testListItemName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  testListItemDetails: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  orText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  interactionsSection: {
    marginBottom: Spacing.lg,
  },
  interactionsTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: Spacing.lg,
  },
});

export default ScanMedicationScreen;
