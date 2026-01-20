import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../store';
import { Colors } from '../constants/theme';
import { RootStackParamList, SeniorTabParamList, CaregiverTabParamList } from '../types';

// Auth screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Senior screens
import { DashboardScreen } from '../screens/senior/DashboardScreen';
import { MedicationListScreen } from '../screens/senior/MedicationListScreen';
import { MedicationDetailScreen } from '../screens/senior/MedicationDetailScreen';
import { ScheduleScreen } from '../screens/senior/ScheduleScreen';
import { ScanMedicationScreen } from '../screens/senior/ScanMedicationScreen';
import { AddScheduleScreen } from '../screens/senior/AddScheduleScreen';

// Caregiver screens
import { MonitoringDashboard } from '../screens/caregiver/MonitoringDashboard';
import { SeniorsListScreen } from '../screens/caregiver/SeniorsListScreen';
import { SeniorDetailScreen } from '../screens/caregiver/SeniorDetailScreen';
import { AlertsScreen } from '../screens/caregiver/AlertsScreen';

// Shared screens
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { LinkCaregiverScreen } from '../screens/shared/LinkCaregiverScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const SeniorTab = createBottomTabNavigator<SeniorTabParamList>();
const CaregiverTab = createBottomTabNavigator<CaregiverTabParamList>();

// Senior Tab Navigator
const SeniorTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  
  return (
    <SeniorTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Medications':
              iconName = focused ? 'medical' : 'medical-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: Colors.background.primary,
          borderTopColor: Colors.neutral[200],
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: 60 + bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.background.primary,
        },
        headerTitleStyle: {
          color: Colors.text.primary,
          fontWeight: '600',
        },
        headerShadowVisible: false,
      })}
    >
      <SeniorTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Strona główna',
          headerShown: false,
        }}
      />
      <SeniorTab.Screen
        name="Medications"
        component={MedicationListScreen}
        options={{
          title: 'Moje leki',
          headerTitle: 'Moje leki',
        }}
      />
      <SeniorTab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Harmonogram',
          headerTitle: 'Harmonogram',
        }}
      />
      <SeniorTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          headerTitle: 'Profil',
        }}
      />
    </SeniorTab.Navigator>
  );
};

// Caregiver Tab Navigator
const CaregiverTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  
  return (
    <CaregiverTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Monitoring':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Seniors':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Alerts':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: Colors.background.primary,
          borderTopColor: Colors.neutral[200],
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: 60 + bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.background.primary,
        },
        headerTitleStyle: {
          color: Colors.text.primary,
          fontWeight: '600',
        },
        headerShadowVisible: false,
      })}
    >
      <CaregiverTab.Screen
        name="Monitoring"
        component={MonitoringDashboard}
        options={{
          title: 'Panel',
          headerShown: false,
        }}
      />
      <CaregiverTab.Screen
        name="Seniors"
        component={SeniorsListScreen}
        options={{
          title: 'Podopieczni',
          headerTitle: 'Moi podopieczni',
        }}
      />
      <CaregiverTab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Powiadomienia',
          headerTitle: 'Powiadomienia',
        }}
      />
      <CaregiverTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          headerTitle: 'Profil',
        }}
      />
    </CaregiverTab.Navigator>
  );
};

// No longer needed - using real screens
// const SeniorsPlaceholder = () => (...)
// const AlertsPlaceholder = () => (...)

// Auth Stack
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
export const AppNavigator = () => {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background.primary,
          },
          headerTitleStyle: {
            color: Colors.text.primary,
            fontWeight: '600',
          },
          headerTintColor: Colors.primary[500],
          headerShadowVisible: false,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthStack}
            options={{ headerShown: false }}
          />
        ) : user?.role === 'caregiver' ? (
          <>
            <Stack.Screen
              name="CaregiverTabs"
              component={CaregiverTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ScanMedication"
              component={ScanMedicationScreen}
              options={{
                presentation: 'fullScreenModal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="LinkCaregiver"
              component={LinkCaregiverScreen}
              options={{
                headerTitle: 'Połącz z seniorem',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="SeniorDetail"
              component={SeniorDetailScreen}
              options={{
                headerTitle: 'Szczegóły podopiecznego',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="SeniorTabs"
              component={SeniorTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ScanMedication"
              component={ScanMedicationScreen}
              options={{
                presentation: 'fullScreenModal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="MedicationDetail"
              component={MedicationDetailScreen}
              options={{
                headerTitle: 'Szczegóły leku',
              }}
            />
            <Stack.Screen
              name="AddSchedule"
              component={AddScheduleScreen}
              options={{
                headerTitle: 'Nowy harmonogram',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="LinkCaregiver"
              component={LinkCaregiverScreen}
              options={{
                headerTitle: 'Dodaj opiekuna',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerTitle: 'Powiadomienia',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
});

export default AppNavigator;
