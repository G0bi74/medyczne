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
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore, useMedicationStore, useDoseLogStore } from '../../store';
import { getDoseLogsByUser } from '../../services/api/medicationService';
import { DoseLog } from '../../types';

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
  const doseLogs = useDoseLogStore((state) => state.doseLogs);
  const setDoseLogs = useDoseLogStore((state) => state.setDoseLogs);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const logs = await getDoseLogsByUser(user.id);
      setDoseLogs(logs);

      // Generate notifications from dose logs and medications
      const notifs: NotificationItem[] = [];

      // Missed doses
      logs
        .filter((log) => log.status === 'missed')
        .forEach((log) => {
          const medication = medications.find((m) => m.id === log.medicationId);
          notifs.push({
            id: `missed_${log.id}`,
            type: 'missed_dose',
            title: 'Pominięta dawka',
            message: `Nie przyjęto leku ${medication?.name || 'Lek'} o ${format(log.scheduledTime, 'HH:mm')}`,
            timestamp: log.scheduledTime,
            read: false,
            data: { logId: log.id, medicationId: log.medicationId },
          });
        });

      // Recent taken doses (last 24h)
      logs
        .filter((log) => log.status === 'taken' && differenceInHours(new Date(), log.takenAt!) < 24)
        .forEach((log) => {
          const medication = medications.find((m) => m.id === log.medicationId);
          notifs.push({
            id: `taken_${log.id}`,
            type: 'taken',
            title: 'Lek przyjęty',
            message: `Przyjęto ${medication?.name || 'Lek'}`,
            timestamp: log.takenAt!,
            read: true,
            data: { logId: log.id, medicationId: log.medicationId },
          });
        });

      // Low quantity medications
      medications
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
      medications
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
