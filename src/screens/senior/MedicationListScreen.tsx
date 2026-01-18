import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { MedicationCard, Button, Input } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useMedicationStore } from '../../store';
import { getMedicationsByUser, deleteMedication } from '../../services/api/medicationService';
import { Medication } from '../../types';

interface MedicationListScreenProps {
  navigation: any;
}

export const MedicationListScreen: React.FC<MedicationListScreenProps> = ({
  navigation,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const setMedications = useMedicationStore((state) => state.setMedications);
  const removeMedication = useMedicationStore((state) => state.removeMedication);

  const loadMedications = async () => {
    if (!user) return;
    
    try {
      const meds = await getMedicationsByUser(user.id);
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  };

  const handleDeleteMedication = (medication: Medication) => {
    Alert.alert(
      'Usuń lek',
      `Czy na pewno chcesz usunąć "${medication.name}" z apteczki? Ta operacja usunie również wszystkie harmonogramy związane z tym lekiem.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedication(medication.id);
              removeMedication(medication.id);
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć leku');
            }
          },
        },
      ]
    );
  };

  const filteredMedications = medications.filter(
    (med) =>
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.activeSubstance.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMedication = ({ item }: { item: Medication }) => (
    <MedicationCard
      medication={item}
      onPress={() =>
        navigation.navigate('MedicationDetail', { medicationId: item.id })
      }
      onEdit={() => handleDeleteMedication(item)}
      showQuantity
      showExpiration
    />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="medical-outline" size={64} color={Colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>Brak leków</Text>
      <Text style={styles.emptyText}>
        Dodaj pierwszy lek do swojej apteczki, skanując jego kod kreskowy lub
        wprowadzając dane ręcznie.
      </Text>
      <Button
        title="Skanuj lek"
        onPress={() => navigation.navigate('ScanMedication')}
        icon={<Ionicons name="scan-outline" size={20} color={Colors.text.inverse} />}
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Input
        placeholder="Szukaj leku..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={
          <Ionicons name="search-outline" size={20} color={Colors.text.tertiary} />
        }
        rightIcon={
          searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ) : undefined
        }
        containerStyle={styles.searchInput}
      />

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{medications.length}</Text>
          <Text style={styles.statLabel}>Wszystkie leki</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>
            {medications.filter((m) => m.currentQuantity < 10).length}
          </Text>
          <Text style={styles.statLabel}>Kończy się</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>
            {
              medications.filter(
                (m) =>
                  m.expirationDate &&
                  m.expirationDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Wygasa</Text>
        </View>
      </View>

      {filteredMedications.length > 0 && (
        <Text style={styles.listHeader}>
          {searchQuery
            ? `Znaleziono: ${filteredMedications.length}`
            : `Twoje leki (${medications.length})`}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMedications}
        renderItem={renderMedication}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!searchQuery ? renderEmptyList : null}
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

      {medications.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ScanMedication')}
        >
          <Ionicons name="add" size={28} color={Colors.text.inverse} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: Spacing.md,
  },
  searchInput: {
    marginBottom: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statNumber: {
    ...Typography.h2,
    color: Colors.primary[500],
  },
  statLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  listHeader: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
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
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});

export default MedicationListScreen;
