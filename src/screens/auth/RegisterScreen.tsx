import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { registerUser } from '../../services/api/authService';
import { useAuthStore } from '../../store';

interface RegisterScreenProps {
  navigation: any;
}

type UserRole = 'senior' | 'caregiver';

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('senior');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const setUser = useAuthStore((state) => state.setUser);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Imię i nazwisko jest wymagane';
    }
    
    if (!email) {
      newErrors.email = 'Adres e-mail jest wymagany';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Nieprawidłowy adres e-mail';
    }
    
    if (!password) {
      newErrors.password = 'Hasło jest wymagane';
    } else if (password.length < 6) {
      newErrors.password = 'Hasło musi mieć minimum 6 znaków';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Hasła nie są identyczne';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    console.log('[RegisterScreen] handleRegister called');
    console.log('[RegisterScreen] Form data:', { name, email, phone, role, passwordLength: password.length });
    
    if (!validate()) {
      console.log('[RegisterScreen] Validation failed, errors:', errors);
      return;
    }
    
    console.log('[RegisterScreen] Validation passed, starting registration...');
    setLoading(true);
    try {
      const user = await registerUser({
        email,
        password,
        name,
        phone,
        role,
      });
      console.log('[RegisterScreen] Registration successful, user:', user);
      setUser(user);
      Alert.alert(
        'Sukces!',
        'Konto zostało utworzone pomyślnie.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[RegisterScreen] Registration error:', error);
      console.error('[RegisterScreen] Error code:', error.code);
      console.error('[RegisterScreen] Error message:', error.message);
      console.error('[RegisterScreen] Full error object:', JSON.stringify(error, null, 2));
      
      let message = 'Wystąpił błąd podczas rejestracji';
      
      if (error.code === 'auth/email-already-in-use') {
        message = 'Ten adres e-mail jest już używany';
      } else if (error.code === 'auth/weak-password') {
        message = 'Hasło jest zbyt słabe';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Nieprawidłowy adres e-mail';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Błąd połączenia sieciowego. Sprawdź połączenie z internetem.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Rejestracja przez e-mail jest wyłączona w Firebase.';
      } else if (error.code === 'auth/api-key-not-valid') {
        message = 'Nieprawidłowy klucz API Firebase.';
      } else if (error.message) {
        message = `Błąd: ${error.message}`;
      }
      
      Alert.alert('Błąd rejestracji', message);
    } finally {
      setLoading(false);
    }
  };

  const RoleButton: React.FC<{
    roleType: UserRole;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = ({ roleType, title, description, icon }) => (
    <TouchableOpacity
      style={[
        styles.roleButton,
        role === roleType && styles.roleButtonActive,
      ]}
      onPress={() => setRole(roleType)}
    >
      <View
        style={[
          styles.roleIconContainer,
          role === roleType && styles.roleIconContainerActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={28}
          color={role === roleType ? Colors.text.inverse : Colors.primary[500]}
        />
      </View>
      <Text
        style={[
          styles.roleTitle,
          role === roleType && styles.roleTitleActive,
        ]}
      >
        {title}
      </Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Utwórz konto</Text>
          <Text style={styles.subtitle}>
            Dołącz do Apteczki Seniora i zacznij bezpiecznie zarządzać lekami
          </Text>
        </View>

        <View style={styles.roleSelection}>
          <Text style={styles.roleLabel}>Kim jesteś?</Text>
          <View style={styles.roleButtons}>
            <RoleButton
              roleType="senior"
              title="Senior"
              description="Zarządzam swoimi lekami"
              icon="person-outline"
            />
            <RoleButton
              roleType="caregiver"
              title="Opiekun"
              description="Pomagam bliskim"
              icon="people-outline"
            />
          </View>
        </View>

        <View style={styles.form}>
          <Input
            label="Imię i nazwisko"
            placeholder="Jan Kowalski"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={errors.name}
            leftIcon={
              <Ionicons name="person-outline" size={20} color={Colors.text.tertiary} />
            }
          />

          <Input
            label="Adres e-mail"
            placeholder="jan.kowalski@email.pl"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            leftIcon={
              <Ionicons name="mail-outline" size={20} color={Colors.text.tertiary} />
            }
          />

          <Input
            label="Numer telefonu (opcjonalne)"
            placeholder="+48 123 456 789"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={
              <Ionicons name="call-outline" size={20} color={Colors.text.tertiary} />
            }
          />

          <Input
            label="Hasło"
            placeholder="Minimum 6 znaków"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            error={errors.password}
            leftIcon={
              <Ionicons name="lock-closed-outline" size={20} color={Colors.text.tertiary} />
            }
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.text.tertiary}
                />
              </TouchableOpacity>
            }
          />

          <Input
            label="Potwierdź hasło"
            placeholder="Wprowadź hasło ponownie"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            error={errors.confirmPassword}
            leftIcon={
              <Ionicons name="lock-closed-outline" size={20} color={Colors.text.tertiary} />
            }
          />

          <Button
            title="Zarejestruj się"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="large"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Masz już konto?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Zaloguj się</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          Rejestrując się, akceptujesz nasz Regulamin oraz Politykę Prywatności
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  roleSelection: {
    marginBottom: Spacing.xl,
  },
  roleLabel: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  roleButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  roleIconContainerActive: {
    backgroundColor: Colors.primary[500],
  },
  roleTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  roleTitleActive: {
    color: Colors.primary[600],
  },
  roleDescription: {
    ...Typography.small,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  footerText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  loginLink: {
    ...Typography.bodyBold,
    color: Colors.primary[500],
  },
  terms: {
    ...Typography.small,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default RegisterScreen;
