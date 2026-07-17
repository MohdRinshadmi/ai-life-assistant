import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@stores/authStore';
import { GlassCard, ScreenContainer } from '@components/ui';
import { APP_VERSION } from '@constants';
import { spacing } from '@theme';

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

export function SettingsScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initial = (user?.displayName ?? '?').charAt(0).toUpperCase();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.textStyles.h3, { color: theme.colors.heading }]}>Settings</Text>
      </View>

      <View style={styles.body}>
        {/* Profile */}
        <GlassCard borderRadius={18}>
          <View style={styles.profileRow}>
            <LinearGradient
              colors={theme.colors.gradients.primary}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.avatar}
            >
              <Text style={styles.avatarInitial}>{initial}</Text>
            </LinearGradient>
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: theme.colors.heading }]}>
                {user?.displayName ?? 'Your account'}
              </Text>
              {user?.email ? (
                <Text style={[styles.profileEmail, { color: theme.colors.subtle }]}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>
        </GlassCard>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: theme.colors.subtle }]}>Appearance</Text>
        <GlassCard borderRadius={18}>
          <View style={styles.row}>
            <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.text }]}>
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: theme.colors.primary, false: theme.colors.muted }}
              thumbColor="#FFFFFF"
              accessibilityRole="switch"
              accessibilityLabel="Toggle dark mode"
            />
          </View>
        </GlassCard>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: theme.colors.subtle }]}>About</Text>
        <GlassCard borderRadius={18}>
          <View style={styles.row}>
            <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.text }]}>
              Version
            </Text>
            <Text style={[theme.textStyles.caption, { color: theme.colors.subtle }]}>
              {APP_VERSION}
            </Text>
          </View>
        </GlassCard>

        {/* Sign out */}
        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOutWrap}
        >
          <GlassCard borderRadius={18}>
            <View style={styles.rowCentered}>
              <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.error }]}>
                Sign Out
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  profileText: { flex: 1, gap: spacing['2xs'] },
  profileName: { fontSize: 17, fontWeight: '600' },
  profileEmail: { fontSize: 13 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCentered: { alignItems: 'center' },
  signOutWrap: { marginTop: spacing.sm },
});
