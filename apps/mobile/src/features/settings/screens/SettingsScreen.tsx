import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@stores/authStore';

export function SettingsScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[theme.textStyles.h3, { color: theme.colors.heading }]}>
          Settings
        </Text>
      </View>

      <View style={styles.section}>
        {/* Theme Toggle */}
        <TouchableOpacity
          style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.text }]}>
            {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </Text>
          <Text style={[theme.textStyles.caption, { color: theme.colors.subtle }]}>
            Tap to toggle
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 12 }]}
          onPress={logout}
          activeOpacity={0.7}
        >
          <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.error }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  section: { paddingHorizontal: 24, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
