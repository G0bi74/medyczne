import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store';
import { subscribeToAuthChanges, getCurrentUser } from './src/services/api/authService';
import {
  requestNotificationPermissions,
  setupNotificationCategories,
  addNotificationResponseListener,
} from './src/services/notifications/pushService';

export default function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await getCurrentUser();
          setUser(user);
        } catch (error) {
          console.error('Error getting current user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    // Initialize notifications
    const initNotifications = async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await setupNotificationCategories();
      }
    };

    initNotifications();

    // Listen for notification responses
    const notificationResponseListener = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      
      if (response.actionIdentifier === 'TAKE_DOSE') {
        // Handle take dose action
        console.log('User took dose:', data);
      } else if (response.actionIdentifier === 'SKIP_DOSE') {
        // Handle skip dose action
        console.log('User skipped dose:', data);
      } else if (response.actionIdentifier === 'SNOOZE') {
        // Handle snooze action - reschedule for 10 minutes later
        console.log('User snoozed dose:', data);
      }
    });

    return () => {
      unsubscribe();
      notificationResponseListener.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
