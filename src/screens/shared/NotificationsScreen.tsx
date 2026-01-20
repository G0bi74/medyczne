import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday, differenceInHours, differenceInMinutes, startOfDay, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useMedicationStore, useScheduleStore } from '../../store';
import { getSchedulesByUser, getMedicationsByUser } from '../../services/api/medicationService';
import { 
  generateTodaysDoses, 
  loadDoseStatusesFromFirebase,
  GeneratedDose,
} from '../../services/doses/doseGenerator';

interface NotificationsScreenProps {
  navigation: any;
}

interface NotificationItem {
  id: string;
  type: 'missed_dose' | 'low_quantity' | 'expiring' | 'taken' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  navigation,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const user = useAuthStore((state) => state.user);
  const medications = useMedicationStore((state) => state.medications);
  const setMedications = useMedicationStore((state) => state.setMedications);
  const schedules = useScheduleStore((state) => state.schedules);
  const setSchedules = useScheduleStore((state) => state.setSchedules);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      // Load saved dose statuses from Firebase
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);
      await loadDoseStatusesFromFirebase(user.id, today, tomorrow);
      
      // Load medications and schedules
      const [meds, scheds] = await Promise.all([
        getMedicationsByUser(user.id),
        getSchedulesByUser(user.id),
      ]);
      setMedications(meds);
      setSchedules(scheds);

      // Generate today's doses from schedules
      const todaysDoses = generateTodaysDoses(scheds, meds, user.id);

      // Generate notifications
      const notifs: NotificationItem[] = [];
      const now = new Date();

      // Missed doses (pending and overdue by more than 30 minutes, or marked as missed)
      todaysDoses
        .filter((dose) => {
          if (dose.status === 'missed') return true;
          if (dose.status === 'pending') {
            const minutesOverdue = differenceInMinutes(now, dose.scheduledTime);
            return minutesOverdue > 30;
          }
          return false;
        })
        .forEach((dose) => {
          const medication = meds.find((m) => m.id === dose.medicationId);
          notifs.push({
            id: `missed_${dose.id}`,
            type: 'missed_dose',
            title: 'Pominięta dawka',
            message: `Nie przyjęto leku ${medication?.name || 'Lek'} o ${format(dose.scheduledTime, 'HH:mm')}`,
            timestamp: dose.scheduledTime,
            read: false,
            data: { doseId: dose.id, medicationId: dose.medicationId },
          });
        });

      // Recent taken doses (from today)
      todaysDoses
        .filter((dose) => dose.status === 'taken' && dose.takenAt)
        .forEach((dose) => {
          const medication = meds.find((m) => m.id === dose.medicationId);
          notifs.push({
            id: `taken_${dose.id}`,
            type: 'taken',
            title: 'Lek przyjęty',
            message: `Przyjęto ${medication?.name || 'Lek'}`,
            timestamp: dose.takenAt!,
            read: true,
            data: { doseId: dose.id, medicationId: dose.medicationId },
          });
        });

      // Low quantity medications
      meds
        .filter((m) => m.currentQuantity < 10)
        .forEach((med) => {
          notifs.push({
            id: `low_${med.id}`,
            type: 'low_quantity',
            title: 'Kończy się zapas',
            message: `${med.name} - pozostało tylko ${med.currentQuantity} szt.`,
            timestamp: new Date(),
            read: false,
            data: { medicationId: med.id },
          });
        });

      // Expiring medications
      meds
        .filter((m) => m.expirationDate && m.expirationDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000)
        .forEach((med) => {
          notifs.push({
            id: `expiring_${med.id}`,
            type: 'expiring',
            title: 'Lek wkrótce wygasa',
            message: `${med.name} - ważny do ${format(med.expirationDate!, 'd MMMM', { locale: pl })}`,
            timestamp: new Date(),
            read: false,
            data: { medicationId: med.id },
          });
        });

      // Sort by timestamp (newest first)
      notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user, medications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const getNotificationIcon = (type: NotificationItem['type']): {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
  } => {
    switch (type) {
      case 'missed_dose':
        return {
          name: 'close-circle',
          color: Colors.error,
          bgColor: Colors.error + '15',
        };
      case 'low_quantity':
        return {
          name: 'warning',
          color: Colors.warning,
          bgColor: Colors.warning + '15',
        };
      case 'expiring':
        return {
          name: 'time',
          color: Colors.warning,
          bgColor: Colors.warning + '15',
        };
      case 'taken':
        return {
          name: 'checkmark-circle',
          color: Colors.success,
          bgColor: Colors.success + '15',
        };
      case 'reminder':
        return {
          name: 'notifications',
          color: Colors.primary[500],
          bgColor: Colors.primary[50],
        };
      default:
        return {
          name: 'ellipse',
          color: Colors.text.tertiary,
          bgColor: Colors.neutral[100],
        };
    }
  };

  const formatTimestamp = (date: Date): string => {
    if (isToday(date)) {
      return `Dziś, ${format(date, 'HH:mm')}`;
    }
    if (isYesterday(date)) {
      return `Wczoraj, ${format(date, 'HH:mm')}`;
    }
    return format(date, 'd MMM, HH:mm', { locale: pl });
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    if (notification.data?.medicationId) {
      navigation.navigate('MedicationDetail', {
        medicationId: notification.data.medicationId,
      });
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bgColor }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="notifications-off-outline" size={64} color={Colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>Brak powiadomień</Text>
      <Text style={styles.emptyText}>
        Tutaj pojawią się powiadomienia o Twoich lekach i harmonogramach.
      </Text>
    </View>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="notifications" size={18} color={Colors.primary[500]} />
          <Text style={styles.unreadBannerText}>
            Masz {unreadCount} nieprzeczytanych powiadomień
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    flexGrow: 1,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[50],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  unreadBannerText: {
    ...Typography.caption,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  unreadItem: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  unreadTitle: {
    color: Colors.primary[600],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
  },
  message: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  timestamp: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  separator: {
    height: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
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
    maxWidth: 280,
  },
});

export default NotificationsScreen;
