import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Card } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store';
import { logoutUser, updateUserProfile } from '../../services/api/authService';
import { cancelAllReminders } from '../../services/notifications/pushService';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Błąd', 'Imię i nazwisko nie może być puste');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(user.id, { name, phone });
      // Update local state would happen through a listener in production
      Alert.alert('Sukces', 'Profil został zaktualizowany');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się zaktualizować profilu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Wylogowanie',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllReminders();
              await logoutUser();
              logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Usuń konto',
      'Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna i usunie wszystkie Twoje dane.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń konto',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Potwierdź usunięcie',
              'Wpisz "USUŃ" aby potwierdzić usunięcie konta.',
              [{ text: 'Anuluj', style: 'cancel' }]
            );
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const MenuItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }> = ({ icon, title, subtitle, onPress, rightElement, danger }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.menuIcon, danger && { backgroundColor: Colors.error + '15' }]}>
        <Ionicons
          name={icon}
          size={22}
          color={danger ? Colors.error : Colors.primary[500]}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && { color: Colors.error }]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color={Colors.text.inverse} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || 'Użytkownik'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons
            name={user?.role === 'caregiver' ? 'people' : 'person'}
            size={14}
            color={Colors.primary[600]}
          />
          <Text style={styles.roleText}>
            {user?.role === 'caregiver' ? 'Opiekun' : 'Senior'}
          </Text>
        </View>
      </View>

      {/* Edit Profile */}
      {isEditing ? (
        <Card style={styles.editCard}>
          <Text style={styles.sectionTitle}>Edytuj profil</Text>
          
          <Input
            label="Imię i nazwisko"
            value={name}
            onChangeText={setName}
            placeholder="Jan Kowalski"
          />
          
          <Input
            label="Numer telefonu"
            value={phone}
            onChangeText={setPhone}
            placeholder="+48 123 456 789"
            keyboardType="phone-pad"
          />
          
          <View style={styles.editActions}>
            <Button
              title="Zapisz"
              onPress={handleSaveProfile}
              loading={loading}
              style={{ flex: 1 }}
            />
            <Button
              title="Anuluj"
              variant="outline"
              onPress={() => {
                setIsEditing(false);
                setName(user?.name || '');
                setPhone(user?.phone || '');
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : (
        <Card style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            title="Edytuj profil"
            subtitle="Zmień imię, numer telefonu"
            onPress={() => setIsEditing(true)}
          />
        </Card>
      )}

      {/* Caregiver Settings (for seniors) */}
      {user?.role === 'senior' && (
        <Card style={styles.menuCard}>
          <Text style={styles.cardTitle}>Opiekunowie</Text>
          
          {user.caregiverIds && user.caregiverIds.length > 0 ? (
            <View style={styles.caregiversList}>
              <Text style={styles.caregiversCount}>
                Masz {user.caregiverIds.length} opiekun{user.caregiverIds.length === 1 ? 'a' : 'ów'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noCaregiversText}>
              Nie masz przypisanych opiekunów
            </Text>
          )}
          
          <MenuItem
            icon="person-add-outline"
            title="Dodaj opiekuna"
            subtitle="Zaproś członka rodziny do monitorowania"
            onPress={() => navigation.navigate('LinkCaregiver')}
          />
          
          <MenuItem
            icon="people-outline"
            title="Zarządzaj opiekunami"
            subtitle="Usuń lub przeglądaj opiekunów"
            onPress={() => navigation.navigate('ManageCaregivers')}
          />
        </Card>
      )}

      {/* Seniors Settings (for caregivers) */}
      {user?.role === 'caregiver' && (
        <Card style={styles.menuCard}>
          <Text style={styles.cardTitle}>Podopieczni</Text>
          
          {user.seniorIds && user.seniorIds.length > 0 ? (
            <Text style={styles.caregiversCount}>
              Opiekujesz się {user.seniorIds.length} osob{user.seniorIds.length === 1 ? 'ą' : 'ami'}
            </Text>
          ) : (
            <Text style={styles.noCaregiversText}>
              Nie masz przypisanych podopiecznych
            </Text>
          )}
          
          <MenuItem
            icon="qr-code-outline"
            title="Skanuj kod zaproszenia"
            subtitle="Połącz się z seniorem"
            onPress={() => navigation.navigate('LinkCaregiver')}
          />
        </Card>
      )}

      {/* Notifications */}
      <Card style={styles.menuCard}>
        <Text style={styles.cardTitle}>Powiadomienia</Text>
        
        <MenuItem
          icon="notifications-outline"
          title="Powiadomienia push"
          subtitle="Przypomnienia o dawkach leków"
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.neutral[200], true: Colors.primary[300] }}
              thumbColor={notificationsEnabled ? Colors.primary[500] : Colors.neutral[400]}
            />
          }
        />
        
        <MenuItem
          icon="volume-medium-outline"
          title="Dźwięk powiadomień"
          subtitle="Włączony"
          onPress={() => {}}
        />
        
        <MenuItem
          icon="time-outline"
          title="Cisza nocna"
          subtitle="22:00 - 07:00"
          onPress={() => {}}
        />
      </Card>

      {/* App Settings */}
      <Card style={styles.menuCard}>
        <Text style={styles.cardTitle}>Aplikacja</Text>
        
        <MenuItem
          icon="language-outline"
          title="Język"
          subtitle="Polski"
          onPress={() => {}}
        />
        
        <MenuItem
          icon="moon-outline"
          title="Tryb ciemny"
          subtitle="Wyłączony"
          onPress={() => {}}
        />
        
        <MenuItem
          icon="help-circle-outline"
          title="Pomoc i wsparcie"
          onPress={() => {}}
        />
        
        <MenuItem
          icon="document-text-outline"
          title="Regulamin i prywatność"
          onPress={() => {}}
        />
        
        <MenuItem
          icon="information-circle-outline"
          title="O aplikacji"
          subtitle="Wersja 1.0.0"
          onPress={() => {}}
        />
      </Card>

      {/* Data Management */}
      <Card style={styles.menuCard}>
        <Text style={styles.cardTitle}>Dane</Text>
        
        <MenuItem
          icon="download-outline"
          title="Eksportuj dane"
          subtitle="Pobierz historię leków w formacie PDF"
          onPress={() => {}}
        />
        
        <MenuItem
          icon="cloud-upload-outline"
          title="Kopia zapasowa"
          subtitle="Ostatnia: dzisiaj, 12:00"
          onPress={() => {}}
        />
      </Card>

      {/* Danger Zone */}
      <Card style={styles.menuCard}>
        <MenuItem
          icon="log-out-outline"
          title="Wyloguj się"
          onPress={handleLogout}
          danger
        />
        
        <MenuItem
          icon="trash-outline"
          title="Usuń konto"
          subtitle="Nieodwracalne usunięcie wszystkich danych"
          onPress={handleDeleteAccount}
          danger
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Apteczka Seniora v1.0.0</Text>
        <Text style={styles.footerText}>© 2024 Wszystkie prawa zastrzeżone</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background.primary,
  },
  userName: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary[50],
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    ...Typography.caption,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  editCard: {
    margin: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  menuCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.bodyBold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  menuSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  caregiversList: {
    paddingVertical: Spacing.sm,
  },
  caregiversCount: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  noCaregiversText: {
    ...Typography.body,
    color: Colors.text.secondary,
    paddingVertical: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  footerText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
});

export default ProfileScreen;
