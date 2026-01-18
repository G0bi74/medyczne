// Push notification service using Expo Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Schedule, Medication } from '../../types';
import { format, addMinutes, setHours, setMinutes, parse } from 'date-fns';
import { pl } from 'date-fns/locale';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return false;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Przypomnienia o lekach',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00A08A',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });
  }

  return true;
};

// Get Expo push token for remote notifications
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token.data;
  } catch (error) {
    console.log('Error getting push token:', error);
    return null;
  }
};

// Schedule a local notification for a medication dose
export const scheduleDoseReminder = async (
  schedule: Schedule,
  medication: Medication,
  doseTime: string // Format: "HH:mm"
): Promise<string | null> => {
  try {
    const [hours, minutes] = doseTime.split(':').map(Number);
    
    // Calculate trigger time
    const now = new Date();
    let triggerDate = new Date();
    triggerDate = setHours(triggerDate, hours);
    triggerDate = setMinutes(triggerDate, minutes);
    
    // Subtract reminder minutes
    triggerDate = addMinutes(triggerDate, -schedule.reminderMinutesBefore);

    // If time has passed today, schedule for tomorrow
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    // Check if this day of week is in the schedule
    const dayOfWeek = triggerDate.getDay() || 7; // Convert Sunday from 0 to 7
    if (!schedule.daysOfWeek.includes(dayOfWeek)) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Czas na lek!',
        body: `Przyjmij ${medication.name} (${schedule.dosageAmount})`,
        data: {
          scheduleId: schedule.id,
          medicationId: medication.id,
          type: 'dose_reminder',
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'medication_reminder',
      },
      trigger: {
        date: triggerDate,
        channelId: 'medication-reminders',
      },
    });

    return notificationId;
  } catch (error) {
    console.log('Error scheduling notification:', error);
    return null;
  }
};

// Schedule all reminders for a medication schedule
export const scheduleAllReminders = async (
  schedule: Schedule,
  medication: Medication
): Promise<string[]> => {
  const notificationIds: string[] = [];

  for (const time of schedule.times) {
    const id = await scheduleDoseReminder(schedule, medication, time);
    if (id) {
      notificationIds.push(id);
    }
  }

  return notificationIds;
};

// Cancel a specific scheduled notification
export const cancelReminder = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

// Cancel all scheduled notifications for a schedule
export const cancelAllRemindersForSchedule = async (
  scheduleId: string
): Promise<void> => {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.scheduleId === scheduleId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
};

// Cancel all notifications
export const cancelAllReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Send immediate notification (for testing or alerts)
export const sendImmediateNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Immediate
  });
};

// Set up notification categories with actions
export const setupNotificationCategories = async (): Promise<void> => {
  await Notifications.setNotificationCategoryAsync('medication_reminder', [
    {
      identifier: 'TAKE_DOSE',
      buttonTitle: '✅ Wziąłem',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SKIP_DOSE',
      buttonTitle: '⏭️ Pomiń',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: '⏰ Za 10 min',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
};

// Add notification response listener
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// Add notification received listener (when app is in foreground)
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
  return await Notifications.getBadgeCountAsync();
};

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};
