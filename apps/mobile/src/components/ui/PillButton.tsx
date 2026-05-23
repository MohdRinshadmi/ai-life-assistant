import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

type Variant = 'gradient' | 'outline';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  rightIcon?: React.ReactNode;
}

/**
 * PillButton — large rounded button used across the AI Life Assistant UI.
 *
 *   variant="gradient"  → Filled with violet→magenta gradient + glow halo
 *   variant="outline"   → Dark glossy fill with thin gradient border
 *
 * Both are pill-shaped (full radius) and ~56pt tall, matching the Syncra spec.
 */
export function PillButton({
  title,
  onPress,
  variant = 'gradient',
  loading = false,
  disabled = false,
  style,
  textStyle,
  rightIcon,
}: Props) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.shadow,
          { opacity: isDisabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          style,
        ]}
      >
        <LinearGradient
          colors={theme.colors.gradients.primary as unknown as string[]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={styles.pill}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.row}>
              <Text style={[styles.text, { color: '#FFFFFF' }, textStyle]}>{title}</Text>
              {rightIcon}
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  // outline — dark fill with hairline gradient border (gradient drawn as a 1px wrap)
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        { opacity: isDisabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <LinearGradient
        colors={theme.colors.gradients.primarySoft as unknown as string[]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={styles.outlineWrap}
      >
        <View style={[styles.outlineInner, { backgroundColor: theme.colors.surface }]}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <View style={styles.row}>
              <Text style={[styles.text, { color: theme.colors.heading }, textStyle]}>{title}</Text>
              {rightIcon}
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  pill: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outlineWrap: {
    height: 56,
    borderRadius: 28,
    padding: 1.2,
  },
  outlineInner: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});
