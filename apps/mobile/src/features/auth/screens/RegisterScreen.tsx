import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { MicOrb, PillButton, ScreenContainer, TextField } from '@components/ui';
import { authService } from '../services/authService';
import { env } from '@config';
import { logger } from '@utils/logger';
import { spacing } from '@theme';
import { VALIDATION } from '@ai-life/shared';
import { AuthStackParamList } from '@navigation/AuthNavigator';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const SAFE_EDGES: React.ComponentProps<typeof ScreenContainer>['edges'] = ['top', 'bottom'];

export function RegisterScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<RegisterNavProp>();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!displayName.trim() || displayName.trim().length < VALIDATION.DISPLAY_NAME_MIN_LENGTH) {
      next.displayName = `Name must be at least ${VALIDATION.DISPLAY_NAME_MIN_LENGTH} characters`;
    }
    if (!email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Invalid email format';

    if (!password || password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      next.password = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
    }
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.register({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
      });
    } catch (error) {
      // Diagnostic: distinguish "couldn't reach the server" from "server said no".
      let message: string;
      if (isAxiosError(error) && error.response) {
        // Server responded with an error status (4xx/5xx) — show its message.
        message =
          error.response.data?.error?.message ||
          `Server error (${error.response.status})`;
      } else if (isAxiosError(error) && error.request) {
        // Request was sent but no response — network/connectivity problem.
        message =
          `Can't reach the server at ${env.apiBaseUrl}.\n\n` +
          `(${error.code || error.message}) — check the server is running and ` +
          `your phone is on the same Wi-Fi.`;
      } else {
        // Error thrown before the request was even made.
        message =
          (error instanceof Error && error.message) ||
          'Registration failed. Please try again.';
      }
      logger.error('Register error', {
        baseURL: env.apiBaseUrl,
        code: isAxiosError(error) ? error.code : undefined,
        status: isAxiosError(error) ? error.response?.status : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={SAFE_EDGES}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <MicOrb size={64} active={false} />
            <Text style={styles.title}>
              Create your{' '}
              <Text style={styles.titleInk}>account</Text>
            </Text>
            <Text style={styles.subtitle}>
              A few seconds to set up your AI assistant
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              placeholder="Display name"
              value={displayName}
              onChangeText={(t) => { setDisplayName(t); if (errors.displayName) setErrors({ ...errors, displayName: undefined }); }}
              error={errors.displayName}
              textContentType="name"
            />
            <TextField
              placeholder="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <TextField
              placeholder="Password (min 8 chars)"
              value={password}
              onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              error={errors.password}
              secureTextEntry
              textContentType="newPassword"
            />
            <TextField
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
              error={errors.confirmPassword}
              secureTextEntry
              textContentType="newPassword"
            />
          </View>

          <View style={styles.actions}>
            <PillButton title="Create Account" variant="gradient" loading={loading} onPress={handleRegister} />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.colors.subtle }]}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={[styles.footerText, styles.footerLink, { color: theme.colors.heading }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', paddingTop: spacing.xl, gap: 14, marginBottom: 28 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  titleInk: { color: '#FF5BAE' },
  subtitle: { color: '#9A8AB8', fontSize: 14, textAlign: 'center' },
  form: { gap: spacing.md },
  actions: { gap: 18, marginTop: 28 },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14 },
  footerLink: { fontWeight: '600' },
});
