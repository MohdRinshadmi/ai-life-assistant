import React from 'react';
import { StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@hooks/useTheme';

interface Props {
  onPress: () => void;
  /** Ionicons icon name (e.g. "add"). */
  icon: string;
  accessibilityLabel: string;
  /** Override the default bottom-right absolute position. */
  style?: StyleProp<ViewStyle>;
}

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/**
 * Fab — circular gradient floating action button with a violet glow,
 * pinned to the bottom-right corner by default.
 */
export function Fab({ onPress, icon, accessibilityLabel, style }: Props) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.shadow, style]}
    >
      <LinearGradient
        colors={theme.colors.gradients.primary}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.circle}
      >
        <Icon name={icon} size={28} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
