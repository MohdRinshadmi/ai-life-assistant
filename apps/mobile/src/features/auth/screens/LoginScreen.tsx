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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../hooks/useTheme';
import { MicOrb } from '../../../components/ui/MicOrb';
import { PillButton } from '../../../components/ui/PillButton';
import { authService } from '../services/authService';
import { AuthStackParamList } from '../../../navigation/AuthNavigator';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

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
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Layered violet wash backdrop */}
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
            {/* Hero — glowing mic */}
            <View style={styles.hero}>
              <MicOrb size={92} active={false} />

              {/* "AI Voice Command" pill */}
              <View style={styles.tagPill}>
                <View style={[styles.tagDot, { backgroundColor: theme.colors.accent }]} />
                <Text style={styles.tagText}>AI Voice Command</Text>
              </View>

              <Text style={styles.heroTitle}>
                Effortless{'\n'}control with{'\n'}
                <Text style={{ color: theme.colors.heading }}>AI Life</Text>
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
                      i === 1 && { backgroundColor: theme.colors.heading, width: 18 },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Form (collapses behind buttons until "Sign In" is tapped) */}
            {showForm && (
              <View style={styles.form}>
                <DarkInput
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                />
                <DarkInput
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
      </SafeAreaView>
    </View>
  );
}

function DarkInput(props: React.ComponentProps<typeof TextInput>) {
  const { theme } = useTheme();
  return (
    <View style={[styles.inputWrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.subtle}
        style={[styles.input, { color: theme.colors.heading }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  hero: { alignItems: 'center', paddingTop: 24, gap: 18 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { color: '#E8E4F0', fontSize: 12, fontWeight: '500' },
  heroTitle: {
    color: '#E8E4F0',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  heroSubtitle: {
    color: '#9A8AB8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A2A52' },
  form: { gap: 12, marginTop: 24 },
  inputWrap: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 52, justifyContent: 'center' },
  input: { fontSize: 15, paddingVertical: 0 },
  actions: { gap: 12, marginTop: 28 },
});
