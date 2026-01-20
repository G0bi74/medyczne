import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '../../components';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store';
import { linkSeniorToCaregiver } from '../../services/api/authService';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface LinkCaregiverScreenProps {
  navigation: any;
}

export const LinkCaregiverScreen: React.FC<LinkCaregiverScreenProps> = ({
  navigation,
}) => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [invitationCode, setInvitationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'generate' | 'enter'>('generate');

  useEffect(() => {
    if (user?.role === 'senior') {
      generateInvitationCode();
    }
  }, [user]);

  const generateInvitationCode = async () => {
    if (!user) return;

    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Store in Firestore with expiration (24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await setDoc(doc(db, 'invitations', code), {
        seniorId: user.id,
        seniorName: user.name,
        createdAt: new Date(),
        expiresAt,
        used: false,
      });

      setGeneratedCode(code);
    } catch (error) {
      console.error('Error generating invitation code:', error);
      Alert.alert('Błąd', 'Nie udało się wygenerować kodu zaproszenia');
    }
  };

  const copyCode = async () => {
    if (generatedCode) {
      await Clipboard.setString(generatedCode);
      Alert.alert('Skopiowano', 'Kod został skopiowany do schowka');
    }
  };

  const shareCode = async () => {
    if (!generatedCode || !user) return;

    try {
      await Share.share({
        message: `Cześć! Zapraszam Cię do bycia moim opiekunem w aplikacji Apteczka Seniora. Użyj tego kodu: ${generatedCode}\n\nKod jest ważny przez 24 godziny.`,
        title: 'Zaproszenie do Apteczki Seniora',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEnterCode = async () => {
    if (!user || !invitationCode.trim()) {
      Alert.alert('Błąd', 'Wprowadź kod zaproszenia');
      return;
    }

    setLoading(true);
    try {
      const code = invitationCode.trim().toUpperCase();
      console.log('[LinkCaregiver] Checking invitation code:', code);
      
      // Check if code exists
      const invitationDoc = await getDoc(doc(db, 'invitations', code));
      
      if (!invitationDoc.exists()) {
        Alert.alert('Błąd', 'Nieprawidłowy kod zaproszenia');
        return;
      }

      const invitation = invitationDoc.data();
      console.log('[LinkCaregiver] Invitation found:', { seniorId: invitation.seniorId, seniorName: invitation.seniorName });

      // Check if code is expired
      if (invitation.expiresAt.toDate() < new Date()) {
        Alert.alert('Błąd', 'Kod zaproszenia wygasł');
        return;
      }

      // Check if code was already used
      if (invitation.used) {
        Alert.alert('Błąd', 'Ten kod został już wykorzystany');
        return;
      }

      // Link senior to caregiver
      console.log('[LinkCaregiver] Linking accounts...');
      await linkSeniorToCaregiver(invitation.seniorId, user.id);

      // Mark code as used
      await setDoc(doc(db, 'invitations', code), {
        ...invitation,
        used: true,
        usedBy: user.id,
        usedAt: new Date(),
      });
      
      // Update local user state with new seniorId
      const newSeniorIds = [...(user.seniorIds || []), invitation.seniorId];
      setUser({ ...user, seniorIds: newSeniorIds });
      console.log('[LinkCaregiver] Local state updated with new seniorIds:', newSeniorIds);

      Alert.alert(
        'Sukces!',
        `Zostałeś połączony z ${invitation.seniorName}. Możesz teraz monitorować przyjmowanie leków.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error linking:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let message = 'Nie udało się połączyć kont';
      if (error.code === 'permission-denied') {
        message = 'Brak uprawnień. Sprawdź reguły Firebase.';
      }
      Alert.alert('Błąd', message);
    } finally {
      setLoading(false);
    }
  };

  // Senior view - generate code
  if (user?.role === 'senior') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={48} color={Colors.primary[500]} />
          </View>
          <Text style={styles.title}>Dodaj opiekuna</Text>
          <Text style={styles.subtitle}>
            Udostępnij poniższy kod członkowi rodziny lub opiekunowi, aby mógł 
            monitorować Twoje przyjmowanie leków.
          </Text>
        </View>

        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>Twój kod zaproszenia:</Text>
          
          {generatedCode ? (
            <>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{generatedCode}</Text>
              </View>
              
              <Text style={styles.codeExpiry}>
                Kod wygasa za 24 godziny
              </Text>

              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.codeAction} onPress={copyCode}>
                  <Ionicons name="copy-outline" size={24} color={Colors.primary[500]} />
                  <Text style={styles.codeActionText}>Kopiuj</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.codeAction} onPress={shareCode}>
                  <Ionicons name="share-outline" size={24} color={Colors.primary[500]} />
                  <Text style={styles.codeActionText}>Udostępnij</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.codeAction} onPress={generateInvitationCode}>
                  <Ionicons name="refresh-outline" size={24} color={Colors.primary[500]} />
                  <Text style={styles.codeActionText}>Nowy kod</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Button
              title="Generuj kod"
              onPress={generateInvitationCode}
              loading={loading}
            />
          )}
        </Card>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Jak to działa?</Text>
          
          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Udostępnij kod zaproszenia opiekunowi
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Opiekun wprowadza kod w swojej aplikacji
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Opiekun może teraz widzieć Twoje leki i dawki
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Caregiver view - enter code
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="qr-code" size={48} color={Colors.primary[500]} />
        </View>
        <Text style={styles.title}>Połącz z seniorem</Text>
        <Text style={styles.subtitle}>
          Wprowadź kod zaproszenia otrzymany od seniora, aby rozpocząć 
          monitorowanie jego przyjmowania leków.
        </Text>
      </View>

      <Card style={styles.inputCard}>
        <Input
          label="Kod zaproszenia"
          placeholder="np. ABC123"
          value={invitationCode}
          onChangeText={(text) => setInvitationCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />

        <Button
          title="Połącz"
          onPress={handleEnterCode}
          loading={loading}
          fullWidth
          size="large"
        />
      </Card>

      <View style={styles.helpSection}>
        <Ionicons name="help-circle-outline" size={24} color={Colors.text.secondary} />
        <Text style={styles.helpText}>
          Kod zaproszenia znajdziesz w aplikacji seniora, w sekcji 
          "Profil" → "Dodaj opiekuna". Kod jest ważny przez 24 godziny.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  codeCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  codeLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  codeContainer: {
    backgroundColor: Colors.primary[50],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    marginBottom: Spacing.sm,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary[600],
    letterSpacing: 8,
  },
  codeExpiry: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.lg,
  },
  codeActions: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  codeAction: {
    alignItems: 'center',
    gap: 4,
  },
  codeActionText: {
    ...Typography.small,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  instructions: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  instructionsTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...Typography.bodyBold,
    color: Colors.text.inverse,
  },
  stepText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  inputCard: {
    marginBottom: Spacing.lg,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.info + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  helpText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
});

export default LinkCaregiverScreen;
