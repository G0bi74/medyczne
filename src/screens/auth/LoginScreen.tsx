import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { loginUser } from '../../services/api/authService';
import { useAuthStore } from '../../store';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const setUser = useAuthStore((state) => state.setUser);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const user = await loginUser({ email, password });
      setUser(user);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      let message = 'Wystąpił błąd podczas logowania';
      
      if (error.code === 'auth/user-not-found') {
        message = 'Nie znaleziono użytkownika o podanym adresie e-mail';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Nieprawidłowe hasło';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Zbyt wiele prób logowania. Spróbuj ponownie później';
      }
      
      Alert.alert('Błąd logowania', message);
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.logoContainer}>
            <Ionicons name="medical" size={48} color={Colors.primary[500]} />
          </View>
          <Text style={styles.title}>Apteczka Seniora</Text>
          <Text style={styles.subtitle}>
            System zarządzania lekami dla Ciebie i Twoich bliskich
          </Text>
        </View>

        <View style={styles.form}>
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
            label="Hasło"
            placeholder="Wprowadź hasło"
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

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Nie pamiętasz hasła?</Text>
          </TouchableOpacity>

          <Button
            title="Zaloguj się"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="large"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nie masz jeszcze konta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Zarejestruj się</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="scan-outline" size={24} color={Colors.primary[400]} />
            <Text style={styles.featureText}>Skanuj leki</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="notifications-outline" size={24} color={Colors.primary[400]} />
            <Text style={styles.featureText}>Przypomnienia</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary[400]} />
            <Text style={styles.featureText}>Bezpieczeństwo</Text>
          </View>
        </View>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    maxWidth: 280,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    ...Typography.caption,
    color: Colors.primary[500],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  footerText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  registerLink: {
    ...Typography.bodyBold,
    color: Colors.primary[500],
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  featureItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  featureText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
});

export default LoginScreen;
