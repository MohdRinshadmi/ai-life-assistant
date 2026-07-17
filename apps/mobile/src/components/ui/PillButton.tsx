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
import { useTheme } from '@hooks/useTheme';

type Variant = 'gradient' | 'outline';
type Size = 'sm' | 'lg';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  /** 'lg' (default) → ~56pt hero pill; 'sm' → ~36pt compact pill (headers). */
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const GRADIENT_START = { x: 0, y: 0.5 };
const GRADIENT_END = { x: 1, y: 0.5 };

/**
 * PillButton — rounded button used across the AI Life Assistant UI.
 *
 *   variant="gradient"  → Filled with violet→magenta gradient + glow halo
 *   variant="outline"   → Dark glossy fill with thin gradient border
 *
 * Both are pill-shaped (full radius); 'lg' is ~56pt tall per the Syncra spec.
 */
export function PillButton({
  title,
  onPress,
  variant = 'gradient',
  size = 'lg',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: Props) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  const small = size === 'sm';

  const renderContent = (color: string) =>
    loading ? (
      <ActivityIndicator size="small" color={color} />
    ) : (
      <View style={styles.row}>
        {leftIcon}
        <Text style={[styles.text, small && styles.textSm, { color }, textStyle]}>
          {title}
        </Text>
        {rightIcon}
      </View>
    );

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.shadow,
          { opacity: isDisabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          style,
        ]}
      >
        <LinearGradient
          colors={theme.colors.gradients.primary}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={[styles.pill, small && styles.pillSm]}
        >
          {renderContent('#FFFFFF')}
        </LinearGradient>
      </Pressable>
    );
  }

  // outline — dark fill with hairline gradient border (gradient drawn as a 1px wrap)
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        { opacity: isDisabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <LinearGradient
        colors={theme.colors.gradients.primarySoft}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[styles.outlineWrap, small && styles.outlineWrapSm]}
      >
        <View
          style={[
            styles.outlineInner,
            small && styles.outlineInnerSm,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            renderContent(theme.colors.heading)
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
  pillSm: { height: 36, borderRadius: 18, paddingHorizontal: 16 },
  outlineWrap: {
    height: 56,
    borderRadius: 28,
    padding: 1.2,
  },
  outlineWrapSm: { height: 36, borderRadius: 18 },
  outlineInner: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outlineInnerSm: { borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  textSm: { fontSize: 14 },
});
