import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Button } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useCaregiverStore } from '../../store';
import { User } from '../../types';
import { unlinkSenior, getSeniorMedications } from '../../services/api/caregiverService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface SeniorsListScreenProps {
  navigation: any;
}

export const SeniorsListScreen: React.FC<SeniorsListScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const seniors = useCaregiverStore((state) => state.seniors);
  const setSeniors = useCaregiverStore((state) => state.setSeniors);
  const seniorMedications = useCaregiverStore((state) => state.seniorMedications);
  const setSeniorMedications = useCaregiverStore((state) => state.setSeniorMedications);

  const loadSeniors = async () => {
    if (!user || !user.seniorIds || user.seniorIds.length === 0) {
      setSeniors([]);
      return;
    }

    try {
      const seniorUsers: User[] = [];
      
      for (const seniorId of user.seniorIds) {
        const seniorDoc = await getDoc(doc(db, 'users', seniorId));
        if (seniorDoc.exists()) {
          const data = seniorDoc.data();
          seniorUsers.push({
            id: seniorDoc.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: data.role,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      }
      
      setSeniors(seniorUsers);

      // Load medications for each senior
      for (const senior of seniorUsers) {
        const meds = await getSeniorMedications(senior.id);
        setSeniorMedications(senior.id, meds);
      }
    } catch (error) {
      console.error('Error loading seniors:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSeniors();
    }, [user?.seniorIds])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeniors();
    setRefreshing(false);
  };

  const handleUnlinkSenior = (senior: User) => {
    Alert.alert(
      'Usuń podopiecznego',
      `Czy na pewno chcesz usunąć ${senior.name} z listy podopiecznych? Nie będziesz mógł monitorować przyjmowania leków.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await unlinkSenior(user.id, senior.id);
              // Update local state
              const newSeniorIds = (user.seniorIds || []).filter((id) => id !== senior.id);
              setUser({ ...user, seniorIds: newSeniorIds });
              setSeniors(seniors.filter((s) => s.id !== senior.id));
              Alert.alert('Sukces', 'Podopieczny został usunięty');
            } catch (error) {
              console.error('Error unlinking:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć podopiecznego');
            }
          },
        },
      ]
    );
  };

  const handleContactSenior = (senior: User) => {
    if (senior.phone) {
      Alert.alert(
        `Kontakt z ${senior.name}`,
        `Zadzwonić pod numer ${senior.phone}?`,
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Zadzwoń', onPress: () => {} },
        ]
      );
    } else {
      Alert.alert('Brak numeru', 'Ten senior nie ma zapisanego numeru telefonu.');
    }
  };

  const renderSeniorItem = ({ item: senior }: { item: User }) => {
    const medications = seniorMedications[senior.id] || [];
    const initials = senior.name.split(' ').map((n) => n[0]).join('').toUpperCase();

    return (
      <Card style={styles.seniorCard}>
        <TouchableOpacity
          style={styles.seniorContent}
          onPress={() => navigation.navigate('SeniorDetail', { seniorId: senior.id })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          
          <View style={styles.seniorInfo}>
            <Text style={styles.seniorName}>{senior.name}</Text>
            <Text style={styles.seniorMeds}>
              {medications.length} {medications.length === 1 ? 'lek' : 'leków'}
            </Text>
            {senior.phone && (
              <Text style={styles.seniorPhone}>{senior.phone}</Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleContactSenior(senior)}
            >
              <Ionicons name="call-outline" size={20} color={Colors.primary[500]} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleUnlinkSenior(senior)}
            >
              <Ionicons name="close-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => navigation.navigate('SeniorDetail', { seniorId: senior.id })}
        >
          <Text style={styles.detailsButtonText}>Zobacz szczegóły</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      </Card>
    );
  };

  if (!user?.seniorIds || user.seniorIds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="people-outline" size={64} color={Colors.neutral[300]} />
        </View>
        <Text style={styles.emptyTitle}>Brak podopiecznych</Text>
        <Text style={styles.emptyText}>
          Dodaj seniora, aby móc monitorować przyjmowanie przez niego leków.
        </Text>
        <Button
          title="Dodaj seniora"
          onPress={() => navigation.navigate('LinkCaregiver')}
          icon={<Ionicons name="add" size={20} color={Colors.text.inverse} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={seniors}
        keyExtractor={(item) => item.id}
        renderItem={renderSeniorItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {seniors.length} {seniors.length === 1 ? 'podopieczny' : 'podopiecznych'}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('LinkCaregiver')}
            >
              <Ionicons name="add" size={24} color={Colors.primary[500]} />
            </TouchableOpacity>
          </View>
        }
      />
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
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  seniorCard: {
    marginBottom: Spacing.md,
  },
  seniorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.h3,
    color: Colors.primary[600],
  },
  seniorInfo: {
    flex: 1,
  },
  seniorName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  seniorMeds: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  seniorPhone: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error + '15',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    gap: Spacing.xs,
  },
  detailsButtonText: {
    ...Typography.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.secondary,
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
});

export default SeniorsListScreen;
