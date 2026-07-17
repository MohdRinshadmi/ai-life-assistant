import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { MicOrb, PillButton, ScreenContainer, TextField } from '@components/ui';
import { spacing } from '@theme';
import { authService } from '../services/authService';
import { AuthStackParamList } from '@navigation/AuthNavigator';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const SAFE_EDGES: React.ComponentProps<typeof ScreenContainer>['edges'] = ['top', 'bottom'];

export function LoginScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<LoginNavProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await authService.login({
        email: email.trim().toLowerCase(),
        password,
        deviceInfo: `${Platform.OS} ${Platform.Version}`,
      });
    } catch (error) {
      const message =
        (isAxiosError(error) && error.response?.data?.error?.message) ||
        'Login failed. Please try again.';
      Alert.alert('Login failed', message);
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
          {/* Hero — glowing mic */}
          <View style={styles.hero}>
            <MicOrb size={92} active={false} />

            {/* "AI Voice Command" pill */}
            <View style={styles.tagPill}>
              <View style={[styles.tagDot, { backgroundColor: theme.colors.accent }]} />
              <Text style={styles.tagText}>AI Voice Command</Text>
            </View>

            <Text style={[styles.heroTitle, { color: theme.colors.heading }]}>
              Effortless control{'\n'}
              <Text style={{ color: theme.colors.accentLight }}>with AI Life</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              We believe in the power of voice{'\n'}to transform the way you work
            </Text>

            {/* Carousel dots */}
            <View style={styles.dots}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === 1 && styles.dotActive,
                    i === 1 && { backgroundColor: theme.colors.heading },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Form (collapses behind buttons until "Sign In" is tapped) */}
          {showForm && (
            <View style={styles.form}>
              <TextField
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
              />
              <TextField
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <PillButton
              title="Sign Up"
              variant="gradient"
              onPress={() => navigation.navigate('Register')}
            />
            <PillButton
              title={showForm ? 'Sign In' : 'Sign In with Email'}
              variant="outline"
              loading={loading}
              onPress={() => (showForm ? handleLogin() : setShowForm(true))}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  hero: { alignItems: 'center', paddingTop: spacing.xl, gap: 18 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { color: '#E8E4F0', fontSize: 12, fontWeight: '500' },
  heroTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  heroSubtitle: {
    color: '#9A8AB8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A2A52' },
  dotActive: { width: 18 },
  form: { gap: spacing.md, marginTop: spacing.xl },
  actions: { gap: spacing.md, marginTop: 28 },
});
