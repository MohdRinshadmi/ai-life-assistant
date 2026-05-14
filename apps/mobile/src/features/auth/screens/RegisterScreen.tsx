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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../hooks/useTheme';
import { Input, Button } from '../../../components/ui/FormElements';
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
    const newErrors: Record<string, string> = {};

    if (!displayName.trim() || displayName.trim().length < VALIDATION.DISPLAY_NAME_MIN_LENGTH) {
      newErrors.displayName = `Name must be at least ${VALIDATION.DISPLAY_NAME_MIN_LENGTH} characters`;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password || password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      newErrors.password = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[theme.textStyles.h1, { color: theme.colors.heading }]}>
              Create Account
            </Text>
            <Text style={[theme.textStyles.body, { color: theme.colors.subtle, marginTop: 8 }]}>
              Get started with your AI assistant
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Display Name"
              placeholder="Your name"
              value={displayName}
              onChangeText={(text) => { setDisplayName(text); clearError('displayName'); }}
              error={errors.displayName}
              textContentType="name"
              returnKeyType="next"
            />

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => { setEmail(text); clearError('email'); }}
              error={errors.email}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <Input
              label="Password"
              placeholder="Min 8 characters"
              value={password}
              onChangeText={(text) => { setPassword(text); clearError('password'); }}
              error={errors.password}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="next"
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); }}
              error={errors.confirmPassword}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[theme.textStyles.body, { color: theme.colors.subtle }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  form: {},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    paddingBottom: 24,
  },
});
