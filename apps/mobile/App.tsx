import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/hooks/useTheme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { authService } from './src/features/auth/services/authService';

/**
 * App Root
 *
 * Provider ordering:
 * 1. SafeAreaProvider — must wrap everything for safe area insets
 * 2. ThemeProvider — provides theme context to all components
 * 3. RootNavigator — handles auth-gated navigation
 *
 * On mount, we initialize the auth service which checks Keychain
 * for stored tokens and restores the session if valid.
 */
function AppContent() {
  useEffect(() => {
    authService.initialize();
  }, []);

  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
