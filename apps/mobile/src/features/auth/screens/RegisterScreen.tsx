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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../hooks/useTheme';
import { PillButton } from '../../../components/ui/PillButton';
import { MicOrb } from '../../../components/ui/MicOrb';
import { authService } from '../services/authService';
import { VALIDATION } from '@ai-life/shared';
import { AuthStackParamList } from '../../../navigation/AuthNavigator';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

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
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <LinearGradient
        colors={theme.colors.gradients.backdrop as unknown as string[]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
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
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                A few seconds to set up your AI assistant
              </Text>
            </View>

            <View style={styles.form}>
              <DarkField
                placeholder="Display name"
                value={displayName}
                onChangeText={(t) => { setDisplayName(t); if (errors.displayName) setErrors({ ...errors, displayName: undefined }); }}
                error={errors.displayName}
                textContentType="name"
              />
              <DarkField
                placeholder="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
              />
              <DarkField
                placeholder="Password (min 8 chars)"
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                error={errors.password}
                secureTextEntry
                textContentType="newPassword"
              />
              <DarkField
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={[styles.footerText, { color: theme.colors.heading, fontWeight: '600' }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function DarkField(props: React.ComponentProps<typeof TextInput> & { error?: string }) {
  const { theme } = useTheme();
  const { error, ...inputProps } = props;
  return (
    <View>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
        ]}
      >
        <TextInput
          {...inputProps}
          placeholderTextColor={theme.colors.subtle}
          style={[styles.input, { color: theme.colors.heading }]}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingTop: 24, gap: 14, marginBottom: 28 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#9A8AB8', fontSize: 14, textAlign: 'center' },
  form: { gap: 12 },
  inputWrap: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 52, justifyContent: 'center' },
  input: { fontSize: 15, paddingVertical: 0 },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 4 },
  actions: { gap: 18, marginTop: 28 },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14 },
});
